import { NextResponse, type NextRequest } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/user-from-request'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabaseClient()

  const [entitlementResp, subscriptionResp] = await Promise.all([
    supabase.from('entitlements').select('is_active').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plan_id, price_id, status, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (entitlementResp.error) {
    return NextResponse.json({ error: entitlementResp.error.message }, { status: 400 })
  }

  if (subscriptionResp.error) {
    return NextResponse.json({ error: subscriptionResp.error.message }, { status: 400 })
  }

  const entitlementData = entitlementResp.data as { is_active: boolean | null } | null

  return NextResponse.json({
    isActive: entitlementData?.is_active ?? false,
    subscription: subscriptionResp.data,
  })
}


