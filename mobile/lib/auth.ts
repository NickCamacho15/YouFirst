import { supabase } from "./supabase"

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

export async function login(payload: LoginPayload): Promise<User> {
  // Determine if identifier is email or username
  const isEmail = payload.identifier.includes("@")
  let emailToUse = payload.identifier
  if (!isEmail) {
    // Resolve email from username via RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc("resolve_email_by_username", {
      p_username: payload.identifier,
    })
    if (rpcError || !rpcData) throw new Error("Invalid credentials")
    emailToUse = rpcData as string
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
  }
  // Ensure a corresponding row exists in public.users
  await upsertUserRow({ id: user.id, email: user.email, displayName: user.displayName, username: user.username })
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

  return user
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  return { id: data.user.id, email: data.user.email || "", displayName: data.user.user_metadata?.display_name || "", username: data.user.user_metadata?.username || undefined }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}


