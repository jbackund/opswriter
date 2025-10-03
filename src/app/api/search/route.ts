import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search parameters
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') || 'all' // all, manual, chapter, content, definition, abbreviation

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Perform full-text search using the database function
    const { data: results, error } = await supabase.rpc('search_all_content', {
      search_query: query,
      result_limit: limit,
    })

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      )
    }

    // Filter by type if specified
    let filteredResults = results || []
    if (type !== 'all') {
      filteredResults = filteredResults.filter(r => r.type === type)
    }

    // Group results by type for better presentation
    const groupedResults = {
      manuals: filteredResults.filter(r => r.type === 'manual'),
      chapters: filteredResults.filter(r => r.type === 'chapter'),
      content: filteredResults.filter(r => r.type === 'content'),
      definitions: filteredResults.filter(r => r.type === 'definition'),
      abbreviations: filteredResults.filter(r => r.type === 'abbreviation'),
    }

    return NextResponse.json({
      query,
      total: filteredResults.length,
      results: groupedResults,
      raw: filteredResults,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}