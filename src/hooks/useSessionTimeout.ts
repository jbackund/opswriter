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
  const supabase = createClient()

  const resetTimeout = () => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      // Sign out the user
      await supabase.auth.signOut()

      // Redirect to login with timeout message
      router.push('/login?message=Session expired due to inactivity')
    }, SESSION_TIMEOUT)
  }

  useEffect(() => {
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
  }, [])
}