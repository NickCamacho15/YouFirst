'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'

type EntitlementResponse = {
  isActive: boolean
  subscription: {
    status: string
    plan_id: string
    current_period_end: string | null
  } | null
}

export default function StatusPoller() {
  const supabase = useSupabase()
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'active' | 'waiting' | 'error'>('checking')
  const [message, setMessage] = useState('Confirming your subscription…')

  useEffect(() => {
    let cancelled = false
    let interval: NodeJS.Timeout

    const poll = async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        router.push('/auth')
        return
      }
      const response = await fetch('/api/entitlements', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        setState('error')
        setMessage('We could not verify your subscription. Please refresh or contact support.')
        return
      }
      const payload = (await response.json()) as EntitlementResponse
      if (payload.isActive) {
        setState('active')
        setMessage('All set! You can now sign in on mobile.')
        clearInterval(interval)
      } else if (!cancelled) {
        setState('waiting')
        setMessage('Stripe confirmed payment. Waiting for webhook to mark Supabase active…')
      }
    }

    poll()
    interval = setInterval(poll, 4000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [router, supabase])

  return (
    <div className={`status-chip ${state === 'error' ? 'error' : ''}`} style={{ marginTop: '1rem' }}>
      <span />
      {message}
    </div>
  )
}


