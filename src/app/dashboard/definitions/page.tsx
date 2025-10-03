import { createClient } from '@/lib/supabase/server'
import DefinitionsList from '@/components/DefinitionsList'

export default async function DefinitionsPage() {
  const supabase = await createClient()

  // Get all definitions
  const { data: definitions, error } = await supabase
    .from('definitions')
    .select('*')
    .order('term', { ascending: true })

  if (error) {
    console.error('Error fetching definitions:', error)
  }

  return (
    <div className="p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Definitions</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage glossary definitions that can be included in manuals
          </p>
        </div>
      </div>

      <DefinitionsList initialDefinitions={definitions || []} />
    </div>
  )
}