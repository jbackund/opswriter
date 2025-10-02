import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/manuals/[id]/restore-from-revision - Restore manual from historical revision
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
    const { revision_id } = body

    if (!revision_id) {
      return NextResponse.json(
        { error: 'revision_id is required' },
        { status: 400 }
      )
    }

    // Get the target revision to restore from
    const { data: targetRevision, error: revisionError } = await supabase
      .from('revisions')
      .select('*')
      .eq('id', revision_id)
      .eq('manual_id', manualId)
      .single()

    if (revisionError || !targetRevision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to edit this manual
    const { data: manual, error: manualError } = await supabase
      .from('manuals')
      .select('created_by, status')
      .eq('id', manualId)
      .single()

    if (manualError || !manual) {
      return NextResponse.json(
        { error: 'Manual not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (manual.created_by !== user.id && userProfile?.role !== 'sysadmin') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Can only restore if manual is in draft or rejected status
    if (manual.status !== 'draft' && manual.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Manual must be in draft or rejected status to restore from revision' },
        { status: 400 }
      )
    }

    // Extract snapshot data
    const snapshot = targetRevision.snapshot as any
    const manualData = snapshot.manual

    // Begin restoration process
    // 1. Delete current chapters, content_blocks, and remarks (cascade will handle related data)
    await supabase
      .from('chapters')
      .delete()
      .eq('manual_id', manualId)

    // 2. Restore manual metadata (excluding id, created_at, created_by)
    const { error: updateManualError } = await supabase
      .from('manuals')
      .update({
        title: manualData.title,
        description: manualData.description,
        organization_name: manualData.organization_name,
        manual_code: manualData.manual_code,
        status: 'draft', // Always set to draft after restore
        current_revision: manualData.current_revision,
        effective_date: manualData.effective_date,
        review_due_date: manualData.review_due_date,
        metadata: manualData.metadata,
        updated_by: user.id,
      })
      .eq('id', manualId)

    if (updateManualError) {
      console.error('Error updating manual:', updateManualError)
      return NextResponse.json(
        { error: 'Failed to restore manual metadata' },
        { status: 500 }
      )
    }

    // 3. Restore chapters
    if (manualData.chapters && Array.isArray(manualData.chapters)) {
      for (const chapter of manualData.chapters) {
        // Insert chapter
        const { data: restoredChapter, error: chapterError } = await supabase
          .from('chapters')
          .insert({
            id: chapter.id, // Preserve original IDs for relationships
            manual_id: manualId,
            parent_id: chapter.parent_id,
            chapter_number: chapter.chapter_number,
            section_number: chapter.section_number,
            subsection_number: chapter.subsection_number,
            heading: chapter.heading,
            display_order: chapter.display_order,
            depth: chapter.depth,
            page_break: chapter.page_break,
            is_mandatory: chapter.is_mandatory,
            created_by: user.id,
          })
          .select()
          .single()

        if (chapterError) {
          console.error('Error restoring chapter:', chapterError)
          // Continue with other chapters
          continue
        }

        // Restore content blocks for this chapter
        if (chapter.content_blocks && Array.isArray(chapter.content_blocks)) {
          const contentBlocksToInsert = chapter.content_blocks.map((block: any) => ({
            chapter_id: chapter.id,
            block_type: block.block_type,
            content: block.content,
            display_order: block.display_order,
            created_by: user.id,
          }))

          if (contentBlocksToInsert.length > 0) {
            await supabase
              .from('content_blocks')
              .insert(contentBlocksToInsert)
          }
        }

        // Restore chapter remarks for this chapter
        if (chapter.chapter_remarks && Array.isArray(chapter.chapter_remarks)) {
          const remarksToInsert = chapter.chapter_remarks.map((remark: any) => ({
            chapter_id: chapter.id,
            remark_text: remark.remark_text,
            display_order: remark.display_order,
            created_by: user.id,
          }))

          if (remarksToInsert.length > 0) {
            await supabase
              .from('chapter_remarks')
              .insert(remarksToInsert)
          }
        }
      }
    }

    // 4. Create a new revision snapshot for the restore operation
    const { data: revisionNumber } = await supabase
      .rpc('get_next_revision_number', {
        p_manual_id: manualId,
        p_is_draft: true,
      })

    await supabase
      .from('revisions')
      .insert({
        manual_id: manualId,
        revision_number: revisionNumber,
        status: 'draft',
        snapshot: {
          manual: manualData,
          timestamp: new Date().toISOString(),
          restored_from_revision: targetRevision.revision_number,
        },
        changes_summary: `Restored from revision ${targetRevision.revision_number}`,
        chapters_affected: manualData.chapters?.map((ch: any) =>
          `${ch.chapter_number}${ch.section_number ? `.${ch.section_number}` : ''}${ch.subsection_number ? `.${ch.subsection_number}` : ''}`
        ) || [],
        created_by: user.id,
      })

    return NextResponse.json({
      success: true,
      message: `Successfully restored from revision ${targetRevision.revision_number}`,
    })
  } catch (error) {
    console.error('Error in restore-from-revision API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
