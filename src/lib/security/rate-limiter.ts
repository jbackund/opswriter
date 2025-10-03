import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number    // Maximum requests per window
  identifier?: (req: NextRequest) => string  // Function to identify client
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limit tracking
// In production, use Redis or a similar solution
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

export class RateLimiter {
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      identifier: config.identifier || this.defaultIdentifier,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
    }
  }

  private defaultIdentifier(req: NextRequest): string {
    // Try to get IP from various headers
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Combine with user ID if authenticated
    const userId = req.headers.get('x-user-id') || 'anonymous'

    return `${ip}:${userId}`
  }

  async checkLimit(req: NextRequest): Promise<{
    allowed: boolean
    limit: number
    remaining: number
    resetTime: number
  }> {
    const identifier = this.config.identifier(req)
    const now = Date.now()
    const windowStart = now
    const windowEnd = now + this.config.windowMs

    let entry = rateLimitStore.get(identifier)

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: windowEnd,
      }
      rateLimitStore.set(identifier, entry)
    }

    const allowed = entry.count < this.config.maxRequests
    const remaining = Math.max(0, this.config.maxRequests - entry.count - 1)

    if (allowed) {
      entry.count++
    }

    return {
      allowed,
      limit: this.config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
    }
  }

  middleware() {
    return async (req: NextRequest) => {
      const result = await this.checkLimit(req)

      // Add rate limit headers
      const headers = new Headers()
      headers.set('X-RateLimit-Limit', result.limit.toString())
      headers.set('X-RateLimit-Remaining', result.remaining.toString())
      headers.set('X-RateLimit-Reset', result.resetTime.toString())

      if (!result.allowed) {
        headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString())

        return new Response(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: result.resetTime,
          }),
          {
            status: 429,
            headers,
          }
        )
      }

      return null // Continue to next middleware
    }
  }
}

// Pre-configured rate limiters for different scenarios
export const rateLimiters = {
  // General API rate limit: 100 requests per minute
  api: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),

  // Strict limit for authentication: 5 attempts per 15 minutes
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  }),

  // Export operations: 10 per hour
  export: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  }),

  // Search operations: 30 per minute
  search: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
  }),

  // Write operations: 30 per minute
  write: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
  }),
}

// Helper function to apply rate limiting to API routes
export async function withRateLimit(
  req: NextRequest,
  limiter: RateLimiter = rateLimiters.api
): Promise<Response | null> {
  return limiter.middleware()(req)
}