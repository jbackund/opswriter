import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ExportRequestType = 'clean' | 'watermarked' | 'diff'
type ExportJobVariant = 'draft_watermarked' | 'draft_diff' | 'clean_approved'

const mapExportTypeToVariant = (
  manualStatus: string,
  exportType: ExportRequestType,
  includeWatermark: boolean
): ExportJobVariant => {
  switch (exportType) {
    case 'diff':
      return 'draft_diff'
    case 'watermarked':
      return 'draft_watermarked'
    case 'clean':
    default:
      if (manualStatus === 'approved') {
        return 'clean_approved'
      }
      return includeWatermark ? 'draft_watermarked' : 'draft_diff'
  }
}

// POST /api/manuals/[id]/export-async - Start async PDF export job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const manualId = id
    const body = await request.json()
    const { exportType = 'clean', includeWatermark = false } = body as {
      exportType?: ExportRequestType
      includeWatermark?: boolean
    }

    // Check if manual exists
    const { data: manual, error: manualError } = await supabase
      .from('manuals')
      .select('id, title, manual_code, current_revision, status')
      .eq('id', manualId)
      .single()

    if (manualError || !manual) {
      return NextResponse.json(
        { error: 'Manual not found' },
        { status: 404 }
      )
    }

    const variant = mapExportTypeToVariant(manual.status, exportType, includeWatermark)

    // Create export job record
    const { data: job, error: jobError } = await supabase
      .from('export_jobs')
      .insert({
        manual_id: manualId,
        variant,
        status: 'pending',
        created_by: user.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Failed to create export job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create export job' },
        { status: 500 }
      )
    }

    // Invoke Supabase Edge Function for PDF generation
    const { error: invokeError } = await supabase.functions.invoke('generate-pdf', {
      body: {
        jobId: job.id,
        manualId,
        exportType,
        includeWatermark,
        userId: user.id,
      },
    })

    if (invokeError) {
      console.error('Failed to invoke PDF generation function:', invokeError)
      // Update job status to failed
      await supabase
        .from('export_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to start PDF generation',
          processing_completed_at: new Date().toISOString(),  // Changed from completed_at
        })
        .eq('id', job.id)

      return NextResponse.json(
        { error: 'Failed to start PDF generation' },
        { status: 500 }
      )
    }

    // Return job information for polling
    return NextResponse.json({
      jobId: job.id,
      status: 'pending',
      message: 'PDF generation started. Check job status for completion.',
      variant,
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/manuals/[id]/export-async - Check export job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get job ID from query params
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Get job status
    const { data: job, error: jobError } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to view this job
    if (job.created_by !== user.id) {  // Changed from generated_by to created_by
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userProfile?.role !== 'sysadmin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // If job is completed and has a stored file path, return a signed download URL
    if (job.status === 'completed' && job.file_path) {
      let downloadUrl = job.file_url || null

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('manual-exports')
        .createSignedUrl(job.file_path, 604800)

      if (!signedUrlError && signedUrlData?.signedUrl) {
        downloadUrl = signedUrlData.signedUrl

        if (downloadUrl !== job.file_url) {
          await supabase
            .from('export_jobs')
            .update({ file_url: downloadUrl })
            .eq('id', jobId)
        }
      } else if (signedUrlError) {
        console.error('Failed to create signed URL for export job', signedUrlError)
      }

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        variant: job.variant,
        downloadUrl,
        fileName: job.file_path?.split('/').pop() || 'export.pdf',
        completedAt: job.processing_completed_at,
        fileSizeBytes: job.file_size_bytes,
        expiresAt: job.expires_at,
      })
    }

    // Return current job status
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      variant: job.variant,
      errorMessage: job.error_message,
      startedAt: job.processing_started_at,
      completedAt: job.processing_completed_at,
    })
  } catch (error) {
    console.error('Job status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
