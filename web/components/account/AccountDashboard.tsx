'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { PRICING_PLANS } from '@/lib/pricing/data'

type SubscriptionRow = {
  plan_id: string
  price_id?: string
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

  // Move hooks before conditional returns to comply with Rules of Hooks
  const planMeta = useMemo(() => {
    if (!data?.subscription?.plan_id) return null
    return PRICING_PLANS.find((plan) => plan.id === data.subscription?.plan_id)
  }, [data?.subscription?.plan_id])

  const formattedStatus = useMemo(() => {
    if (!data?.subscription?.status) return 'Pending'
    return data.subscription.status
      .split('_')
      .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
      .join(' ')
  }, [data?.subscription?.status])

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
      </div>
    )
  }

  const renewalCopy = data?.subscription?.current_period_end
    ? new Date(data.subscription.current_period_end).toLocaleString()
    : 'Once you complete checkout, your renewal date appears here.'

  const cancelCopy = data?.subscription?.cancel_at_period_end
    ? 'Plan will cancel at the end of the current period.'
    : 'Renews automatically unless you cancel from the billing portal.'

  if (!data?.subscription) {
    return (
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>
          No subscription found. Start a plan to unlock the premium experience on web and mobile.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => router.push('/pricing')}>
            View plans
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className={`status-chip ${data.isActive ? '' : 'error'}`}>
            {data.isActive ? 'Active membership' : 'Inactive'}
          </span>
          <h2 style={{ marginBottom: 8 }}>
            {planMeta ? planMeta.name : data.subscription.plan_id.toUpperCase()}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {planMeta?.tagline || 'Subscription details'}
          </p>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Status: {formattedStatus}
            {data.subscription.cancel_at_period_end && ' • scheduled to cancel'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <button className="btn btn-primary" onClick={openPortal} disabled={portalLoading}>
            {portalLoading ? 'Opening…' : 'Manage billing'}
          </button>
        </div>
      </div>
      <div className="account-status">
        <div className="status-tile">
          <h4>Next renewal</h4>
          <p style={{ color: 'var(--text-muted)' }}>{renewalCopy}</p>
        </div>
        <div className="status-tile">
          <h4>Auto-renewal</h4>
          <p style={{ color: 'var(--text-muted)' }}>{cancelCopy}</p>
        </div>
        <div className="status-tile">
          <h4>Mobile access</h4>
          <p style={{ color: 'var(--text-muted)' }}>
            {data.isActive
              ? 'Sign into YouFirst on iOS with this account to unlock premium modes instantly.'
              : 'Complete checkout or refresh after payment to unlock premium features.'}
          </p>
        </div>
      </div>
      {planMeta && (
        <div className="status-tile" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h4>What’s included</h4>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {planMeta.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


