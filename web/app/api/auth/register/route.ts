import { NextResponse } from 'next/server'
import { z } from 'zod'
import { assertRateLimit } from '@/lib/rate-limit'
import { getServiceSupabaseClient } from '@/lib/supabase/service'
import { ensureStripeCustomer } from '@/lib/subscriptions'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(120),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = registerSchema.parse(body)
    const username = payload.username.trim().toLowerCase()
    const email = payload.email.trim().toLowerCase()

    const rateLimitKey = `register:${email}:${request.headers.get('x-forwarded-for') ?? 'ip'}`
    assertRateLimit(rateLimitKey, 3, 60_000)

    const supabase = getServiceSupabaseClient()

    const { data: usernameExisting } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (usernameExisting) {
      return NextResponse.json({ ok: false, error: 'Username already taken' }, { status: 409 })
    }

    const { data: emailExisting } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (emailExisting) {
      return NextResponse.json({ ok: false, error: 'Email already registered' }, { status: 409 })
    }

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        display_name: payload.displayName,
        username,
      },
    })
    if (createError || !userData.user) {
      return NextResponse.json({ ok: false, error: createError?.message || 'Failed to create user' }, { status: 400 })
    }

    const userId = userData.user.id

    await supabase.from('users').upsert(
      {
        id: userId,
        email,
        display_name: payload.displayName,
        username,
      },
      { onConflict: 'id' },
    )

    await ensureStripeCustomer(userId, email)

    return NextResponse.json({ ok: true, userId })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Registration failed' }, { status: 400 })
  }
}


