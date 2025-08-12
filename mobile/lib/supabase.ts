import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const extra: any = (Constants as any).expoConfig?.extra || (Constants as any).manifest2?.extra || {}

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


