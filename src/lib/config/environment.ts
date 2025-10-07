/**
 * Environment-specific configuration for OpsWriter
 */

export type Environment = 'development' | 'preview' | 'production'

interface EnvironmentConfig {
  environment: Environment
  appName: string
  appUrl: string
  supabase: {
    url: string
    anonKey: string
    serviceRoleKey?: string
  }
  features: {
    enableDebugMode: boolean
    enableMockData: boolean
    enableAnalytics: boolean
    enableSentry: boolean
  }
  session: {
    timeoutMinutes: number
    warningMinutes: number
  }
  export: {
    maxFileSizeMB: number
    retentionDays: number
    cacheDurationSeconds: number
  }
  storage: {
    maxAttachmentSizeMB: number
    maxLogoSizeMB: number
  }
  email: {
    fromAddress: string
    fromName: string
    resendApiKey?: string
  }
  sentry?: {
    dsn: string
    tracesSampleRate: number
  }
}

const getEnvironment = (): Environment => {
  const vercelEnv = process.env.VERCEL_ENV

  if (vercelEnv === 'production') return 'production'
  if (vercelEnv === 'preview') return 'preview'

  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

const environment = getEnvironment()

// Base configuration shared across all environments
const baseConfig: Partial<EnvironmentConfig> = {
  appName: 'OpsWriter',
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  storage: {
    maxAttachmentSizeMB: 50,
    maxLogoSizeMB: 5,
  },
}

// Development configuration
const developmentConfig: EnvironmentConfig = {
  ...baseConfig,
  environment: 'development',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  features: {
    enableDebugMode: true,
    enableMockData: true,
    enableAnalytics: false,
    enableSentry: false,
  },
  session: {
    timeoutMinutes: 120,
    warningMinutes: 5,
  },
  export: {
    maxFileSizeMB: 100,
    retentionDays: 7,
    cacheDurationSeconds: 60,
  },
  email: {
    fromAddress: 'dev@notifications.heliairsweden.com',
    fromName: 'OpsWriter Dev',
    resendApiKey: process.env.RESEND_API_KEY,
  },
} as EnvironmentConfig

// Preview/Staging configuration
const previewConfig: EnvironmentConfig = {
  ...baseConfig,
  environment: 'preview',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000',
  features: {
    enableDebugMode: true,
    enableMockData: false,
    enableAnalytics: true,
    enableSentry: true,
  },
  session: {
    timeoutMinutes: 120,
    warningMinutes: 5,
  },
  export: {
    maxFileSizeMB: 100,
    retentionDays: 15,
    cacheDurationSeconds: 300,
  },
  email: {
    fromAddress: 'preview@notifications.heliairsweden.com',
    fromName: 'OpsWriter Preview',
    resendApiKey: process.env.RESEND_API_KEY,
  },
  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    tracesSampleRate: 0.5,
  },
} as EnvironmentConfig

// Production configuration
const productionConfig: EnvironmentConfig = {
  ...baseConfig,
  environment: 'production',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://opswriter.heliairsweden.com',
  features: {
    enableDebugMode: false,
    enableMockData: false,
    enableAnalytics: true,
    enableSentry: true,
  },
  session: {
    timeoutMinutes: 120,
    warningMinutes: 5,
  },
  export: {
    maxFileSizeMB: 100,
    retentionDays: 30,
    cacheDurationSeconds: 3600,
  },
  email: {
    fromAddress: 'noreply@notifications.heliairsweden.com',
    fromName: 'OpsWriter',
    resendApiKey: process.env.RESEND_API_KEY,
  },
  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    tracesSampleRate: 0.1,
  },
} as EnvironmentConfig

// Select configuration based on environment
const configs: Record<Environment, EnvironmentConfig> = {
  development: developmentConfig,
  preview: previewConfig,
  production: productionConfig,
}

export const config = configs[environment]

// Export individual config sections for convenience
export const { features, session, storage, email } = config

// Helper functions
export const isDevelopment = () => environment === 'development'
export const isPreview = () => environment === 'preview'
export const isProduction = () => environment === 'production'
export const isDebugMode = () => config.features.enableDebugMode

// Validation function to ensure critical env vars are set
export const validateEnvironment = () => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }

  // Warn about missing optional vars in production
  if (isProduction()) {
    const optional = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'RESEND_API_KEY',
      'NEXT_PUBLIC_SENTRY_DSN',
    ]

    const missingOptional = optional.filter(key => !process.env[key])

    if (missingOptional.length > 0) {
      console.warn(
        `Warning: Missing optional environment variables in production: ${missingOptional.join(', ')}`
      )
    }
  }
}

// Log current environment on startup (only in development)
if (isDevelopment()) {
  console.log(`🚀 OpsWriter running in ${environment} mode`)
  console.log(`📍 App URL: ${config.appUrl}`)
  console.log(`🔒 Session timeout: ${config.session.timeoutMinutes} minutes`)
}
