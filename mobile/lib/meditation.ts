import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"

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
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")
  const { error } = await supabase.from("meditation_sessions").insert([
    {
      user_id: uid,
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

export type MeditationStats = { totalSeconds: number; sessionCount: number; dayStreak: number; distinctDays: number }

export async function getMeditationStats(): Promise<MeditationStats> {
  const uid = await getCurrentUserId()
  if (!uid) return { totalSeconds: 0, sessionCount: 0, dayStreak: 0, distinctDays: 0 }
  const { data, error } = await supabase
    .from("meditation_sessions")
    .select("started_at, duration_seconds")
    .eq("user_id", uid)
    .order("started_at", { ascending: false })
  if (error) return { totalSeconds: 0, sessionCount: 0, dayStreak: 0, distinctDays: 0 }
  const totalSeconds = (data || []).reduce((a: number, r: any) => a + (r.duration_seconds || 0), 0)
  const sessionCount = data?.length || 0
  const days = new Set<string>((data || []).map((r: any) => r.started_at.slice(0, 10)))
  let streak = 0
  let d = new Date()
  while (days.has(d.toISOString().slice(0, 10))) {
    streak += 1
    d = new Date(d.getTime() - 86400000)
  }
  return { totalSeconds, sessionCount, dayStreak: streak, distinctDays: days.size }
}

// --- Milestones ---
export type MilestoneCriteria =
  | { type: "minSessions"; value: number }
  | { type: "totalSeconds"; value: number }
  | { type: "dayStreak"; value: number }
  | { type: "distinctDays"; value: number }

export type MeditationMilestone = {
  code: string
  title: string
  description?: string
  criteria: MilestoneCriteria
}

export type UserMilestone = { milestone_code: string; awarded_at: string }

const DEFAULT_MILESTONES: MeditationMilestone[] = [
  { code: "first_session", title: "First Session", description: "Complete your first meditation session", criteria: { type: "minSessions", value: 1 } },
  { code: "week_warrior", title: "Week Warrior", description: "Meditate 7 days in a row", criteria: { type: "dayStreak", value: 7 } },
  { code: "mindful_month", title: "Mindful Month", description: "Meditate on 30 distinct days", criteria: { type: "distinctDays", value: 30 } },
  { code: "sacred_40", title: "Sacred 40", description: "Meditate on 40 distinct days", criteria: { type: "distinctDays", value: 40 } },
  { code: "quarter_master", title: "Quarter Master", description: "Meditate on 90 distinct days", criteria: { type: "distinctDays", value: 90 } },
  { code: "ten_hour_club", title: "10 Hour Club", description: "Accumulate 10 hours of meditation", criteria: { type: "totalSeconds", value: 10 * 3600 } },
  { code: "fifty_sessions", title: "50 Sessions", description: "Complete 50 meditation sessions", criteria: { type: "minSessions", value: 50 } },
  { code: "hundred_sessions", title: "100 Sessions", description: "Complete 100 meditation sessions", criteria: { type: "minSessions", value: 100 } },
]

export async function getMilestoneCatalog(): Promise<MeditationMilestone[]> {
  // Attempt to read from Supabase catalog; fall back to defaults if table missing
  try {
    const { data, error } = await supabase.from("meditation_milestones").select("code, title, description, criteria_json").order("created_at", { ascending: true })
    if (error || !data) return DEFAULT_MILESTONES
    return (data as any[]).map((r) => ({
      code: r.code,
      title: r.title,
      description: r.description || undefined,
      criteria: (typeof r.criteria_json === "string" ? JSON.parse(r.criteria_json) : r.criteria_json) as MilestoneCriteria,
    }))
  } catch {
    return DEFAULT_MILESTONES
  }
}

export async function getUserMilestoneAwards(): Promise<UserMilestone[]> {
  const uid = await getCurrentUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from("user_meditation_milestones")
    .select("milestone_code, awarded_at")
    .eq("user_id", uid)
  if (error || !data) return []
  return data as UserMilestone[]
}

function isCriteriaMet(criteria: MilestoneCriteria, stats: MeditationStats): boolean {
  switch (criteria.type) {
    case "minSessions":
      return stats.sessionCount >= criteria.value
    case "totalSeconds":
      return stats.totalSeconds >= criteria.value
    case "dayStreak":
      return stats.dayStreak >= criteria.value
    case "distinctDays":
      return stats.distinctDays >= criteria.value
    default:
      return false
  }
}

export type MilestoneWithStatus = MeditationMilestone & { achieved: boolean; awardedAt?: string }

export async function getMilestonesWithStatus(stats: MeditationStats): Promise<MilestoneWithStatus[]> {
  const [catalog, awards] = await Promise.all([getMilestoneCatalog(), getUserMilestoneAwards()])
  const awardMap = new Map(awards.map((a) => [a.milestone_code, a.awarded_at]))
  return catalog.map((m) => ({
    ...m,
    achieved: awardMap.has(m.code) || isCriteriaMet(m.criteria, stats),
    awardedAt: awardMap.get(m.code),
  }))
}

export async function awardEligibleMilestones(stats: MeditationStats): Promise<string[]> {
  const uid = await getCurrentUserId()
  if (!uid) return []
  const [catalog, awards] = await Promise.all([getMilestoneCatalog(), getUserMilestoneAwards()])
  const already = new Set(awards.map((a) => a.milestone_code))
  const newlyUnlocked = catalog.filter((m) => !already.has(m.code) && isCriteriaMet(m.criteria, stats))
  if (newlyUnlocked.length === 0) return []
  try {
    const { error } = await supabase.from("user_meditation_milestones").insert(
      newlyUnlocked.map((m) => ({ user_id: uid, milestone_code: m.code }))
    )
    if (error) throw new Error(error.message)
    // create notifications for each new award
    await supabase.from("notifications").insert(
      newlyUnlocked.map((m) => ({
        user_id: uid,
        type: "milestone",
        title: `${m.title} unlocked`,
        body: m.description || null,
        data: { code: m.code },
      })) as any
    )
  } catch {
    // fail silently; client UI still reflects achievement locally
  }
  return newlyUnlocked.map((m) => m.code)
}
