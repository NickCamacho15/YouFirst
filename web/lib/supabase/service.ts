import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

let serviceClient: SupabaseClient<Database> | null = null

export function getServiceSupabaseClient(): SupabaseClient<Database> {
  if (!serviceClient) {
    serviceClient = createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return serviceClient
}


