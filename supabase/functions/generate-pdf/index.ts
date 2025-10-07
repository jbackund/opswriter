import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PDFJobPayload {
  jobId: string
  manualId: string
  exportType: 'clean' | 'watermarked' | 'diff'
  includeWatermark: boolean
  userId: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Supabase environment variables are not configured' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let payload: PDFJobPayload
  try {
    payload = await req.json()
  } catch (error) {
    console.error('Invalid request payload:', error)
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  const { jobId, manualId, exportType, includeWatermark, userId } = payload

  try {
    // Update job status to processing
    await supabase
      .from('export_jobs')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    // Get manual with all related data
    const { data: manual, error: manualError } = await supabase
      .from('manuals')
      .select(`
        *,
        chapters(
          *,
          content_blocks(*),
          chapter_remarks(*)
        )
      `)
      .eq('id', manualId)
      .single()

    if (manualError || !manual) {
      throw new Error('Manual not found')
    }

    // Get revisions for Record of Revision section
    const { data: revisions } = await supabase
      .from('revisions')
      .select('*')
      .eq('manual_id', manualId)
      .eq('status', 'approved')
      .order('approved_at', { ascending: true })

    // Get previous revision for diff if needed
    let previousRevision = null
    if (exportType === 'diff') {
      const { data: lastApproved } = await supabase
        .from('revisions')
        .select('*')
        .eq('manual_id', manualId)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      previousRevision = lastApproved
    }

    // Get definitions and abbreviations
    const { data: manualDefinitions } = await supabase
      .from('manual_definitions')
      .select('definition:definitions(*)')
      .eq('manual_id', manualId)

    const { data: manualAbbreviations } = await supabase
      .from('manual_abbreviations')
      .select('abbreviation:abbreviations(*)')
      .eq('manual_id', manualId)

    const definitions = manualDefinitions?.map(md => md.definition) || []
    const abbreviations = manualAbbreviations?.map(ma => ma.abbreviation) || []

    // Generate HTML content (reuse the existing generatePDFHTML function logic)
    const htmlContent = generatePDFHTML(
      manual,
      revisions || [],
      definitions,
      abbreviations,
      exportType,
      includeWatermark,
      previousRevision
    )

    // Launch browser and generate PDF
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    try {
      const page = await browser.newPage()
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      })

      // Upload to Supabase Storage
      const fileName = `${manual.manual_code}_${manual.current_revision}_${exportType}_${Date.now()}.pdf`
      const filePath = `exports/${manualId}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('manual-exports')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        })

      if (uploadError) {
        throw uploadError
      }

      // Get signed URL for download (valid for 7 days)
      const { data: signedUrlData } = await supabase.storage
        .from('manual-exports')
        .createSignedUrl(uploadData.path, 604800)

      // Update job with completion status
      await supabase
        .from('export_jobs')
        .update({
          status: 'completed',
          file_path: uploadData.path,
          file_url: signedUrlData?.signedUrl || null,
          processing_completed_at: new Date().toISOString(),
          file_size_bytes: pdfBuffer.byteLength,
        })
        .eq('id', jobId)

      // Create audit log
      await supabase.from('audit_logs').insert({
        entity_type: 'manual',
        entity_id: manualId,
        action: 'exported',
        actor_id: userId,
        metadata: {
          export_type: exportType,
          include_watermark: includeWatermark,
          file_size: pdfBuffer.byteLength,
          job_id: jobId,
        },
      })

      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          downloadUrl: signedUrlData?.signedUrl,
          fileName,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error('PDF generation error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await supabase
      .from('export_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        processing_completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// Helper function to generate PDF HTML (simplified version)
function generatePDFHTML(
  manual: any,
  revisions: any[],
  definitions: any[],
  abbreviations: any[],
  exportType: string,
  includeWatermark: boolean,
  previousRevision: any = null
): string {
  // This is a simplified version - in production, import the full function
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      color: rgba(255, 0, 0, 0.1);
      z-index: -1;
    }
    .cover-page { page-break-after: always; text-align: center; padding-top: 100px; }
    h1 { font-size: 28pt; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  ${includeWatermark ? '<div class="watermark">DRAFT</div>' : ''}

  <div class="cover-page">
    <h1>${manual.title}</h1>
    <p>Document Code: ${manual.manual_code}</p>
    <p>Revision: ${manual.current_revision}</p>
    <p>Status: ${manual.status}</p>
  </div>

  <div class="content">
    ${manual.chapters?.map((ch: any) => `
      <div class="${ch.page_break ? 'page-break' : ''}">
        <h2>${ch.chapter_number}. ${ch.heading}</h2>
        ${ch.content_blocks?.map((block: any) => `
          <div>${block.content?.html || ''}</div>
        `).join('') || ''}
      </div>
    `).join('') || ''}
  </div>
</body>
</html>
  `
}
