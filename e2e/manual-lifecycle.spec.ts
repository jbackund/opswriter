import { test, expect } from '@playwright/test'

test.describe('Manual Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[name="email"]', 'manager1@heliairsweden.com')
    await page.fill('[name="password"]', 'Test123!')
    await page.click('[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should create a new manual with required metadata', async ({ page }) => {
    // Navigate to manual creation
    await page.goto('/dashboard')
    await page.click('text=New Manual')

    // Fill in manual metadata
    await page.fill('[name="title"]', 'Test Operations Manual')
    await page.fill('[name="description"]', 'This is a test manual for E2E testing')
    await page.selectOption('[name="language"]', 'en')
    await page.fill('[name="reference_number"]', 'REF-TEST-001')
    await page.fill('[name="document_code"]', 'DOC-E2E-001')

    // Submit the form
    await page.click('text=Create Manual')

    // Verify manual was created
    await expect(page).toHaveURL(/\/manuals\/[a-f0-9-]+/)
    await expect(page.locator('h1')).toContainText('Test Operations Manual')

    // Verify Chapter 0 exists
    await expect(page.locator('text=Chapter 0: Record of Revision')).toBeVisible()
  })

  test('should add chapters and maintain hierarchy', async ({ page }) => {
    // Navigate to existing manual
    await page.goto('/dashboard')
    await page.click('text=Test Operations Manual')

    // Add main chapter
    await page.click('text=Add Chapter')
    await page.fill('[name="heading"]', 'Safety Procedures')
    await page.click('text=Save Chapter')

    // Verify chapter was added
    await expect(page.locator('text=Chapter 1: Safety Procedures')).toBeVisible()

    // Add sub-chapter
    await page.click('text=Chapter 1: Safety Procedures')
    await page.click('text=Add Sub-chapter')
    await page.fill('[name="heading"]', 'Emergency Protocols')
    await page.click('text=Save Chapter')

    // Verify hierarchy
    await expect(page.locator('text=1.1 Emergency Protocols')).toBeVisible()
  })

  test('should autosave content changes', async ({ page }) => {
    // Navigate to manual editor
    await page.goto('/dashboard')
    await page.click('text=Test Operations Manual')
    await page.click('text=Chapter 1: Safety Procedures')

    // Edit content
    const editor = page.locator('[data-testid="rich-text-editor"]')
    await editor.click()
    await editor.type('This is important safety information.')

    // Wait for autosave (should be within 30 seconds)
    await page.waitForSelector('text=Saved', { timeout: 30000 })

    // Refresh page and verify content persisted
    await page.reload()
    await expect(editor).toContainText('This is important safety information.')
  })

  test('should send manual for review and lock editing', async ({ page }) => {
    // Navigate to manual
    await page.goto('/dashboard')
    await page.click('text=Test Operations Manual')

    // Send for review
    await page.click('text=Send in Review')
    await page.click('text=Confirm')

    // Verify status changed
    await expect(page.locator('[data-testid="manual-status"]')).toContainText('In Review')

    // Verify editing is locked
    const editor = page.locator('[data-testid="rich-text-editor"]')
    await expect(editor).toBeDisabled()

    // Verify add chapter button is disabled
    await expect(page.locator('text=Add Chapter')).toBeDisabled()
  })

  test('should approve manual and increment revision', async ({ page }) => {
    // Login as authority user
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@heliairsweden.com')
    await page.fill('[name="password"]', 'Admin123!')
    await page.click('[type="submit"]')

    // Navigate to review queue
    await page.goto('/review')
    await page.click('text=Test Operations Manual')

    // Approve manual
    await page.click('text=Approve')
    await page.fill('[name="effective_date"]', '2025-01-01')
    await page.fill('[name="comments"]', 'Approved for production use')
    await page.click('text=Confirm Approval')

    // Verify revision incremented
    await expect(page.locator('[data-testid="revision-number"]')).toContainText('1')
    await expect(page.locator('[data-testid="manual-status"]')).toContainText('Approved')
  })

  test('should export manual as PDF', async ({ page }) => {
    // Navigate to approved manual
    await page.goto('/dashboard')
    await page.click('text=Test Operations Manual')

    // Start PDF export
    const downloadPromise = page.waitForEvent('download')
    await page.click('text=Export PDF')
    await page.selectOption('[name="export_type"]', 'approved')
    await page.click('text=Generate PDF')

    // Wait for download
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toContain('Test_Operations_Manual')
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('should show revision history with changes', async ({ page }) => {
    // Navigate to manual
    await page.goto('/dashboard')
    await page.click('text=Test Operations Manual')

    // Open revision history
    await page.click('text=History')

    // Verify revision entries
    await expect(page.locator('[data-testid="revision-entry"]')).toHaveCount(2) // Draft and approved

    // View diff for a revision
    await page.click('[data-testid="revision-entry"] >> text=View Changes')

    // Verify diff viewer shows changes
    await expect(page.locator('[data-testid="diff-viewer"]')).toBeVisible()
    await expect(page.locator('.diff-addition')).toBeVisible()
  })

  test('should enforce domain restrictions on user creation', async ({ page }) => {
    // Login as SysAdmin
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@heliairsweden.com')
    await page.fill('[name="password"]', 'Admin123!')
    await page.click('[type="submit"]')

    // Navigate to user management
    await page.goto('/admin/users')
    await page.click('text=Invite User')

    // Try to invite user with wrong domain
    await page.fill('[name="email"]', 'user@wrongdomain.com')
    await page.selectOption('[name="role"]', 'manager')
    await page.click('text=Send Invitation')

    // Verify error message
    await expect(page.locator('.error-message')).toContainText('Only @heliairsweden.com email addresses are allowed')

    // Try with correct domain
    await page.fill('[name="email"]', 'newuser@heliairsweden.com')
    await page.click('text=Send Invitation')

    // Verify success
    await expect(page.locator('.success-message')).toContainText('Invitation sent successfully')
  })
})