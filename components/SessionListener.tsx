'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SessionListener() {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session)
      if (event === 'SIGNED_IN') {
        router.refresh() // Trigger middleware revalidation
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return null
}