import { supabase } from "./supabase"

export type MeditationSession = {
  id: string
  user_id: string
  started_at: string
  ended_at: string
  duration_seconds: number
  prep_seconds: number
  interval_minutes: number
  meditation_minutes: number
  created_at: string
}

export async function saveMeditationSession(input: {
  startedAt: string
  endedAt: string
  durationSeconds: number
  prepSeconds: number
  intervalMinutes: number
  meditationMinutes: number
}): Promise<MeditationSession> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from("user_meditation_sessions")
    .insert([
      {
        user_id: userId,
        started_at: input.startedAt,
        ended_at: input.endedAt,
        duration_seconds: Math.max(0, Math.floor(input.durationSeconds)),
        prep_seconds: Math.max(0, Math.floor(input.prepSeconds)),
        interval_minutes: Math.max(0, Math.floor(input.intervalMinutes)),
        meditation_minutes: Math.max(0, Math.floor(input.meditationMinutes)),
      },
    ])
    .select("id,user_id,started_at,ended_at,duration_seconds,prep_seconds,interval_minutes,meditation_minutes,created_at")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to save meditation session")
  return data as MeditationSession
}

export async function getMeditationStats(): Promise<{ totalSeconds: number; sessionCount: number; dayStreak: number }> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return { totalSeconds: 0, sessionCount: 0, dayStreak: 0 }
  const { data, error } = await supabase
    .from("user_meditation_sessions")
    .select("duration_seconds, started_at")
    .eq("user_id", userId)
  if (error) throw new Error(error.message)
  const rows = (data as { duration_seconds: number; started_at: string }[]) || []
  const totalSeconds = rows.reduce((s, r) => s + (r.duration_seconds || 0), 0)
  const sessionCount = rows.length
  // simple day streak: count of consecutive days up to today with at least one session
  const days = new Set(rows.map((r) => new Date(r.started_at).toDateString()))
  let streak = 0
  for (let d = new Date(); ; d.setDate(d.getDate() - 1)) {
    const key = d.toDateString()
    if (days.has(key)) streak++
    else break
  }
  return { totalSeconds, sessionCount, dayStreak: streak }
}


