import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const extra: any = (Constants as any).expoConfig?.extra || (Constants as any).manifest2?.extra || {}

// Shared key for Remember Me preference across the app
export const REMEMBER_ME_KEY = 'youfirst_remember_me_v1'

const SUPABASE_URL = extra.expoPublicSupabaseUrl
const SUPABASE_ANON_KEY = extra.expoPublicSupabaseAnonKey

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL/key missing in app.json extra. Set expoPublicSupabaseUrl and expoPublicSupabaseAnonKey.')
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Helpers for Supabase Storage: generate a public URL for a given path
export function getPublicUrlFromStorage(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl || null
  } catch {
    return null
  }
}

// Create a signed URL for private buckets
export async function getSignedUrlFromStorage(
  bucket: string,
  path: string | null | undefined,
  expiresInSeconds: number = 60 * 60 * 24 * 7 // 7 days
): Promise<string | null> {
  if (!path) return null
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
    if (error) return null
    return data?.signedUrl || null
  } catch {
    return null
  }
}

// Upload a file (Uint8Array/Blob) to storage at a deterministic per-user path.
// Returns the storage path (e.g., avatar/USER_ID/filename.jpg) and public URL if the bucket has public read.
export async function uploadToStorage(
  bucket: string,
  path: string,
  fileBody: ArrayBuffer | Blob | Uint8Array,
  contentType?: string,
  upsert: boolean = true,
): Promise<{ path: string; publicUrl: string | null }>
{
  const { error } = await supabase.storage.from(bucket).upload(path, fileBody as any, { contentType, upsert })
  if (error) throw new Error(error.message)
  return { path, publicUrl: getPublicUrlFromStorage(bucket, path) }
}


// Force-clear any persisted Supabase auth tokens to recover from stuck states
export async function forceClearAuthStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys()
    const toRemove = keys.filter((k) => k.includes('supabase') || k.startsWith('sb-'))
    if (toRemove.length) {
      await AsyncStorage.multiRemove(toRemove)
    }
  } catch {}
}


