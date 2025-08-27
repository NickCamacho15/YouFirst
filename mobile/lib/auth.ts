import { supabase, uploadToStorage, getPublicUrlFromStorage } from "./supabase"
import AsyncStorage from "@react-native-async-storage/async-storage"

export interface LoginPayload {
  // identifier can be email or username
  identifier: string
  password: string
}

export interface RegisterPayload {
  email: string
  displayName: string
  username: string
  password: string
}

export interface User {
  id: string
  email: string
  displayName: string
  username?: string
  profileImageUrl?: string | null
}

async function upsertUserRow(user: { id: string; email: string; displayName?: string; username?: string }) {
  // Best-effort upsert into public.users table. RLS should typically allow inserting
  // a row where id === auth.uid(). If RLS blocks (e.g., no session yet), this will
  // just be a no-op and we'll try again on next login.
  try {
    const { error } = await supabase
      .from("users")
      .upsert(
        [
          {
            id: user.id,
            email: user.email,
            display_name: user.displayName ?? null,
            username: user.username ?? null,
          },
        ],
        { onConflict: "id" }
      )
    if (error) {
      // Avoid throwing here to not block auth flow
      // eslint-disable-next-line no-console
      console.warn("Failed to upsert users row:", error.message)
    }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn("Upsert users row exception:", err?.message || String(err))
  }
}

async function mapUsernameToEmailLocally(username: string | undefined, email: string | undefined) {
  if (!username || !email) return
  try {
    const key = "youfirst_username_email_map_v1"
    const raw = await AsyncStorage.getItem(key)
    const map = raw ? JSON.parse(raw) as Record<string,string> : {}
    map[username.toLowerCase()] = email
    await AsyncStorage.setItem(key, JSON.stringify(map))
  } catch {}
}

async function resolveEmailFromLocalMap(username: string): Promise<string | null> {
  try {
    const key = "youfirst_username_email_map_v1"
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string,string>
    const hit = map[username.toLowerCase()]
    return hit || null
  } catch { return null }
}

export async function login(payload: LoginPayload): Promise<User> {
  // Determine if identifier is email or username
  const isEmail = payload.identifier.includes("@")
  let emailToUse = payload.identifier
  if (!isEmail) {
    // Resolve email from username with multiple strategies and timeouts to avoid hangs
    const username = payload.identifier
    // 0) Try local cache first for instant resolution
    const localEmail = await resolveEmailFromLocalMap(username)
    if (localEmail) {
      emailToUse = localEmail
    } else {
    const resolveViaRpc = async () => {
      const { data, error } = await supabase.rpc("resolve_email_by_username", { p_username: username })
      if (error || !data) throw new Error(error?.message || "Invalid credentials")
      return String(data)
    }
    const resolveViaPublicTable = async () => {
      const { data, error } = await supabase.from("users").select("email").eq("username", username).limit(1).maybeSingle()
      if (error || !data?.email) throw new Error("Invalid credentials")
      return String(data.email)
    }
    const resolveWithTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race<T>([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Lookup timed out")), ms)) as any,
    ])
    try {
      emailToUse = await resolveWithTimeout(resolveViaRpc(), 3000)
    } catch {
      // Fallback to public users table with a shorter timeout
      emailToUse = await resolveWithTimeout(resolveViaPublicTable(), 2000)
    }
    }
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password: payload.password,
  })
  if (error || !data.session || !data.user) throw new Error(error?.message || "Login failed")
  const user: User = {
    id: data.user.id,
    email: data.user.email || emailToUse,
    displayName: data.user.user_metadata?.display_name || "",
    username: data.user.user_metadata?.username || undefined,
    profileImageUrl: data.user.user_metadata?.profile_image_url || null,
  }
  // Update local username→email cache for faster next login
  await mapUsernameToEmailLocally(user.username, user.email)
  // Ensure a corresponding row exists in public.users (non-blocking)
  try {
    await Promise.race([
      upsertUserRow({ id: user.id, email: user.email, displayName: user.displayName, username: user.username }),
      new Promise<void>((resolve) => setTimeout(() => resolve(), 1200)),
    ])
  } catch {}
  return user
}

export async function register(payload: RegisterPayload): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: { display_name: payload.displayName, username: payload.username.toLowerCase() },
    },
  })
  if (error || !data.user) throw new Error(error?.message || "Registration failed")

  const user: User = {
    id: data.user.id,
    email: data.user.email || payload.email,
    displayName: payload.displayName,
    username: payload.username.toLowerCase(),
    profileImageUrl: null,
  }

  // If email confirmations are disabled in Supabase, signUp returns a session
  // and we can immediately create the users row. If confirmations are enabled,
  // this call may be blocked by RLS — we'll try again on the first successful login.
  if (data.session) {
    await upsertUserRow({ id: user.id, email: user.email, displayName: user.displayName, username: user.username })
  }

  // If there's no session, it means email confirmation is enabled server-side.
  // We surface a clearer message so this is easy to diagnose.
  if (!data.session) {
    throw new Error(
      "Email confirmation is enabled in Supabase. Disable 'Confirm email' in Authentication settings to allow immediate login."
    )
  }

  // Cache mapping for future username login
  await mapUsernameToEmailLocally(user.username, user.email)

  return user
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  return {
    id: data.user.id,
    email: data.user.email || "",
    displayName: data.user.user_metadata?.display_name || "",
    username: data.user.user_metadata?.username || undefined,
    profileImageUrl: data.user.user_metadata?.profile_image_url || null,
  }
}

export async function logout(): Promise<void> {
  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise<void>((resolve) => setTimeout(() => resolve(), 2000)),
    ])
  } catch {}
}

// Profile update helpers
export async function updateEmail(newEmail: string): Promise<void> {
  const { data, error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw new Error(error.message)
  const user = data.user
  if (user) {
    await upsertUserRow({ id: user.id, email: user.email || newEmail, displayName: user.user_metadata?.display_name, username: user.user_metadata?.username })
  }
}

export async function updateUsername(newUsername: string): Promise<void> {
  const lower = newUsername.trim().toLowerCase()
  const { data, error } = await supabase.auth.updateUser({ data: { username: lower } })
  if (error) throw new Error(error.message)
  const user = data.user
  if (user) {
    try {
      const { error: upErr } = await supabase
        .from("users")
        .update({ username: lower })
        .eq("id", user.id)
      if (upErr) throw upErr
    } catch (e: any) {
      throw new Error(e?.message || "Failed to update username")
    }
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

// ---- Profile Image helpers ----

export async function updateProfileImageUrl(pathInBucket: string | null): Promise<void> {
  const publicUrl = pathInBucket ? getPublicUrlFromStorage("avatars", pathInBucket) : null
  const { error, data } = await supabase.auth.updateUser({ data: { profile_image_url: publicUrl } })
  if (error) throw new Error(error.message)
  // mirror on public.users
  const user = data.user
  if (user) {
    try {
      const { error: upErr } = await supabase
        .from("users")
        .update({ profile_image_url: publicUrl })
        .eq("id", user.id)
      if (upErr) throw upErr
    } catch (e: any) {
      throw new Error(e?.message || "Failed to update profile image URL")
    }
  }
}

export async function uploadProfileImage(file: Blob | ArrayBuffer | Uint8Array, contentType: string, fileName: string): Promise<{ publicUrl: string | null }>{
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error("Not authenticated")
  const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_")
  const storagePath = `${userId}/${Date.now()}_${cleanName}`
  const { publicUrl } = await uploadToStorage("avatars", storagePath, file as any, contentType, true)
  await updateProfileImageUrl(storagePath)
  return { publicUrl }
}


