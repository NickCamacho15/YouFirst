import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

const CREDS_KEY = 'you_bio_login_v1' // legacy key; no longer used for new writes
const ENABLED_FLAG_KEY = 'you_bio_login_enabled_v1'
const SESSION_KEY = 'you_bio_session_v1'

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    if (!hasHardware) return false
    const isEnrolled = await LocalAuthentication.isEnrolledAsync()
    return !!isEnrolled
  } catch {
    return false
  }
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const flag = await AsyncStorage.getItem(ENABLED_FLAG_KEY)
    if (!flag) return false
    return await isBiometricHardwareAvailable()
  } catch {
    return false
  }
}

export async function disableBiometricLogin(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDS_KEY)
  } catch {}
  try {
    await AsyncStorage.removeItem(ENABLED_FLAG_KEY)
  } catch {}
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY)
  } catch {}
}

export async function enableBiometricLock(): Promise<boolean> {
  const available = await isBiometricHardwareAvailable()
  if (!available) return false
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable biometric unlock' })
  if (!result.success) return false
  try {
    await AsyncStorage.setItem(ENABLED_FLAG_KEY, '1')
    // Best-effort store the current Supabase session tokens for biometric sign-in
    try {
      const { data } = await supabase.auth.getSession()
      const refreshToken = data.session?.refresh_token
      const accessToken = data.session?.access_token
      if (refreshToken && accessToken) {
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ refreshToken, accessToken }))
      }
    } catch {}
    return true
  } catch {
    return false
  }
}

export async function biometricUnlock(promptMessage: string = 'Unlock with Face ID'):
  Promise<boolean> {
  const enabled = await isBiometricLoginEnabled()
  if (!enabled) return false
  const result = await LocalAuthentication.authenticateAsync({ promptMessage })
  return !!result.success
}

// Attempt a full sign-in using stored Supabase session tokens gated by biometrics
export async function biometricSignIn(): Promise<boolean> {
  const enabled = await isBiometricLoginEnabled()
  if (!enabled) return false
  const authOk = await biometricUnlock('Sign in with Face ID')
  if (!authOk) return false
  try {
    const stored = await SecureStore.getItemAsync(SESSION_KEY)
    if (!stored) return false
    const parsed = JSON.parse(stored) as { refreshToken: string; accessToken: string }
    if (!parsed?.refreshToken || !parsed?.accessToken) return false
    const { data, error } = await supabase.auth.setSession({ refresh_token: parsed.refreshToken, access_token: parsed.accessToken } as any)
    if (error || !data.session) return false
    return true
  } catch {
    return false
  }
}


