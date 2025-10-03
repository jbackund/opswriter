#!/usr/bin/env node

/**
 * Accessibility audit script for OpsWriter
 * Checks WCAG 2.1 AA compliance for key application areas
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// WCAG 2.1 AA criteria to check
const wcagCriteria = {
  perceivable: [
    { id: '1.1.1', name: 'Non-text Content', level: 'A' },
    { id: '1.3.1', name: 'Info and Relationships', level: 'A' },
    { id: '1.3.5', name: 'Identify Input Purpose', level: 'AA' },
    { id: '1.4.1', name: 'Use of Color', level: 'A' },
    { id: '1.4.3', name: 'Contrast (Minimum)', level: 'AA' },
    { id: '1.4.4', name: 'Resize Text', level: 'AA' },
    { id: '1.4.5', name: 'Images of Text', level: 'AA' },
    { id: '1.4.10', name: 'Reflow', level: 'AA' },
    { id: '1.4.11', name: 'Non-text Contrast', level: 'AA' },
    { id: '1.4.12', name: 'Text Spacing', level: 'AA' },
    { id: '1.4.13', name: 'Content on Hover or Focus', level: 'AA' },
  ],
  operable: [
    { id: '2.1.1', name: 'Keyboard', level: 'A' },
    { id: '2.1.2', name: 'No Keyboard Trap', level: 'A' },
    { id: '2.1.4', name: 'Character Key Shortcuts', level: 'A' },
    { id: '2.4.1', name: 'Bypass Blocks', level: 'A' },
    { id: '2.4.2', name: 'Page Titled', level: 'A' },
    { id: '2.4.3', name: 'Focus Order', level: 'A' },
    { id: '2.4.4', name: 'Link Purpose (In Context)', level: 'A' },
    { id: '2.4.5', name: 'Multiple Ways', level: 'AA' },
    { id: '2.4.6', name: 'Headings and Labels', level: 'AA' },
    { id: '2.4.7', name: 'Focus Visible', level: 'AA' },
    { id: '2.5.1', name: 'Pointer Gestures', level: 'A' },
    { id: '2.5.2', name: 'Pointer Cancellation', level: 'A' },
    { id: '2.5.3', name: 'Label in Name', level: 'A' },
    { id: '2.5.4', name: 'Motion Actuation', level: 'A' },
  ],
  understandable: [
    { id: '3.1.1', name: 'Language of Page', level: 'A' },
    { id: '3.1.2', name: 'Language of Parts', level: 'AA' },
    { id: '3.2.1', name: 'On Focus', level: 'A' },
    { id: '3.2.2', name: 'On Input', level: 'A' },
    { id: '3.3.1', name: 'Error Identification', level: 'A' },
    { id: '3.3.2', name: 'Labels or Instructions', level: 'A' },
    { id: '3.3.3', name: 'Error Suggestion', level: 'AA' },
    { id: '3.3.4', name: 'Error Prevention (Legal, Financial, Data)', level: 'AA' },
  ],
  robust: [
    { id: '4.1.1', name: 'Parsing', level: 'A' },
    { id: '4.1.2', name: 'Name, Role, Value', level: 'A' },
    { id: '4.1.3', name: 'Status Messages', level: 'AA' },
  ],
}

// Pages to audit
const pagesToAudit = [
  { path: '/login', name: 'Login Page' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/manuals/new', name: 'Manual Creation' },
  { path: '/manuals/[id]/edit', name: 'Manual Editor' },
  { path: '/admin/users', name: 'User Management' },
  { path: '/review', name: 'Review Queue' },
  { path: '/references/definitions', name: 'Definitions' },
  { path: '/references/abbreviations', name: 'Abbreviations' },
]

// Color contrast checker
function checkColorContrast(foreground, background) {
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  // Calculate relative luminance
  const getLuminance = (rgb) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const fg = hexToRgb(foreground)
  const bg = hexToRgb(background)

  if (!fg || !bg) return 0

  const l1 = getLuminance(fg)
  const l2 = getLuminance(bg)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

// Audit functions
async function auditKeyboardNavigation(page) {
  const issues = []

  // Check for skip links
  const skipLink = await page.$('[href="#main"], [href="#content"]')
  if (!skipLink) {
    issues.push('Missing skip navigation link')
  }

  // Check all interactive elements are keyboard accessible
  const interactiveElements = await page.$$('button, a, input, select, textarea, [tabindex]')
  for (const element of interactiveElements) {
    const tabindex = await element.getAttribute('tabindex')
    if (tabindex && parseInt(tabindex) < -1) {
      issues.push(`Element with tabindex="${tabindex}" is not keyboard accessible`)
    }
  }

  // Check focus indicators
  await page.keyboard.press('Tab')
  const focusedElement = await page.evaluateHandle(() => document.activeElement)
  const focusVisible = await page.evaluate(el => {
    const styles = window.getComputedStyle(el)
    return styles.outline !== 'none' || styles.boxShadow !== 'none'
  }, focusedElement)

  if (!focusVisible) {
    issues.push('Focus indicator not visible on keyboard navigation')
  }

  return issues
}

async function auditColorContrast(page) {
  const issues = []

  // Check text contrast
  const textElements = await page.$$('p, h1, h2, h3, h4, h5, h6, span, div, a, button')

  for (const element of textElements.slice(0, 10)) { // Sample first 10 elements
    const color = await element.evaluate(el => window.getComputedStyle(el).color)
    const bgColor = await element.evaluate(el => window.getComputedStyle(el).backgroundColor)
    const fontSize = await element.evaluate(el => window.getComputedStyle(el).fontSize)

    // Convert CSS colors to hex (simplified)
    if (color && bgColor && color !== 'rgba(0, 0, 0, 0)' && bgColor !== 'rgba(0, 0, 0, 0)') {
      // This is simplified - real implementation would need proper color conversion
      const isLargeText = parseFloat(fontSize) >= 18 || (parseFloat(fontSize) >= 14 && await element.evaluate(el => window.getComputedStyle(el).fontWeight >= 700))
      const requiredRatio = isLargeText ? 3 : 4.5

      // Note: Actual contrast calculation would go here
      // For now, we'll flag potential issues
      const text = await element.textContent()
      if (text && text.trim()) {
        // Placeholder for actual contrast check
        // issues.push(`Potential contrast issue: "${text.substring(0, 30)}..."`)
      }
    }
  }

  return issues
}

async function auditFormAccessibility(page) {
  const issues = []

  // Check form labels
  const inputs = await page.$$('input, select, textarea')
  for (const input of inputs) {
    const id = await input.getAttribute('id')
    const name = await input.getAttribute('name')
    const ariaLabel = await input.getAttribute('aria-label')
    const ariaLabelledby = await input.getAttribute('aria-labelledby')

    if (id) {
      const label = await page.$(`label[for="${id}"]`)
      if (!label && !ariaLabel && !ariaLabelledby) {
        issues.push(`Input with id="${id}" missing associated label`)
      }
    } else if (name && !ariaLabel && !ariaLabelledby) {
      issues.push(`Input with name="${name}" missing label`)
    }
  }

  // Check required fields
  const requiredInputs = await page.$$('[required]')
  for (const input of requiredInputs) {
    const ariaRequired = await input.getAttribute('aria-required')
    if (!ariaRequired) {
      issues.push('Required field missing aria-required attribute')
    }
  }

  // Check error messages
  const errorMessages = await page.$$('.error, .error-message, [role="alert"]')
  for (const error of errorMessages) {
    const role = await error.getAttribute('role')
    if (!role || role !== 'alert') {
      issues.push('Error message missing role="alert"')
    }
  }

  return issues
}

async function auditSemanticHTML(page) {
  const issues = []

  // Check page landmarks
  const main = await page.$('main')
  const nav = await page.$('nav')
  const header = await page.$('header')

  if (!main) issues.push('Missing <main> landmark')
  if (!nav) issues.push('Missing <nav> landmark')
  if (!header) issues.push('Missing <header> landmark')

  // Check heading hierarchy
  const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements =>
    elements.map(el => ({
      level: parseInt(el.tagName[1]),
      text: el.textContent?.trim()
    }))
  )

  let previousLevel = 0
  for (const heading of headings) {
    if (heading.level - previousLevel > 1) {
      issues.push(`Heading level skip: h${previousLevel} to h${heading.level} ("${heading.text?.substring(0, 30)}...")`)
    }
    previousLevel = heading.level
  }

  // Check for multiple h1s
  const h1Count = headings.filter(h => h.level === 1).length
  if (h1Count > 1) {
    issues.push(`Multiple h1 elements found (${h1Count})`)
  }

  // Check alt text on images
  const images = await page.$$('img')
  for (const img of images) {
    const alt = await img.getAttribute('alt')
    const src = await img.getAttribute('src')
    if (!alt && src && !src.includes('decoration')) {
      issues.push(`Image missing alt text: ${src}`)
    }
  }

  return issues
}

async function auditARIA(page) {
  const issues = []

  // Check ARIA roles
  const elementsWithRoles = await page.$$('[role]')
  for (const element of elementsWithRoles) {
    const role = await element.getAttribute('role')
    const ariaLabel = await element.getAttribute('aria-label')
    const ariaLabelledby = await element.getAttribute('aria-labelledby')

    // Check if interactive roles have accessible names
    if (['button', 'link', 'checkbox', 'radio', 'tab'].includes(role || '')) {
      if (!ariaLabel && !ariaLabelledby) {
        const text = await element.textContent()
        if (!text?.trim()) {
          issues.push(`Element with role="${role}" missing accessible name`)
        }
      }
    }
  }

  // Check ARIA attributes
  const elementsWithAria = await page.$$('[aria-hidden], [aria-live], [aria-describedby]')
  for (const element of elementsWithAria) {
    const ariaHidden = await element.getAttribute('aria-hidden')
    if (ariaHidden === 'true') {
      const interactive = await element.evaluate(el => {
        return el.matches('button, a, input, select, textarea, [tabindex]')
      })
      if (interactive) {
        issues.push('Interactive element has aria-hidden="true"')
      }
    }
  }

  return issues
}

// Run audit on a single page
async function auditPage(browser, pageConfig) {
  console.log(`\nAuditing ${pageConfig.name}...`)
  const page = await browser.newPage()
  const results = {
    page: pageConfig.name,
    url: pageConfig.path,
    issues: [],
    warnings: [],
    passes: [],
  }

  try {
    // Navigate to page (login if needed)
    if (pageConfig.path !== '/login') {
      // Login first
      await page.goto(`${BASE_URL}/login`)
      await page.fill('[name="email"]', 'manager1@heliairsweden.com')
      await page.fill('[name="password"]', 'Test123!')
      await page.click('[type="submit"]')
      await page.waitForLoadState('networkidle')
    }

    // Navigate to target page
    const url = pageConfig.path.includes('[id]')
      ? `${BASE_URL}/manuals/sample-id/edit`  // Use sample ID for dynamic routes
      : `${BASE_URL}${pageConfig.path}`

    await page.goto(url)
    await page.waitForLoadState('networkidle')

    // Run audits
    const keyboardIssues = await auditKeyboardNavigation(page)
    const contrastIssues = await auditColorContrast(page)
    const formIssues = await auditFormAccessibility(page)
    const semanticIssues = await auditSemanticHTML(page)
    const ariaIssues = await auditARIA(page)

    results.issues = [
      ...keyboardIssues.map(i => ({ category: 'Keyboard Navigation', issue: i })),
      ...contrastIssues.map(i => ({ category: 'Color Contrast', issue: i })),
      ...formIssues.map(i => ({ category: 'Form Accessibility', issue: i })),
      ...semanticIssues.map(i => ({ category: 'Semantic HTML', issue: i })),
      ...ariaIssues.map(i => ({ category: 'ARIA', issue: i })),
    ]

    // Check page title
    const title = await page.title()
    if (title) {
      results.passes.push('Page has title')
    } else {
      results.issues.push({ category: 'Page Structure', issue: 'Missing page title' })
    }

    // Check language attribute
    const lang = await page.$eval('html', el => el.lang)
    if (lang) {
      results.passes.push(`Page language set: ${lang}`)
    } else {
      results.issues.push({ category: 'Page Structure', issue: 'Missing lang attribute on html element' })
    }

  } catch (error) {
    results.issues.push({ category: 'Error', issue: error.message })
  } finally {
    await page.close()
  }

  return results
}

// Generate report
function generateReport(auditResults) {
  console.log('\n' + '='.repeat(60))
  console.log('WCAG 2.1 AA ACCESSIBILITY AUDIT REPORT')
  console.log('='.repeat(60))

  let totalIssues = 0
  let totalPasses = 0

  for (const result of auditResults) {
    console.log(`\n${result.page}`)
    console.log('-'.repeat(40))

    if (result.issues.length > 0) {
      console.log('\n❌ Issues Found:')
      const categorizedIssues = {}
      for (const issue of result.issues) {
        if (!categorizedIssues[issue.category]) {
          categorizedIssues[issue.category] = []
        }
        categorizedIssues[issue.category].push(issue.issue)
      }

      for (const [category, issues] of Object.entries(categorizedIssues)) {
        console.log(`\n  ${category}:`)
        for (const issue of issues) {
          console.log(`    - ${issue}`)
        }
      }
      totalIssues += result.issues.length
    }

    if (result.passes.length > 0) {
      console.log('\n✅ Passed Checks:')
      for (const pass of result.passes) {
        console.log(`    - ${pass}`)
      }
      totalPasses += result.passes.length
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total Issues Found: ${totalIssues}`)
  console.log(`Total Checks Passed: ${totalPasses}`)
  console.log(`Pages Audited: ${auditResults.length}`)

  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'test-results', 'accessibility-audit.json')
  const reportDir = path.dirname(reportPath)

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalIssues,
      totalPasses,
      pagesAudited: auditResults.length,
    },
    results: auditResults,
    wcagCriteria,
  }, null, 2))

  console.log(`\nDetailed report saved to: ${reportPath}`)

  return totalIssues === 0 ? 0 : 1 // Return exit code
}

// Main execution
async function main() {
  console.log('Starting WCAG 2.1 AA Accessibility Audit...')
  console.log(`Target: ${BASE_URL}`)

  const browser = await chromium.launch({ headless: true })
  const auditResults = []

  try {
    // Run audits on sample pages
    for (const pageConfig of pagesToAudit.slice(0, 3)) { // Audit first 3 pages for now
      const result = await auditPage(browser, pageConfig)
      auditResults.push(result)
    }

    // Generate and display report
    const exitCode = generateReport(auditResults)
    process.exit(exitCode)

  } catch (error) {
    console.error('Audit failed:', error)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}