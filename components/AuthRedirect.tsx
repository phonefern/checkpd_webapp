'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/app/providers/SessionProvider'

export default function AuthRedirect() {
  const router = useRouter()
  const { session, loading } = useSession()

  useEffect(() => {
    if (!loading && !session) {
      router.push('/pages/login')
    }
  }, [loading, router, session])

  return null
}
