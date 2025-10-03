#!/usr/bin/env node

/**
 * Script to seed test data into the Supabase database
 * This generates sample manuals, users, and related data for UAT and testing
 */

const { createClient } = require('@supabase/supabase-js')
const { faker } = require('@faker-js/faker')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Generate test users
async function createTestUsers() {
  console.log('Creating test users...')

  const users = [
    {
      email: 'admin@heliairsweden.com',
      full_name: 'System Administrator',
      role: 'sysadmin',
      department: 'IT',
    },
    {
      email: 'manager1@heliairsweden.com',
      full_name: 'Sarah Johnson',
      role: 'manager',
      department: 'Operations',
    },
    {
      email: 'manager2@heliairsweden.com',
      full_name: 'Erik Andersson',
      role: 'manager',
      department: 'Maintenance',
    },
    {
      email: 'manager3@heliairsweden.com',
      full_name: 'Anna Lindberg',
      role: 'manager',
      department: 'Safety & Compliance',
    },
  ]

  for (const user of users) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'Test123!',
      email_confirm: true,
    })

    if (authError) {
      console.error(`Error creating auth user ${user.email}:`, authError)
      continue
    }

    // Create user metadata
    const { error: metaError } = await supabase.from('users').insert({
      id: authData.user.id,
      ...user,
      is_active: true,
    })

    if (metaError) {
      console.error(`Error creating user metadata for ${user.email}:`, metaError)
    } else {
      console.log(`Created user: ${user.email}`)
    }
  }

  return users
}

// Generate sample manuals with different states
async function createSampleManuals() {
  console.log('Creating sample manuals...')

  const manualTemplates = [
    {
      title: 'Flight Operations Manual',
      description: 'Comprehensive guide for flight operations procedures and protocols',
      status: 'approved',
      revision_number: 3,
      tags: ['operations', 'flight', 'procedures'],
    },
    {
      title: 'Maintenance Procedures Handbook',
      description: 'Technical manual for aircraft maintenance and inspection procedures',
      status: 'approved',
      revision_number: 2,
      tags: ['maintenance', 'technical', 'inspection'],
    },
    {
      title: 'Safety Management System',
      description: 'Safety protocols, risk assessment, and emergency procedures',
      status: 'in_review',
      revision_number: 1,
      tags: ['safety', 'compliance', 'emergency'],
    },
    {
      title: 'Ground Operations Guide',
      description: 'Procedures for ground handling, fueling, and aircraft servicing',
      status: 'draft',
      revision_number: 0,
      tags: ['ground', 'operations', 'servicing'],
    },
    {
      title: 'Training and Certification Manual',
      description: 'Training requirements and certification procedures for personnel',
      status: 'rejected',
      revision_number: 0,
      tags: ['training', 'certification', 'personnel'],
    },
  ]

  // Get a manager user ID
  const { data: manager } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'manager')
    .single()

  if (!manager) {
    console.error('No manager user found')
    return
  }

  for (const template of manualTemplates) {
    // Create manual
    const { data: manual, error: manualError } = await supabase
      .from('manuals')
      .insert({
        ...template,
        organization: 'Heli Air Sweden AB',
        language: 'en',
        owner_id: manager.id,
        reference_number: `REF-${faker.number.int({ min: 1000, max: 9999 })}`,
        document_code: `DOC-${faker.string.alphanumeric(6).toUpperCase()}`,
        effective_date: template.status === 'approved' ? faker.date.past().toISOString() : null,
      })
      .select()
      .single()

    if (manualError) {
      console.error(`Error creating manual ${template.title}:`, manualError)
      continue
    }

    console.log(`Created manual: ${template.title} (${template.status})`)

    // Create chapters for the manual
    await createChaptersForManual(manual.id, template.title)
  }
}

// Generate chapters for a manual
async function createChaptersForManual(manualId, manualTitle) {
  console.log(`Creating chapters for ${manualTitle}...`)

  // Chapter 0 is mandatory
  const chapter0 = {
    manual_id: manualId,
    chapter_number: '0',
    heading: 'Record of Revision',
    level: 0,
    sequence: 0,
    parent_id: null,
    page_break: true,
  }

  const { error: ch0Error } = await supabase.from('chapters').insert(chapter0)
  if (ch0Error) {
    console.error('Error creating Chapter 0:', ch0Error)
    return
  }

  // Create main chapters based on manual type
  const chapterCount = faker.number.int({ min: 5, max: 10 })
  let sequence = 1

  for (let i = 1; i <= chapterCount; i++) {
    const mainChapter = {
      manual_id: manualId,
      chapter_number: i.toString(),
      heading: faker.company.catchPhrase(),
      level: 1,
      sequence: sequence++,
      parent_id: null,
      page_break: i > 1, // Page break for all chapters except first
      remark: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : null,
    }

    const { data: chapter, error: chError } = await supabase
      .from('chapters')
      .insert(mainChapter)
      .select()
      .single()

    if (chError) {
      console.error(`Error creating chapter ${i}:`, chError)
      continue
    }

    // Add content to the chapter
    const content = generateRichContent()
    await supabase.from('content_blocks').insert({
      chapter_id: chapter.id,
      content: content,
      sequence: 1,
    })

    // Randomly add sub-chapters
    if (faker.datatype.boolean({ probability: 0.6 })) {
      const subChapterCount = faker.number.int({ min: 1, max: 3 })
      for (let j = 1; j <= subChapterCount; j++) {
        const subChapter = {
          manual_id: manualId,
          chapter_number: `${i}.${j}`,
          heading: faker.lorem.sentence(),
          level: 2,
          sequence: sequence++,
          parent_id: chapter.id,
          page_break: false,
        }

        const { data: subCh, error: subChError } = await supabase
          .from('chapters')
          .insert(subChapter)
          .select()
          .single()

        if (!subChError && subCh) {
          // Add content to sub-chapter
          await supabase.from('content_blocks').insert({
            chapter_id: subCh.id,
            content: generateRichContent(),
            sequence: 1,
          })
        }
      }
    }
  }

  console.log(`Created ${chapterCount} main chapters for ${manualTitle}`)
}

// Generate rich HTML content
function generateRichContent() {
  const contentTypes = [
    // Paragraph with formatting
    () => `
      <h3>${faker.lorem.sentence()}</h3>
      <p>${faker.lorem.paragraphs(2)}</p>
      <p><strong>Important:</strong> ${faker.lorem.sentence()}</p>
    `,
    // List
    () => `
      <p>${faker.lorem.paragraph()}</p>
      <ul>
        ${Array(faker.number.int({ min: 3, max: 6 }))
          .fill(null)
          .map(() => `<li>${faker.lorem.sentence()}</li>`)
          .join('\n')}
      </ul>
    `,
    // Table
    () => `
      <p>${faker.lorem.paragraph()}</p>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          ${Array(faker.number.int({ min: 2, max: 5 }))
            .fill(null)
            .map(() => `
              <tr>
                <td>${faker.lorem.word()}</td>
                <td>${faker.number.int({ min: 10, max: 100 })}</td>
                <td>${faker.helpers.arrayElement(['kg', 'm', 's', 'Hz', 'bar'])}</td>
              </tr>
            `)
            .join('\n')}
        </tbody>
      </table>
    `,
    // Procedure
    () => `
      <h3>Procedure: ${faker.lorem.sentence()}</h3>
      <ol>
        ${Array(faker.number.int({ min: 4, max: 8 }))
          .fill(null)
          .map(() => `<li>${faker.lorem.sentence()}</li>`)
          .join('\n')}
      </ol>
      <p><em>Note: ${faker.lorem.sentence()}</em></p>
    `,
  ]

  // Select random content types
  const selectedTypes = faker.helpers.shuffle(contentTypes).slice(0, faker.number.int({ min: 2, max: 3 }))
  return selectedTypes.map(fn => fn()).join('\n')
}

// Create definitions and abbreviations
async function createReferences() {
  console.log('Creating definitions and abbreviations...')

  // Definitions
  const definitions = [
    { term: 'AFM', definition: 'Aircraft Flight Manual - The official operating manual for a specific aircraft' },
    { term: 'AOC', definition: 'Air Operator Certificate - License to conduct commercial air operations' },
    { term: 'MEL', definition: 'Minimum Equipment List - Equipment required for flight operations' },
    { term: 'SOP', definition: 'Standard Operating Procedure - Established operational procedures' },
    { term: 'CRM', definition: 'Crew Resource Management - Effective use of all available resources' },
  ]

  for (const def of definitions) {
    const { error } = await supabase.from('definitions').insert({
      ...def,
      category: 'technical',
    })
    if (error) console.error('Error creating definition:', error)
  }

  // Abbreviations
  const abbreviations = [
    { abbreviation: 'EASA', full_text: 'European Union Aviation Safety Agency' },
    { abbreviation: 'ICAO', full_text: 'International Civil Aviation Organization' },
    { abbreviation: 'VFR', full_text: 'Visual Flight Rules' },
    { abbreviation: 'IFR', full_text: 'Instrument Flight Rules' },
    { abbreviation: 'ATC', full_text: 'Air Traffic Control' },
  ]

  for (const abbr of abbreviations) {
    const { error } = await supabase.from('abbreviations').insert({
      ...abbr,
      category: 'regulatory',
    })
    if (error) console.error('Error creating abbreviation:', error)
  }

  console.log('Created reference data')
}

// Export sample data for baseline comparisons
async function exportBaselineData() {
  console.log('Exporting baseline data...')

  const { data: manuals } = await supabase
    .from('manuals')
    .select(`
      *,
      chapters(
        *,
        content_blocks(*)
      )
    `)
    .limit(3)

  const baselineData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    manuals: manuals || [],
  }

  const outputPath = path.join(__dirname, '..', 'test-data', 'baseline.json')

  // Create test-data directory if it doesn't exist
  const testDataDir = path.join(__dirname, '..', 'test-data')
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, JSON.stringify(baselineData, null, 2))
  console.log(`Baseline data exported to ${outputPath}`)
}

// Main execution
async function main() {
  console.log('Starting test data seeding...')

  try {
    await createTestUsers()
    await createSampleManuals()
    await createReferences()
    await exportBaselineData()

    console.log('\nTest data seeding completed successfully!')
    console.log('\nTest accounts created:')
    console.log('  Admin: admin@heliairsweden.com (password: Test123!)')
    console.log('  Manager 1: manager1@heliairsweden.com (password: Test123!)')
    console.log('  Manager 2: manager2@heliairsweden.com (password: Test123!)')
    console.log('  Manager 3: manager3@heliairsweden.com (password: Test123!)')
  } catch (error) {
    console.error('Error during seeding:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}