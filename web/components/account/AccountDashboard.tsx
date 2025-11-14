'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'

type SubscriptionRow = {
  plan_id: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean | null
}

type ApiResponse = {
  isActive: boolean
  subscription: SubscriptionRow | null
}

export default function AccountDashboard() {
  const supabase = useSupabase()
  const router = useRouter()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (!token) {
      router.push('/auth')
      return
    }
    const response = await fetch('/api/entitlements', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      setError('Unable to load subscription. Please refresh.')
      setLoading(false)
      return
    }
    const payload = (await response.json()) as ApiResponse
    setData(payload)
    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const openPortal = async () => {
    setPortalLoading(true)
    setError(null)
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (!token) {
      router.push('/auth')
      return
    }
    const response = await fetch('/api/portal', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const payload = await response.json()
    if (!response.ok) {
      setError(payload.error || 'Unable to open billing portal.')
      setPortalLoading(false)
      return
    }
    window.location.href = payload.url
  }

  if (loading) {
    return (
      <div className="glass-panel">
        <p>Loading subscription…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel">
        <p className="form-error">{error}</p>
        <button className="btn btn-primary" onClick={loadStatus}>
          Retry
        </button>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className={`status-chip ${data.isActive ? '' : 'error'}`}>
            {data.isActive ? 'Active' : 'Inactive'}
          </span>
          <h2 style={{ marginBottom: 0 }}>
            {data.subscription?.plan_id ? data.subscription.plan_id.toUpperCase() : 'No plan yet'}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Status: {data.subscription?.status ?? 'pending'}
            {data.subscription?.cancel_at_period_end && ' • Cancels at period end'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={loadStatus}>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={openPortal} disabled={portalLoading}>
            {portalLoading ? 'Opening…' : 'Manage billing'}
          </button>
        </div>
      </div>
      <div className="account-status">
        <div className="status-tile">
          <h4>Current period end</h4>
          <p style={{ color: 'var(--text-muted)' }}>
            {data.subscription?.current_period_end
              ? new Date(data.subscription.current_period_end).toLocaleString()
              : 'Pending activation'}
          </p>
        </div>
        <div className="status-tile">
          <h4>Mobile access</h4>
          <p style={{ color: 'var(--text-muted)' }}>
            {data.isActive ? 'Sign into the iOS app and your routines unlock automatically.' : 'Complete checkout to unlock premium features.'}
          </p>
        </div>
      </div>
    </div>
  )
}


