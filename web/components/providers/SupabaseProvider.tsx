'use client'

import { createContext, useContext, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getBrowserSupabaseClient } from '@/lib/supabase/browser'

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => getBrowserSupabaseClient())
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
}

export function useSupabase(): SupabaseClient<Database> {
  const client = useContext(SupabaseContext)
  if (!client) {
    throw new Error('SupabaseProvider is missing')
  }
  return client
}


