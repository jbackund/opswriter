import DOMPurify from 'isomorphic-dompurify'

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// SQL injection patterns to detect
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE|JOIN|ORDER\s+BY|GROUP\s+BY|HAVING|OR|AND|NOT|EXISTS|LIKE|IN|BETWEEN|IS\s+NULL|IS\s+NOT\s+NULL)\b)/gi,
  /(--|\/\*|\*\/|;|\||\\x00|\\x1a|\\x08|\\x09|\\x0a|\\x0d|\\x1b|\\x22|\\x25|\\x27|\\x5c|\\x5f)/gi,
]

// XSS patterns to detect
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<embed[^>]*>/gi,
  /<object[^>]*>/gi,
]

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\\/g,
  /%2e%2e%2f/gi,
  /%252e%252e%252f/gi,
]

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''

  // Configure DOMPurify
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'blockquote',
      'ul', 'ol', 'li', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code', 'span', 'div'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
      'width', 'height', 'colspan', 'rowspan', 'style'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
    ADD_TAGS: ['iframe'], // Allow iframes but sanitize
    ADD_ATTR: ['allowfullscreen', 'frameborder'],
  }

  return DOMPurify.sanitize(html, config)
}

/**
 * Validate email format and domain
 */
export function validateEmail(email: string, allowedDomain?: string): boolean {
  if (!email || typeof email !== 'string') return false

  // Check basic email format
  if (!EMAIL_REGEX.test(email)) return false

  // Check for allowed domain if specified
  if (allowedDomain) {
    const domain = email.split('@')[1]
    if (domain !== allowedDomain) return false
  }

  return true
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '')

  // Trim whitespace
  sanitized = sanitized.trim()

  // Escape special characters for SQL
  sanitized = sanitized
    .replace(/'/g, "''")
    .replace(/"/g, '""')
    .replace(/\\/g, '\\\\')

  return sanitized
}

/**
 * Check if input contains potential SQL injection
 */
export function detectSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      console.warn('Potential SQL injection detected:', input)
      return true
    }
  }

  return false
}

/**
 * Check if input contains potential XSS
 */
export function detectXSS(input: string): boolean {
  if (!input || typeof input !== 'string') return false

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      console.warn('Potential XSS detected:', input)
      return true
    }
  }

  return false
}

/**
 * Check if path contains traversal attempts
 */
export function detectPathTraversal(path: string): boolean {
  if (!path || typeof path !== 'string') return false

  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(path)) {
      console.warn('Potential path traversal detected:', path)
      return true
    }
  }

  return false
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate and sanitize file names
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return ''

  // Remove path components
  let sanitized = fileName.split(/[/\\]/).pop() || ''

  // Remove special characters except dots, dashes, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Ensure it doesn't start with a dot (hidden file)
  sanitized = sanitized.replace(/^\.+/, '')

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop()
    const name = sanitized.substring(0, 240)
    sanitized = ext ? `${name}.${ext}` : name
  }

  return sanitized
}

/**
 * Validate manual title
 */
export function validateManualTitle(title: string): { valid: boolean; error?: string } {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required' }
  }

  if (title.length < 3) {
    return { valid: false, error: 'Title must be at least 3 characters' }
  }

  if (title.length > 200) {
    return { valid: false, error: 'Title must be less than 200 characters' }
  }

  if (detectXSS(title) || detectSQLInjection(title)) {
    return { valid: false, error: 'Title contains invalid characters' }
  }

  return { valid: true }
}

/**
 * Validate manual code
 */
export function validateManualCode(code: string): { valid: boolean; error?: string } {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Manual code is required' }
  }

  // Allow only alphanumeric, dashes, underscores
  const codeRegex = /^[A-Z0-9_-]{3,50}$/
  if (!codeRegex.test(code)) {
    return {
      valid: false,
      error: 'Manual code must be 3-50 characters, uppercase letters, numbers, dashes, and underscores only',
    }
  }

  return { valid: true }
}

/**
 * Validate export type
 */
export function validateExportType(type: string): boolean {
  const validTypes = ['clean', 'watermarked', 'diff']
  return validTypes.includes(type)
}

/**
 * Create a content validator for API requests
 */
export function createContentValidator(rules: Record<string, any>) {
  return (data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field]

      // Check required fields
      if (rule.required && !value) {
        errors.push(`${field} is required`)
        continue
      }

      // Skip optional empty fields
      if (!rule.required && !value) continue

      // Check type
      if (rule.type && typeof value !== rule.type) {
        errors.push(`${field} must be a ${rule.type}`)
        continue
      }

      // Check length
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`)
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must be less than ${rule.maxLength} characters`)
      }

      // Check pattern
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${field} format is invalid`)
      }

      // Check custom validator
      if (rule.validator) {
        const result = rule.validator(value)
        if (!result.valid) {
          errors.push(result.error || `${field} is invalid`)
        }
      }

      // Check for injection attacks
      if (rule.sanitize !== false) {
        if (detectSQLInjection(value) || detectXSS(value)) {
          errors.push(`${field} contains invalid characters`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// Export validators for common API requests
export const validators = {
  createManual: createContentValidator({
    title: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 200,
      validator: validateManualTitle,
    },
    manual_code: {
      required: true,
      type: 'string',
      validator: validateManualCode,
    },
    description: {
      required: false,
      type: 'string',
      maxLength: 1000,
    },
    organization_name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100,
    },
  }),

  updateChapter: createContentValidator({
    heading: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 500,
    },
    content: {
      required: false,
      type: 'string',
      sanitize: false, // Will be sanitized separately with DOMPurify
    },
    page_break: {
      required: false,
      type: 'boolean',
    },
  }),

  exportRequest: createContentValidator({
    exportType: {
      required: true,
      type: 'string',
      validator: (value: string) => ({
        valid: validateExportType(value),
        error: 'Invalid export type',
      }),
    },
    includeWatermark: {
      required: false,
      type: 'boolean',
    },
  }),
}