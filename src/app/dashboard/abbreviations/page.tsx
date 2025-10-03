import { createClient } from '@/lib/supabase/server'
import AbbreviationsList from '@/components/AbbreviationsList'

export default async function AbbreviationsPage() {
  const supabase = await createClient()

  // Get all abbreviations
  const { data: abbreviations, error } = await supabase
    .from('abbreviations')
    .select('*')
    .order('abbreviation', { ascending: true })

  if (error) {
    console.error('Error fetching abbreviations:', error)
  }

  return (
    <div className="p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Abbreviations</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage abbreviations and their full text that can be included in manuals
          </p>
        </div>
      </div>

      <AbbreviationsList initialAbbreviations={abbreviations || []} />
    </div>
  )
}