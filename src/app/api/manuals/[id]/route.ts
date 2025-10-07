import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
    }

    if (profile?.role !== 'sysadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const manualId = id

    const { data: manual, error: updateError } = await supabase
      .from('manuals')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', manualId)
      .select('id, title')
      .maybeSingle()

    if (updateError) {
      console.error('Failed to delete manual:', updateError)
      return NextResponse.json({ error: 'Failed to delete manual' }, { status: 500 })
    }

    if (!manual) {
      return NextResponse.json({ error: 'Manual not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Manual deleted',
      manual,
    })
  } catch (error) {
    console.error('Unexpected error deleting manual:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
