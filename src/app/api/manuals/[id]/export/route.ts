import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

// POST /api/manuals/[id]/export - Generate PDF export
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
    const { exportType = 'clean', includeWatermark = false } = body

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
      return NextResponse.json(
        { error: 'Manual not found' },
        { status: 404 }
      )
    }

    // Get revisions for Record of Revision section
    const { data: revisions } = await supabase
      .from('revisions')
      .select('*')
      .eq('manual_id', manualId)
      .eq('status', 'approved')
      .order('approved_at', { ascending: true })

    // For diff export, get the last approved revision to compare against
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

    // Get definitions and abbreviations if selected for this manual
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

    // Generate HTML content
    const htmlContent = generatePDFHTML(
      manual,
      revisions || [],
      definitions,
      abbreviations,
      exportType,
      includeWatermark,
      previousRevision
    )

    // Determine if we're in development or production
    const isDev = process.env.NODE_ENV === 'development'

    // Launch browser and generate PDF
    // In development, use local Chrome; in production, use @sparticuz/chromium
    let browser
    try {
      browser = await puppeteer.launch(
        isDev
          ? {
              // Local development - try common Chrome locations on macOS
              executablePath: process.env.CHROME_PATH ||
                             '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
            }
          : {
              // Production - use @sparticuz/chromium for serverless
              args: chromium.args,
              defaultViewport: chromium.defaultViewport,
              executablePath: await chromium.executablePath(),
              headless: chromium.headless,
            }
      )
    } catch (launchError) {
      console.error('Browser launch error:', launchError)
      return NextResponse.json(
        {
          error: isDev
            ? 'Chrome not found. Please install Google Chrome or set CHROME_PATH environment variable to your Chrome executable.'
            : 'Failed to initialize PDF generator'
        },
        { status: 500 }
      )
    }

    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate: generateHeaderTemplate(manual),
      footerTemplate: generateFooterTemplate(manual),
    })

    await browser.close()

    // Store PDF in Supabase Storage
    // Path format: {user_id}/{filename}.pdf for RLS policy compliance
    const fileName = `${user.id}/${manual.manual_code}_${manual.current_revision}_${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(fileName, pdf, {
        contentType: 'application/pdf',
        cacheControl: '2592000', // 30 days
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      return NextResponse.json(
        { error: 'Failed to store PDF' },
        { status: 500 }
      )
    }

    // Get signed URL for download
    const { data: signedUrlData } = await supabase.storage
      .from('exports')
      .createSignedUrl(uploadData.path, 3600) // 1 hour

    // Record export job
    const { data: exportJob, error: exportError } = await supabase
      .from('export_jobs')
      .insert({
        manual_id: manualId,
        variant: exportType,  // Changed from export_type to variant
        status: 'completed',  // Added required status field
        file_path: uploadData.path,
        file_url: signedUrlData?.signedUrl || null,  // Added file_url for easier access
        created_by: user.id,  // Changed from generated_by to created_by
        processing_completed_at: new Date().toISOString(),  // Mark as completed
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select()
      .single()

    if (exportError) {
      console.error('Error recording export job:', exportError)
    }

    return NextResponse.json({
      success: true,
      downloadUrl: signedUrlData?.signedUrl,
      fileName,
      exportJobId: exportJob?.id,
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generatePDFHTML(
  manual: any,
  revisions: any[],
  definitions: any[],
  abbreviations: any[],
  exportType: string,
  includeWatermark: boolean,
  previousRevision: any = null
): string {
  const chapters = (manual.chapters || []).sort((a: any, b: any) => a.display_order - b.display_order)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }

    body {
      font-family: 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
    }

    .cover-page {
      page-break-after: always;
      text-align: center;
      padding-top: 100px;
    }

    .cover-page h1 {
      font-size: 28pt;
      margin-bottom: 30px;
    }

    .cover-page .metadata {
      font-size: 12pt;
      margin: 20px 0;
    }

    .section-title {
      font-size: 16pt;
      font-weight: bold;
      margin-top: 30px;
      margin-bottom: 15px;
      page-break-after: avoid;
    }

    .toc {
      page-break-after: always;
    }

    .toc-item {
      margin: 5px 0;
      display: flex;
      justify-content: space-between;
    }

    .toc-item a {
      text-decoration: none;
      color: #000;
    }

    .chapter {
      margin: 20px 0;
    }

    .chapter.page-break {
      page-break-before: always;
    }

    .chapter-heading {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .chapter-content {
      margin: 10px 0;
    }

    .chapter-remark {
      background: #f0f0f0;
      padding: 10px;
      margin: 10px 0;
      border-left: 4px solid #666;
      font-style: italic;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }

    th, td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }

    th {
      background: #e0e0e0;
      font-weight: bold;
    }

    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      color: rgba(255, 0, 0, 0.1);
      font-weight: bold;
      z-index: 9999;
      pointer-events: none;
    }

    .diff-removed {
      text-decoration: line-through;
      color: #d32f2f;
      background-color: #ffebee;
      padding: 2px 4px;
      border-radius: 2px;
    }

    .diff-added {
      background: #c8e6c9;
      color: #2e7d32;
      padding: 2px 4px;
      border-radius: 2px;
    }

    .diff-notice {
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      padding: 10px;
      margin: 20px 0;
      border-radius: 4px;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  ${includeWatermark ? '<div class="watermark">DRAFT</div>' : ''}

  <!-- Cover Page -->
  <div class="cover-page">
    <h1>${manual.title}</h1>
    <div class="metadata">
      <p><strong>Document Code:</strong> ${manual.manual_code}</p>
      <p><strong>Revision:</strong> ${manual.current_revision}</p>
      <p><strong>Effective Date:</strong> ${manual.effective_date || 'N/A'}</p>
      <p><strong>Organization:</strong> ${manual.organization_name}</p>
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="toc">
    <h2 class="section-title">Table of Contents</h2>
    ${generateTableOfContents(chapters)}
  </div>

  <!-- Record of Revision -->
  <div class="record-of-revision">
    <h2 class="section-title">Record of Revision</h2>
    ${generateRecordOfRevision(revisions)}
  </div>

  <!-- Chapters Affected -->
  <div class="chapters-affected">
    <h2 class="section-title">Chapters Affected in This Revision</h2>
    ${generateChaptersAffected(manual, revisions)}
  </div>

  <!-- Definitions -->
  ${definitions.length > 0 ? `
  <div class="definitions">
    <h2 class="section-title">List of Definitions</h2>
    ${generateDefinitionsList(definitions)}
  </div>
  ` : ''}

  <!-- Abbreviations -->
  ${abbreviations.length > 0 ? `
  <div class="abbreviations">
    <h2 class="section-title">List of Abbreviations</h2>
    ${generateAbbreviationsList(abbreviations)}
  </div>
  ` : ''}

  <!-- Diff Notice -->
  ${exportType === 'diff' ? `
  <div class="diff-notice">
    <strong>Diff Export:</strong> This document shows changes from the last approved revision.
    <br><span class="diff-added">Green highlighted text</span> indicates additions.
    <br><span class="diff-removed">Red strikethrough text</span> indicates deletions.
  </div>
  ` : ''}

  <!-- Chapters -->
  <div class="chapters">
    ${generateChaptersContent(chapters, exportType, previousRevision)}
  </div>
</body>
</html>
  `.trim()
}

function generateTableOfContents(chapters: any[]): string {
  return chapters
    .map((chapter: any) => {
      const chapterNumber = formatChapterNumber(chapter)
      return `
        <div class="toc-item">
          <a href="#chapter-${chapter.id}">${chapterNumber} ${chapter.heading}</a>
          <span>${chapter.display_order}</span>
        </div>
      `
    })
    .join('')
}

function generateChaptersAffected(manual: any, revisions: any[]): string {
  // Get the latest revision to show which chapters were affected
  const latestRevision = revisions.length > 0 ? revisions[revisions.length - 1] : null

  // If there's a latest revision with chapters_affected data
  const chaptersAffected = latestRevision?.chapters_affected || []

  if (chaptersAffected.length === 0) {
    return '<p>No specific chapters identified as affected in this revision</p>'
  }

  // Get the full chapter details from the manual
  const chapters = (manual.chapters || []).filter((ch: any) =>
    chaptersAffected.includes(ch.chapter_number?.toString())
  )

  if (chapters.length === 0) {
    return '<p>No chapters affected in this revision</p>'
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Chapter</th>
          <th>Title</th>
          <th>Remarks</th>
          <th>Effective Date</th>
        </tr>
      </thead>
      <tbody>
        ${chapters
          .map((chapter: any) => {
            const chapterNumber = formatChapterNumber(chapter)
            // Get remarks from chapter_remarks if available
            const remarks = chapter.chapter_remarks?.[0]?.remark || '-'
            const effectiveDate = manual.effective_date ?
              new Date(manual.effective_date).toLocaleDateString() :
              'Pending'

            return `
              <tr>
                <td>${chapterNumber}</td>
                <td>${chapter.heading}</td>
                <td>${remarks}</td>
                <td>${effectiveDate}</td>
              </tr>
            `
          })
          .join('')}
      </tbody>
    </table>
  `
}

function generateRecordOfRevision(revisions: any[]): string {
  if (revisions.length === 0) {
    return '<p>No approved revisions</p>'
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Revision</th>
          <th>Date</th>
          <th>Description</th>
          <th>Approved By</th>
        </tr>
      </thead>
      <tbody>
        ${revisions
          .map(
            (rev: any) => `
          <tr>
            <td>${rev.revision_number}</td>
            <td>${new Date(rev.approved_at).toLocaleDateString()}</td>
            <td>${rev.changes_summary || 'N/A'}</td>
            <td>${rev.approved_by || 'N/A'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
}

function generateDefinitionsList(definitions: any[]): string {
  return `
    <table>
      <thead>
        <tr>
          <th>Term</th>
          <th>Definition</th>
        </tr>
      </thead>
      <tbody>
        ${definitions
          .map(
            (def: any) => `
          <tr>
            <td>${def.term}</td>
            <td>${def.definition}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
}

function generateAbbreviationsList(abbreviations: any[]): string {
  return `
    <table>
      <thead>
        <tr>
          <th>Abbreviation</th>
          <th>Full Form</th>
        </tr>
      </thead>
      <tbody>
        ${abbreviations
          .map(
            (abbr: any) => `
          <tr>
            <td>${abbr.abbreviation}</td>
            <td>${abbr.full_form}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
}

function generateChaptersContent(chapters: any[], exportType: string = 'clean', previousRevision: any = null): string {
  return chapters
    .map((chapter: any) => {
      const chapterNumber = formatChapterNumber(chapter)
      const pageBreakClass = chapter.page_break ? 'page-break' : ''
      const contentBlocks = (chapter.content_blocks || [])
        .sort((a: any, b: any) => a.display_order - b.display_order)

      const remarks = (chapter.chapter_remarks || [])
        .sort((a: any, b: any) => a.display_order - b.display_order)

      // Get previous chapter content for diff if available
      let previousChapterContent = ''
      let previousChapterHeading = ''
      if (exportType === 'diff' && previousRevision?.snapshot?.manual?.chapters) {
        const prevChapter = previousRevision.snapshot.manual.chapters.find(
          (ch: any) => ch.chapter_number === chapter.chapter_number &&
                      ch.section_number === chapter.section_number &&
                      ch.subsection_number === chapter.subsection_number
        )
        if (prevChapter) {
          previousChapterHeading = prevChapter.heading || ''
          // Get content from previous revision's content_blocks or fallback to content field
          if (prevChapter.content_blocks && prevChapter.content_blocks.length > 0) {
            const firstBlock = prevChapter.content_blocks[0]
            previousChapterContent = firstBlock.content?.html || firstBlock.content || ''
          } else {
            previousChapterContent = prevChapter.content || ''
          }
        }
      }

      // Generate diff heading if needed
      const headingHtml = exportType === 'diff' && previousChapterHeading !== chapter.heading
        ? `<h3 class="chapter-heading">
            ${chapterNumber}
            ${previousChapterHeading ? `<span class="diff-removed">${previousChapterHeading}</span> ` : ''}
            <span class="diff-added">${chapter.heading}</span>
          </h3>`
        : `<h3 class="chapter-heading">${chapterNumber} ${chapter.heading}</h3>`

      return `
        <div class="chapter ${pageBreakClass}" id="chapter-${chapter.id}">
          ${headingHtml}

          ${contentBlocks
            .map(
              (block: any) => {
                // Extract HTML content from JSONB structure
                const htmlContent = block.content?.html || block.content || ''

                // If diff mode, show changes
                if (exportType === 'diff' && previousChapterContent) {
                  // Simple diff: If content changed, show both versions
                  if (previousChapterContent !== htmlContent) {
                    return `
                      <div class="chapter-content">
                        ${previousChapterContent ? `<div class="diff-removed">${previousChapterContent}</div>` : ''}
                        <div class="diff-added">${htmlContent}</div>
                      </div>
                    `
                  }
                }

                return `<div class="chapter-content">${htmlContent}</div>`
              }
            )
            .join('')}

          ${remarks
            .map(
              (remark: any) => `
            <div class="chapter-remark">
              <strong>Remark:</strong> ${remark.remark_text}
            </div>
          `
            )
            .join('')}
        </div>
      `
    })
    .join('')
}

function formatChapterNumber(chapter: any): string {
  const parts = [chapter.chapter_number]
  if (chapter.section_number !== null) parts.push(chapter.section_number)
  if (chapter.subsection_number !== null) parts.push(chapter.subsection_number)
  return parts.join('.')
}

function generateHeaderTemplate(manual: any): string {
  return `
    <div style="font-size: 9pt; width: 100%; text-align: center; padding: 0 15mm;">
      <span>${manual.organization_name} - ${manual.title}</span>
    </div>
  `
}

function generateFooterTemplate(manual: any): string {
  return `
    <div style="font-size: 9pt; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm;">
      <span>${manual.manual_code} Rev. ${manual.current_revision}</span>
      <span class="pageNumber"></span>
      <span>${new Date().toLocaleDateString()}</span>
    </div>
  `
}
