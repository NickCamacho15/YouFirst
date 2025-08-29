import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"

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

// Simple pub/sub so UI can refresh badge and lists when notifications change
type Listener = () => void
const listeners = new Set<Listener>()
export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function emitNotificationsChanged(): void {
  for (const l of Array.from(listeners)) {
    try { l() } catch {}
  }
}

export async function getUnreadCount(): Promise<number> {
  const uid = await getCurrentUserId()
  if (!uid) return 0
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("is_read", false)
  return count || 0
}

// Weekly unread count (last 7 days, inclusive of today)
export async function getUnreadCountForPastWeek(): Promise<number> {
  const uid = await getCurrentUserId()
  if (!uid) return 0
  const end = new Date(); end.setHours(23,59,59,999)
  const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0,0,0,0)
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("is_read", false)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
  return count || 0
}

export async function listNotifications(limit = 50): Promise<AppNotification[]> {
  const uid = await getCurrentUserId()
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
  const uid = await getCurrentUserId()
  if (!uid) return
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", uid)
  emitNotificationsChanged()
}

export async function createNotification(input: { type: string; title: string; body?: string; data?: any }): Promise<void> {
  const uid = await getCurrentUserId()
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
  emitNotificationsChanged()
}

// Realtime channel to update UI when new notifications arrive
let channel: any | null = null
export function ensureNotificationsRealtime(): void {
  if (channel) return
  try {
    channel = (supabase as any).channel?.("notifications_channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        emitNotificationsChanged()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, () => {
        emitNotificationsChanged()
      })
      .subscribe()
  } catch {}
}


