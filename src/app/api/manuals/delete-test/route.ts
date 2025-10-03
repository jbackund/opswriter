import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'sysadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('manuals')
    .delete()
    .eq('manual_code', 'TEST-001')

  if (error) {
    console.error('Error deleting test manual:', error)
    return NextResponse.json({ error: 'Failed to delete manual' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Test manual TEST-001 deleted successfully',
  })
}
