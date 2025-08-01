'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthRedirect() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      console.debug('Checking session in AuthRedirect')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.debug('No session found, redirecting to /login')
        router.push('/login')
      }
    }

    checkSession()
  }, [router])

  return null
}
