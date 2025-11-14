'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSupabase } from '@/components/providers/SupabaseProvider'

const schema = z
  .object({
    displayName: z.string().min(2),
    email: z.string().email(),
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/, 'Use letters, numbers, dots, dashes, underscores'),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  })

type FormValues = z.infer<typeof schema>

export default function SignUpForm({ switchToSignIn }: { switchToSignIn: () => void }) {
  const supabase = useSupabase()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
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
      {serverError && <div className="form-error">{serverError}</div>}
      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create account'}
      </button>
      <button type="button" className="btn btn-ghost" onClick={switchToSignIn}>
        Already subscribed? Sign in
      </button>
    </form>
  )
}


