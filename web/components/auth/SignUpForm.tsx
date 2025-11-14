'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

const schema = z
  .object({
    displayName: z.string().min(2),
    email: z.string().email(),
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/, 'Use letters, numbers, dots, dashes, underscores'),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    role: z.enum(['user', 'admin']),
    accessCode: z.string().min(1, 'Access code required'),
    groupName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  })

type FormValues = z.infer<typeof schema>

export default function SignUpForm({ switchToSignIn }: { switchToSignIn: () => void }) {
  const supabase = useSupabase() as SupabaseClient<any>
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [setupStatus, setSetupStatus] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'user',
      accessCode: '',
      groupName: '',
    },
  })

  const roleValue = watch('role')

  const handleRoleChange = (role: 'user' | 'admin') => {
    setServerError(null)
    setSetupStatus(null)
    setValue('role', role, { shouldDirty: true })
  }

  const normalizeCode = (code: string) => code.trim().toUpperCase()

  const performAccessSetup = async (values: FormValues) => {
    setSetupStatus('Applying access code…')
    const code = normalizeCode(values.accessCode)
    const runRpc = async () => {
      type CreateArgs = Database['public']['Functions']['create_admin_group']['Args']
      type JoinArgs = Database['public']['Functions']['redeem_access_code']['Args']
      if (values.role === 'admin') {
        const args: CreateArgs = {
          p_name: values.groupName?.trim() || '',
          p_access_code: code,
        }
        return supabase.rpc('create_admin_group' as any, args)
      }
      const args: JoinArgs = { p_access_code: code }
      return supabase.rpc('redeem_access_code' as any, args)
    }

    const firstAttempt = await runRpc()
    if (firstAttempt.error) {
      if (firstAttempt.error.message?.toLowerCase().includes('not authenticated')) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        const retry = await runRpc()
        if (retry.error) {
          throw new Error(retry.error.message)
        }
      } else {
        throw new Error(firstAttempt.error.message)
      }
    }

    setSetupStatus('Verifying setup…')
    let verified = false
    type VerifyRow = Database['public']['Functions']['verify_user_setup']['Returns'][number]
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase.rpc('verify_user_setup' as any, {})
      const rows = (data ?? []) as VerifyRow[]
      if (rows[0]?.role) {
        verified = true
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    if (!verified) {
      throw new Error('Access code verification timed out. Please refresh and try again.')
    }
    setSetupStatus(null)
  }

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    setSetupStatus(null)
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        username: values.username.trim(),
        password: values.password,
      }),
    })
    const data = await response.json()
    if (!response.ok || !data.ok) {
      setServerError(data.error || 'Unable to create account')
      return
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    })
    if (error) {
      setServerError(error.message)
      return
    }
    if (values.role === 'admin' && !(values.groupName || '').trim()) {
      setServerError('Group name is required for admins.')
      return
    }
    try {
      await performAccessSetup(values)
    } catch (setupError: any) {
      setServerError(setupError?.message || 'Failed to apply access code.')
      return
    }
    router.push('/pricing')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="glass-panel" style={{ gap: '1rem', display: 'flex', flexDirection: 'column' }}>
      <div className="input-stack">
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" placeholder="Jordan" {...register('displayName')} />
        {errors.displayName && <span className="form-error">{errors.displayName.message}</span>}
      </div>
      <div className="input-stack">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" placeholder="you@example.com" {...register('email')} />
        {errors.email && <span className="form-error">{errors.email.message}</span>}
      </div>
      <div className="input-stack">
        <label htmlFor="username">Username</label>
        <input id="username" placeholder="yourname" {...register('username')} />
        {errors.username && <span className="form-error">{errors.username.message}</span>}
      </div>
      <div className="input-stack">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" {...register('password')} />
        {errors.password && <span className="form-error">{errors.password.message}</span>}
      </div>
      <div className="input-stack">
        <label htmlFor="confirmPassword">Confirm password</label>
        <input id="confirmPassword" type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
      </div>
      <input type="hidden" {...register('role')} />
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          className={`btn ${roleValue === 'user' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={() => handleRoleChange('user')}
        >
          Join with code
        </button>
        <button
          type="button"
          className={`btn ${roleValue === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={() => handleRoleChange('admin')}
        >
          Create a group
        </button>
      </div>
      {roleValue === 'admin' && (
        <div className="input-stack">
          <label htmlFor="groupName">Group name</label>
          <input id="groupName" placeholder="Alpha Cohort" {...register('groupName')} />
          {errors.groupName && <span className="form-error">{errors.groupName.message}</span>}
        </div>
      )}
      <div className="input-stack">
        <label htmlFor="accessCode">{roleValue === 'admin' ? 'Create an access code' : 'Enter your access code'}</label>
        <input id="accessCode" placeholder="CODE123" {...register('accessCode')} />
        {errors.accessCode && <span className="form-error">{errors.accessCode.message}</span>}
      </div>
      {serverError && <div className="form-error">{serverError}</div>}
      {setupStatus && <div style={{ color: '#9aa3ba', fontSize: '0.9rem' }}>{setupStatus}</div>}
      <button type="submit" className="btn btn-primary" disabled={isSubmitting || !!setupStatus}>
        {isSubmitting || setupStatus ? 'Working…' : 'Create account'}
      </button>
      <button type="button" className="btn btn-ghost" onClick={switchToSignIn}>
        Already subscribed? Sign in
      </button>
    </form>
  )
}


