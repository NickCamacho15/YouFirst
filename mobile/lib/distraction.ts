import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"

export type TrackedApp = {
  id: string
  user_id: string
  name: string
  icon: string | null
  color: string | null
  created_at: string
  deleted_at: string | null
}

export type UsageEntry = {
  id: string
  user_id: string
  app_id: string
  usage_date: string // YYYY-MM-DD
  minutes: number
  created_at: string
}

export async function listTrackedApps(): Promise<TrackedApp[]> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from("user_distraction_apps")
    .select("id,user_id,name,icon,color,created_at,deleted_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
  if (error || !data) throw new Error(error?.message || "Failed to load apps")
  return data as TrackedApp[]
}

export async function addTrackedApp(payload: { name: string; icon?: string; color?: string }): Promise<TrackedApp> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from("user_distraction_apps")
    .insert([{ user_id: userId, name: payload.name, icon: payload.icon || null, color: payload.color || null }])
    .select("id,user_id,name,icon,color,created_at,deleted_at")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to add app")
  return data as TrackedApp
}

export async function deleteTrackedApp(id: string): Promise<void> {
  const { error } = await supabase
    .from("user_distraction_apps")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function saveUsage(minutesByAppIdForDate: { date: string; items: Array<{ appId: string; minutes: number }> }): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  const rows = minutesByAppIdForDate.items.map((it) => ({
    user_id: userId,
    app_id: it.appId,
    usage_date: minutesByAppIdForDate.date,
    minutes: Math.max(0, Math.min(24 * 60, Math.floor(it.minutes || 0))),
  }))

  const { error } = await supabase
    .from("user_distraction_entries")
    .upsert(rows, { onConflict: "user_id,app_id,usage_date" })
  if (error) throw new Error(error.message)
}

export async function getUsageForRange(startISO: string, endISO: string): Promise<UsageEntry[]> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from("user_distraction_entries")
    .select("id,user_id,app_id,usage_date,minutes,created_at")
    .eq("user_id", userId)
    .gte("usage_date", startISO.slice(0, 10))
    .lte("usage_date", endISO.slice(0, 10))
    .order("usage_date", { ascending: true })
  if (error || !data) throw new Error(error?.message || "Failed to load usage")
  return data as UsageEntry[]
}

export async function getMonthlyTotals(year: number, month0Based: number): Promise<Record<string, number>> {
  const first = new Date(Date.UTC(year, month0Based, 1))
  const last = new Date(Date.UTC(year, month0Based + 1, 0))
  const entries = await getUsageForRange(first.toISOString(), last.toISOString())
  const totals: Record<string, number> = {}
  for (const e of entries) {
    totals[e.usage_date] = (totals[e.usage_date] || 0) + (e.minutes || 0)
  }
  return totals
}

export async function getStats(startISO: string, endISO: string): Promise<{ totalMinutes: number; dailyAverageMinutes: number }> {
  const entries = await getUsageForRange(startISO, endISO)
  const setDays = new Set(entries.map((e) => e.usage_date))
  const total = entries.reduce((acc, e) => acc + (e.minutes || 0), 0)
  const numDays = Math.max(1, setDays.size)
  return { totalMinutes: total, dailyAverageMinutes: Math.round(total / numDays) }
}


