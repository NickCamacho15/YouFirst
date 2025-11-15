import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

export function getServerSupabaseClient(): SupabaseClient<Database> {
  const cookieStore = cookies()
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      // Adapt Next.js app router cookies API to Supabase's CookieMethodsServer
      getAll() {
        return cookieStore.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }))
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options })
        })
      },
    },
  })
}


