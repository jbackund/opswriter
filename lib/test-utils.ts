import { faker } from '@faker-js/faker'
import { Database } from '@/types/supabase'

type Manual = Database['public']['Tables']['manuals']['Insert']
type Chapter = Database['public']['Tables']['chapters']['Insert']
type User = Database['public']['Tables']['users']['Row']

/**
 * Test data generators for OpsWriter testing
 */

// Generate a test user
export function generateUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: `${faker.internet.username()}@heliairsweden.com`,
    full_name: faker.person.fullName(),
    role: faker.helpers.arrayElement(['manager', 'sysadmin']),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: null,
    department: faker.company.name(),
    phone: faker.phone.number(),
    ...overrides,
  }
}

// Generate a test manual
export function generateManual(overrides?: Partial<Manual>): Manual {
  return {
    id: faker.string.uuid(),
    title: faker.company.catchPhrase(),
    description: faker.lorem.paragraph(),
    organization: 'Heli Air Sweden AB',
    language: faker.helpers.arrayElement(['en', 'sv']),
    owner_id: faker.string.uuid(),
    status: faker.helpers.arrayElement(['draft', 'in_review', 'approved', 'rejected']),
    revision_number: faker.number.int({ min: 0, max: 10 }),
    effective_date: faker.date.future().toISOString(),
    reference_number: `REF-${faker.number.int({ min: 1000, max: 9999 })}`,
    document_code: `DOC-${faker.string.alphanumeric(6).toUpperCase()}`,
    tags: faker.lorem.words(3).split(' '),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Generate a test chapter
export function generateChapter(manualId: string, overrides?: Partial<Chapter>): Chapter {
  const level = faker.number.int({ min: 0, max: 3 })
  return {
    id: faker.string.uuid(),
    manual_id: manualId,
    parent_id: level > 0 ? faker.string.uuid() : null,
    chapter_number: faker.helpers.arrayElement(['0', '1', '1.1', '1.1.1', '2', '2.1']),
    heading: faker.lorem.sentence(),
    level,
    sequence: faker.number.int({ min: 1, max: 100 }),
    remark: faker.datatype.boolean() ? faker.lorem.sentence() : null,
    page_break: faker.datatype.boolean(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Generate rich text content
export function generateRichContent(): string {
  const elements = [
    `<h2>${faker.lorem.sentence()}</h2>`,
    `<p>${faker.lorem.paragraphs(2)}</p>`,
    `<ul>${Array(3).fill(null).map(() => `<li>${faker.lorem.sentence()}</li>`).join('')}</ul>`,
    `<table><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead><tbody><tr><td>${faker.lorem.word()}</td><td>${faker.lorem.word()}</td></tr></tbody></table>`,
    `<p><strong>${faker.lorem.words(3)}</strong> ${faker.lorem.sentence()}</p>`,
  ]

  return faker.helpers.shuffle(elements).slice(0, 3).join('\n')
}

// Generate a complete manual with chapters
export function generateCompleteManual(config?: {
  chapterCount?: number
  maxDepth?: number
  includeContent?: boolean
}) {
  const { chapterCount = 10, maxDepth = 3, includeContent = true } = config || {}

  const manual = generateManual({ status: 'draft', revision_number: 0 })
  const chapters: Chapter[] = []
  const content: { chapter_id: string; content: string }[] = []

  // Always include Chapter 0
  const chapter0 = generateChapter(manual.id!, {
    chapter_number: '0',
    heading: 'Record of Revision',
    level: 0,
    sequence: 0,
    parent_id: null,
  })
  chapters.push(chapter0)

  if (includeContent) {
    content.push({
      chapter_id: chapter0.id!,
      content: '<p>This chapter tracks all revisions made to the manual.</p>',
    })
  }

  // Generate hierarchical chapters
  let sequence = 1
  for (let i = 1; i <= chapterCount; i++) {
    const mainChapter = generateChapter(manual.id!, {
      chapter_number: i.toString(),
      heading: `Chapter ${i}: ${faker.lorem.sentence()}`,
      level: 1,
      sequence: sequence++,
      parent_id: null,
    })
    chapters.push(mainChapter)

    if (includeContent) {
      content.push({
        chapter_id: mainChapter.id!,
        content: generateRichContent(),
      })
    }

    // Add sub-chapters
    if (maxDepth > 1 && faker.datatype.boolean()) {
      const subChapterCount = faker.number.int({ min: 1, max: 3 })
      for (let j = 1; j <= subChapterCount; j++) {
        const subChapter = generateChapter(manual.id!, {
          chapter_number: `${i}.${j}`,
          heading: faker.lorem.sentence(),
          level: 2,
          sequence: sequence++,
          parent_id: mainChapter.id,
        })
        chapters.push(subChapter)

        if (includeContent) {
          content.push({
            chapter_id: subChapter.id!,
            content: generateRichContent(),
          })
        }

        // Add sub-sub-chapters
        if (maxDepth > 2 && faker.datatype.boolean({ probability: 0.3 })) {
          const subSubChapterCount = faker.number.int({ min: 1, max: 2 })
          for (let k = 1; k <= subSubChapterCount; k++) {
            const subSubChapter = generateChapter(manual.id!, {
              chapter_number: `${i}.${j}.${k}`,
              heading: faker.lorem.sentence(),
              level: 3,
              sequence: sequence++,
              parent_id: subChapter.id,
            })
            chapters.push(subSubChapter)

            if (includeContent) {
              content.push({
                chapter_id: subSubChapter.id!,
                content: generateRichContent(),
              })
            }
          }
        }
      }
    }
  }

  return { manual, chapters, content }
}

// Generate definitions
export function generateDefinitions(count: number = 10) {
  return Array(count).fill(null).map(() => ({
    id: faker.string.uuid(),
    term: faker.lorem.word(),
    definition: faker.lorem.sentence(),
    category: faker.helpers.arrayElement(['technical', 'operational', 'regulatory', 'general']),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

// Generate abbreviations
export function generateAbbreviations(count: number = 10) {
  return Array(count).fill(null).map(() => ({
    id: faker.string.uuid(),
    abbreviation: faker.string.alpha({ length: { min: 2, max: 5 } }).toUpperCase(),
    full_text: faker.lorem.words(3),
    category: faker.helpers.arrayElement(['technical', 'operational', 'regulatory', 'general']),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

// Generate revision history
export function generateRevisionHistory(manualId: string, count: number = 5) {
  const history = []
  let currentRevision = 0

  for (let i = 0; i < count; i++) {
    const isApproved = i < count - 1 // All but last are approved
    history.push({
      id: faker.string.uuid(),
      manual_id: manualId,
      revision_number: currentRevision,
      sub_revision: isApproved ? 0 : faker.number.float({ min: 0.1, max: 0.9, fractionDigits: 1 }),
      status: isApproved ? 'approved' : 'draft',
      created_by: faker.string.uuid(),
      created_at: faker.date.past().toISOString(),
      approved_by: isApproved ? faker.string.uuid() : null,
      approved_at: isApproved ? faker.date.past().toISOString() : null,
      effective_date: isApproved ? faker.date.past().toISOString() : null,
      changes_summary: faker.lorem.paragraph(),
      snapshot: {}, // Would contain full manual state
    })

    if (isApproved) {
      currentRevision++
    }
  }

  return history
}

// Generate audit log entries
export function generateAuditLog(count: number = 20) {
  const actions = ['create', 'update', 'delete', 'approve', 'reject', 'export']
  const entities = ['manual', 'chapter', 'user', 'revision', 'definition', 'abbreviation']

  return Array(count).fill(null).map(() => ({
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    action: faker.helpers.arrayElement(actions),
    entity_type: faker.helpers.arrayElement(entities),
    entity_id: faker.string.uuid(),
    changes: {
      before: faker.datatype.boolean() ? { field: faker.lorem.word() } : null,
      after: { field: faker.lorem.word() },
    },
    ip_address: faker.internet.ip(),
    user_agent: faker.internet.userAgent(),
    created_at: faker.date.recent().toISOString(),
  }))
}

// Helper to seed database with test data
export async function seedTestData(supabase: any) {
  // Create test users
  const users = [
    generateUser({ role: 'sysadmin', email: 'admin@heliairsweden.com' }),
    generateUser({ role: 'manager', email: 'manager1@heliairsweden.com' }),
    generateUser({ role: 'manager', email: 'manager2@heliairsweden.com' }),
  ]

  // Create test manuals
  const manuals = []
  for (let i = 0; i < 5; i++) {
    const { manual, chapters, content } = generateCompleteManual({
      chapterCount: faker.number.int({ min: 5, max: 15 }),
      maxDepth: 3,
      includeContent: true,
    })
    manuals.push({ manual, chapters, content })
  }

  // Create definitions and abbreviations
  const definitions = generateDefinitions(20)
  const abbreviations = generateAbbreviations(15)

  // Create audit logs
  const auditLogs = generateAuditLog(50)

  return {
    users,
    manuals,
    definitions,
    abbreviations,
    auditLogs,
  }
}

// Export test data for baseline comparisons
export function exportTestDataForBaseline() {
  const testData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: {
      smallManual: generateCompleteManual({ chapterCount: 5, maxDepth: 2 }),
      mediumManual: generateCompleteManual({ chapterCount: 50, maxDepth: 3 }),
      largeManual: generateCompleteManual({ chapterCount: 200, maxDepth: 4 }),
      definitions: generateDefinitions(50),
      abbreviations: generateAbbreviations(30),
    },
  }

  return testData
}

// Performance test helpers
export function generatePerformanceTestData() {
  return {
    manyManuals: Array(500).fill(null).map(() => generateManual()),
    deepHierarchy: generateCompleteManual({ chapterCount: 100, maxDepth: 5 }),
    manyRevisions: generateRevisionHistory(faker.string.uuid(), 100),
    largeAuditLog: generateAuditLog(10000),
  }
}

// Accessibility test data
export function generateA11yTestData() {
  return {
    highContrastContent: '<p style="color: #000; background: #fff;">High contrast text</p>',
    semanticStructure: `
      <article>
        <header><h1>Main Title</h1></header>
        <nav><ul><li><a href="#section1">Section 1</a></li></ul></nav>
        <main>
          <section id="section1">
            <h2>Section Title</h2>
            <p>Content with proper semantic markup.</p>
          </section>
        </main>
        <footer>Footer information</footer>
      </article>
    `,
    formWithLabels: `
      <form>
        <label for="title">Manual Title</label>
        <input id="title" type="text" required aria-describedby="title-help" />
        <span id="title-help">Enter a descriptive title for the manual</span>
      </form>
    `,
  }
}