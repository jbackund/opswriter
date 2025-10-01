import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { validateEnvironment, config } from '@/lib/config'

// Validate environment on startup
if (typeof window === 'undefined') {
  validateEnvironment()
}

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: `${config.appName} - Operational Manual Management`,
  description: 'Create, manage, and distribute operational manuals with full revision traceability for regulated organizations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>{children}</body>
    </html>
  )
}