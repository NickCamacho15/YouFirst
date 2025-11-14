import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.slice('Bearer '.length)
  if (!token) return null
  const supabase = getServiceSupabaseClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return null
  }
  return data.user
}


