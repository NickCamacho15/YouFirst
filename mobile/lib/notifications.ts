import { supabase } from "./supabase"

export type AppNotification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: any | null
  is_read: boolean
  created_at: string
}

export async function getUnreadCount(): Promise<number> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return 0
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("is_read", false)
  return count || 0
}

export async function listNotifications(limit = 50): Promise<AppNotification[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return []
  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,type,title,body,data,is_read,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data as AppNotification[]) || []
}

export async function markAllRead(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", uid)
}

export async function createNotification(input: { type: string; title: string; body?: string; data?: any }): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return
  await supabase.from("notifications").insert([
    {
      user_id: uid,
      type: input.type,
      title: input.title,
      body: input.body || null,
      data: input.data ?? null,
    },
  ])
}


