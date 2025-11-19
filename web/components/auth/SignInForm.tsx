'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSupabase } from '@/components/providers/SupabaseProvider'

const schema = z.object({
  identifier: z.string().min(3, 'Enter your username or email'),
  // For sign-in, allow any non-empty password and let Supabase enforce strength.
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function SignInForm({ switchToSignUp }: { switchToSignUp: () => void }) {
  const supabase = useSupabase()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      const rawIdentifier = values.identifier.trim()
      const isEmail = rawIdentifier.includes('@')
      let emailToUse = rawIdentifier.toLowerCase()

      if (!isEmail) {
        const username = rawIdentifier.toLowerCase()

        const tryRpc = async () => {
          const { data, error } = await (supabase as any).rpc('resolve_email_by_username', { p_username: username })
          if (error || !data) throw new Error(error?.message || 'No match')
          return String(data)
        }

        const tryPublicTable = async () => {
          const { data, error } = await (supabase as any)
            .from('users')
            .select('email')
            .eq('username', username)
            .limit(1)
            .maybeSingle()
          const row = data as { email?: string } | null
          if (error || !row?.email) throw new Error('No match')
          return String(row.email)
        }

        const resolved = await Promise.any<string>([tryRpc(), tryPublicTable()]).catch(() => null as unknown as string)
        if (!resolved) {
          throw new Error('Invalid username or password')
        }
        emailToUse = resolved.toLowerCase()
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: values.password,
      })
      if (error) {
        setServerError(error.message)
        return
      }
      router.push('/account')
    } catch (err: any) {
      setServerError(err?.message || 'Invalid username or password')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="glass-panel" style={{ gap: '1rem', display: 'flex', flexDirection: 'column' }}>
      <div className="input-stack">
        <label htmlFor="loginIdentifier">Username or email</label>
        <input id="loginIdentifier" type="text" placeholder="Enter your username or email" {...register('identifier')} />
        {errors.identifier && <span className="form-error">{errors.identifier.message}</span>}
      </div>
      <div className="input-stack">
        <label htmlFor="loginPassword">Password</label>
        <input id="loginPassword" type="password" {...register('password')} />
        {errors.password && <span className="form-error">{errors.password.message}</span>}
      </div>
      {serverError && <div className="form-error">{serverError}</div>}
      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
      <button type="button" className="btn btn-ghost" onClick={switchToSignUp}>
        Need an account? Create one on web
      </button>
    </form>
  )
}


