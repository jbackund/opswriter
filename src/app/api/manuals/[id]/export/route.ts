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
      includeWatermark
    )

    // Launch browser and generate PDF
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

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
    const fileName = `${manual.manual_code}_${manual.current_revision}_${Date.now()}.pdf`
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

    // Record export job
    const { data: exportJob, error: exportError } = await supabase
      .from('export_jobs')
      .insert({
        manual_id: manualId,
        export_type: exportType,
        file_path: uploadData.path,
        generated_by: user.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select()
      .single()

    if (exportError) {
      console.error('Error recording export job:', exportError)
    }

    // Get signed URL for download
    const { data: signedUrlData } = await supabase.storage
      .from('exports')
      .createSignedUrl(uploadData.path, 3600) // 1 hour

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
  includeWatermark: boolean
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
    }

    .diff-added {
      background: #c8e6c9;
      color: #2e7d32;
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

  <!-- Chapters -->
  <div class="chapters">
    ${generateChaptersContent(chapters)}
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

function generateChaptersContent(chapters: any[]): string {
  return chapters
    .map((chapter: any) => {
      const chapterNumber = formatChapterNumber(chapter)
      const pageBreakClass = chapter.page_break ? 'page-break' : ''
      const contentBlocks = (chapter.content_blocks || [])
        .sort((a: any, b: any) => a.display_order - b.display_order)

      const remarks = (chapter.chapter_remarks || [])
        .sort((a: any, b: any) => a.display_order - b.display_order)

      return `
        <div class="chapter ${pageBreakClass}" id="chapter-${chapter.id}">
          <h3 class="chapter-heading">${chapterNumber} ${chapter.heading}</h3>

          ${contentBlocks
            .map(
              (block: any) => `
            <div class="chapter-content">${block.content || ''}</div>
          `
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
