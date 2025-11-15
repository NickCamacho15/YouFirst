'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSupabase } from '@/components/providers/SupabaseProvider'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
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
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    })
    if (error) {
      setServerError(error.message)
      return
    }
    router.push('/account')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="glass-panel" style={{ gap: '1rem', display: 'flex', flexDirection: 'column' }}>
      <div className="input-stack">
        <label htmlFor="loginEmail">Email</label>
        <input id="loginEmail" type="email" placeholder="you@example.com" {...register('email')} />
        {errors.email && <span className="form-error">{errors.email.message}</span>}
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


