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
  role?: 'admin' | 'user'
  groupId?: string | null
  // ISO timestamp when the user account (row in public.users) was created
  createdAt?: string
}

function withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T> {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(label ? `${label} timed out` : "Request timed out")), ms)
    ) as any,
  ])
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

async function removeUsernameFromLocalMap(username: string | undefined): Promise<void> {
  if (!username) return
  try {
    const key = "youfirst_username_email_map_v1"
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string,string>
    const k = username.toLowerCase()
    if (map[k]) {
      delete map[k]
      await AsyncStorage.setItem(key, JSON.stringify(map))
    }
  } catch {}
}

export async function login(payload: LoginPayload): Promise<User> {
  // Determine if identifier is email or username
  const isEmail = payload.identifier.includes("@")
  let emailToUse = payload.identifier
  if (!isEmail) {
    // Resolve email from username using fastest-first approach.
    const username = payload.identifier

    // 0) Try local cache instantly
    const localEmail = await resolveEmailFromLocalMap(username)

    // 1) Kick off remote lookups in parallel (do not await yet)
    const tryRpc = async () => {
      const { data, error } = await supabase.rpc("resolve_email_by_username", { p_username: username })
      if (error || !data) throw new Error(error?.message || "No match")
      return String(data)
    }
    const tryPublicTable = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("email")
        .eq("username", username.toLowerCase())
        .limit(1)
        .maybeSingle()
      if (error || !data?.email) throw new Error("No match")
      return String(data.email)
    }
    const remoteLookup = Promise.any([
      withTimeout(tryRpc(), 9000, "Username lookup (rpc)"),
      withTimeout(tryPublicTable(), 9000, "Username lookup (table)"),
    ]).catch(() => null as unknown as string)

    // 2) If we have a cached mapping, try signing in immediately
    if (localEmail) {
      const { data: firstData, error: firstErr } = await supabase.auth.signInWithPassword({
        email: localEmail,
        password: payload.password,
      })
      if (!firstErr && firstData.session && firstData.user) {
        emailToUse = localEmail
      } else {
        // If that failed, wait briefly for a remote resolution and retry once if different
        const resolved = await withTimeout(remoteLookup, 3000, "Username lookup")
        if (resolved && resolved.toLowerCase() !== (localEmail || "").toLowerCase()) {
          emailToUse = resolved
        } else {
          // Fall back to local (will proceed to throw from auth below)
          emailToUse = localEmail
        }
      }
    } else {
      // 3) No cache: wait for the first successful remote resolution
      const resolved = await withTimeout(remoteLookup, 9000, "Username lookup")
      if (!resolved) throw new Error("Invalid username or password")
      emailToUse = resolved
    }
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password: payload.password,
  })
  if (error || !data.session || !data.user) throw new Error(error?.message || "Login failed")
  // Fetch canonical profile fields including role and group_id from public.users
  let role: 'admin' | 'user' | undefined
  let groupId: string | null | undefined
  let profileRow: any | undefined
  try {
    const { data: profile } = await supabase
      .from("users")
      .select("email, display_name, username, profile_image_url, role, group_id, created_at")
      .eq("id", data.user.id)
      .maybeSingle()
    if (profile) {
      role = (profile.role as 'admin' | 'user' | null) || undefined
      groupId = (profile.group_id as string | null | undefined) ?? null
      profileRow = profile
    }
  } catch {}
  const user: User = {
    id: data.user.id,
    email: data.user.email || emailToUse,
    displayName: data.user.user_metadata?.display_name || "",
    username: data.user.user_metadata?.username || undefined,
    profileImageUrl: data.user.user_metadata?.profile_image_url || null,
    role,
    groupId: groupId ?? null,
    // Prefer created_at from canonical users table when available
    createdAt: profileRow?.created_at ? String(profileRow.created_at) : undefined,
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
  const { data: sess } = await supabase.auth.getSession()
  const authUser = sess.session?.user || null
  if (!authUser) return null
  // Prefer canonical values from public.users, with auth metadata as fallback
  try {
    const { data: profile } = await supabase
      .from("users")
      .select("email, display_name, username, profile_image_url, role, group_id, created_at")
      .eq("id", authUser.id)
      .maybeSingle()
    return {
      id: authUser.id,
      email: profile?.email || authUser.email || "",
      displayName: profile?.display_name || authUser.user_metadata?.display_name || "",
      username: profile?.username || authUser.user_metadata?.username || undefined,
      profileImageUrl: profile?.profile_image_url ?? authUser.user_metadata?.profile_image_url ?? null,
      role: (profile?.role as 'admin' | 'user' | null) || undefined,
      groupId: (profile?.group_id as string | null | undefined) ?? null,
      createdAt: (profile as any)?.created_at ? String((profile as any).created_at) : undefined,
    }
  } catch {
    return {
      id: authUser.id,
      email: authUser.email || "",
      displayName: authUser.user_metadata?.display_name || "",
      username: authUser.user_metadata?.username || undefined,
      profileImageUrl: authUser.user_metadata?.profile_image_url || null,
      // If the public.users lookup failed, we can still fall back to auth's created_at (if present)
      createdAt: (authUser as any)?.created_at ? String((authUser as any).created_at) : undefined,
    }
  }
}

// Lightweight helper to access the current user's id using the local session only.
// This avoids a network GET /auth/v1/user call on hot paths.
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.user?.id ?? null
  } catch {
    return null
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
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) throw new Error("Not authenticated")
  // 1) Canonical table first
  await withTimeout(
    upsertUserRow({ id: user.id, email: newEmail, displayName: user.user_metadata?.display_name, username: user.user_metadata?.username }),
    8000,
    "Update profile email"
  )
  // 2) Best-effort mirror into auth
  try {
    await withTimeout(supabase.auth.updateUser({ email: newEmail }), 4000, "Mirror auth email")
  } catch {}
  // 3) Refresh cache mapping for current username
  const uname = (user.user_metadata?.username as string | undefined) || undefined
  if (uname) await mapUsernameToEmailLocally(uname, newEmail)
}

export async function updateUsername(newUsername: string): Promise<void> {
  const lower = newUsername.trim().toLowerCase()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) throw new Error("Not authenticated")
  // 1) Canonical: ensure row exists and set username (include email to satisfy NOT NULL)
  await withTimeout(
    upsertUserRow({ id: user.id, email: user.email || "", displayName: user.user_metadata?.display_name, username: lower }),
    8000,
    "Update profile username"
  )
  // 2) Best-effort mirror into auth metadata (non-blocking, short timeout)
  try {
    await withTimeout(
      supabase.auth.updateUser({ data: { username: lower } }),
      4000,
      "Mirror auth username"
    )
  } catch {}
  // 3) Update local cache
  await mapUsernameToEmailLocally(lower, user.email || undefined)
  // 4) Remove stale cache for any previous username value
  const previous = (user.user_metadata?.username as string | undefined) || undefined
  if (previous && previous !== lower) {
    await removeUsernameFromLocalMap(previous)
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { error } = await withTimeout(supabase.auth.updateUser({ password: newPassword }), 8000, "Update password")
  if (error) throw new Error(error.message)
}

// ---- Profile Image helpers ----

export async function updateProfileImageUrl(pathInBucket: string | null): Promise<void> {
  const publicUrl = pathInBucket ? getPublicUrlFromStorage("avatars", pathInBucket) : null
  try {
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) return
    // Run both updates in parallel and do not throw if one is slow
    const tasks: Promise<any>[] = [
      withTimeout(
        (async () => {
          const { error } = await supabase.auth.updateUser({ data: { profile_image_url: publicUrl } })
          if (error) throw new Error(error.message)
        })(),
        6000,
        "Update auth profile image"
      ),
      withTimeout(
        (async () => {
          const { error: upErr } = await supabase
            .from("users")
            .update({ profile_image_url: publicUrl })
            .eq("id", uid)
          if (upErr) throw upErr
        })(),
        6000,
        "Mirror users profile image"
      ),
    ]
    await Promise.allSettled(tasks)
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn("Profile image metadata update (non-fatal):", e?.message || String(e))
  }
}

export async function uploadProfileImage(file: Blob | ArrayBuffer | Uint8Array, contentType: string, fileName: string): Promise<{ publicUrl: string | null }>{
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error("Not authenticated")
  const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_")
  const storagePath = `${userId}/${Date.now()}_${cleanName}`
  // Enforce non-empty content to avoid 0-byte objects
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    if ((file as any).size === 0) throw new Error("Selected image is empty. Please choose a different photo.")
  } else if (file instanceof Uint8Array) {
    if (file.byteLength === 0) throw new Error("Selected image is empty. Please choose a different photo.")
  } else if (file instanceof ArrayBuffer) {
    if ((file as ArrayBuffer).byteLength === 0) throw new Error("Selected image is empty. Please choose a different photo.")
  }
  // Enforce an upper bound on storage upload time
  const { publicUrl } = await withTimeout(
    uploadToStorage("avatars", storagePath, file as any, contentType, true),
    20000,
    "Upload avatar"
  )
  // Kick metadata updates but do not block caller if they are slow
  try {
    await updateProfileImageUrl(storagePath)
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn("Non-fatal profile image metadata update error:", e?.message || String(e))
  }
  return { publicUrl }
}


