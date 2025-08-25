import { supabase } from "./supabase"

export type MeditationSessionRow = {
  id: string
  user_id: string
  started_at: string
  ended_at: string
  duration_seconds: number
  prep_seconds: number
  interval_minutes: number
  meditation_minutes: number
}

export async function saveMeditationSession(input: {
  startedAt: string
  endedAt: string
  durationSeconds: number
  prepSeconds: number
  intervalMinutes: number
  meditationMinutes: number
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { error } = await supabase.from("meditation_sessions").insert([
    {
      user_id: auth.user.id,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      duration_seconds: input.durationSeconds,
      prep_seconds: input.prepSeconds,
      interval_minutes: input.intervalMinutes,
      meditation_minutes: input.meditationMinutes,
    },
  ])
  if (error) throw new Error(error.message)
}

export async function getMeditationStats(): Promise<{ totalSeconds: number; sessionCount: number; dayStreak: number }> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { totalSeconds: 0, sessionCount: 0, dayStreak: 0 }
  const { data, error } = await supabase
    .from("meditation_sessions")
    .select("started_at, duration_seconds")
    .eq("user_id", auth.user.id)
    .order("started_at", { ascending: false })
  if (error) return { totalSeconds: 0, sessionCount: 0, dayStreak: 0 }
  const totalSeconds = (data || []).reduce((a: number, r: any) => a + (r.duration_seconds || 0), 0)
  const sessionCount = data?.length || 0
  const days = new Set<string>((data || []).map((r: any) => r.started_at.slice(0, 10)))
  let streak = 0
  let d = new Date()
  while (days.has(d.toISOString().slice(0, 10))) {
    streak += 1
    d = new Date(d.getTime() - 86400000)
  }
  return { totalSeconds, sessionCount, dayStreak: streak }
}
