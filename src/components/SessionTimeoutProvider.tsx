'use client'

import { useSessionTimeout } from '@/hooks/useSessionTimeout'

export default function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  useSessionTimeout()
  return <>{children}</>
}