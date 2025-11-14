import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

export function getServerSupabaseClient(): SupabaseClient<Database> {
  const cookieStore = cookies()
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: Parameters<typeof cookieStore.set>[1]) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: Parameters<typeof cookieStore.set>[1]) {
        cookieStore.set({ name, value: '', expires: new Date(0), ...options })
      },
    },
  })
}


