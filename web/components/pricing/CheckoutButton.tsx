'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import type { PlanId } from '@/lib/pricing/data'

export default function CheckoutButton({ planId, label }: { planId: PlanId; label: string }) {
  const supabase = useSupabase()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const beginCheckout = async () => {
    setError(null)
    setStatus('loading')
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      setStatus('idle')
      router.push('/auth')
      return
    }
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ priceId: planId, mode: 'subscription' }),
    })
    const payload = await response.json()
    if (!response.ok) {
      setStatus('error')
      setError(payload.error || 'Unable to start checkout')
      return
    }
    window.location.href = payload.url
  }

  return (
    <>
      <button type="button" className="btn btn-primary" disabled={status === 'loading'} onClick={beginCheckout}>
        {status === 'loading' ? 'Redirecting…' : label}
      </button>
      {error && <p className="form-error">{error}</p>}
    </>
  )
}


