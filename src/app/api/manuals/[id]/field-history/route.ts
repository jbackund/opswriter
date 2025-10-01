import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/manuals/[id]/field-history - Get field-level change history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const manualId = params.id
    const { searchParams } = new URL(request.url)

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Filter parameters
    const tableName = searchParams.get('table_name')
    const fieldName = searchParams.get('field_name')
    const recordId = searchParams.get('record_id')

    let query = supabase
      .from('field_history')
      .select(`
        *,
        changed_by_user:user_profiles!field_history_changed_by_fkey(full_name, email),
        revision:revisions(revision_number, status)
      `, { count: 'exact' })
      .eq('manual_id', manualId)
      .order('changed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (tableName) {
      query = query.eq('table_name', tableName)
    }
    if (fieldName) {
      query = query.eq('field_name', fieldName)
    }
    if (recordId) {
      query = query.eq('record_id', recordId)
    }

    const { data: fieldHistory, error, count } = await query

    if (error) {
      console.error('Error fetching field history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch field history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      field_history: fieldHistory,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error in field-history API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
