'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { session } from '@/lib/config'

// Get timeout from environment config
const SESSION_TIMEOUT = session.timeoutMinutes * 60 * 1000

export function useSessionTimeout() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    const supabaseClient = createClient()

    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(async () => {
        await supabaseClient.auth.signOut()
        router.push('/login?message=Session expired due to inactivity')
      }, SESSION_TIMEOUT)
    }

    // Events that should reset the timeout
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    // Reset timeout on any activity
    const handleActivity = () => {
      resetTimeout()
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Initialize timeout
    resetTimeout()

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [router])
}
