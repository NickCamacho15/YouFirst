import { supabase } from './supabase'

export type Activity = 'reading' | 'meditation' | 'screen_time' | 'workouts'
export type ActivityGoals = Record<Activity, number>

export type TodaySummary = {
  reading: { seconds: number; targetMinutes: number; percent: number }
  meditation: { seconds: number; targetMinutes: number; percent: number }
  screen_time: { seconds: number; targetMinutes: number; percent: number }
  workouts: { seconds: number; targetMinutes: number; percent: number }
}

function dayBoundsLocal(): { startISO: string; endISO: string } {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 1)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

async function sumSeconds(table: string, timeField: 'started_at' | 'startedAt' | 'started_time' = 'started_at', durationField: string = 'duration_seconds', filter?: (q: any)=> any): Promise<number> {
  const { startISO, endISO } = dayBoundsLocal()
  let query: any = supabase.from(table).select(`${durationField}`, { count: 'exact', head: false })
  if (timeField) query = query.gte(timeField as any, startISO).lt(timeField as any, endISO)
  if (filter) query = filter(query)
  const { data, error } = await query
  if (error) return 0
  return (data || []).reduce((acc: number, row: any) => acc + (Number(row[durationField]) || 0), 0)
}

export async function getActivityGoals(): Promise<ActivityGoals> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not authenticated')
  const { data, error } = await supabase.from('activity_goals').select('activity, target_minutes').eq('user_id', auth.user.id)
  if (error) throw new Error(error.message)
  const defaults: ActivityGoals = { reading: 60, meditation: 10, screen_time: 120, workouts: 30 }
  const goals: ActivityGoals = { ...defaults }
  ;(data || []).forEach((r: any) => { goals[r.activity as Activity] = r.target_minutes || 0 })
  return goals
}

export async function updateActivityGoals(partial: Partial<ActivityGoals>): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not authenticated')
  const rows = Object.entries(partial).map(([activity, minutes]) => ({ user_id: auth.user!.id, activity, target_minutes: minutes }))
  if (!rows.length) return
  const { error } = await supabase.from('activity_goals').upsert(rows as any, { onConflict: 'user_id,activity' })
  if (error) throw new Error(error.message)
}

export async function getTodaySummary(): Promise<TodaySummary> {
  const goals = await getActivityGoals()
  const [readingSec, meditationSec, screenSec, workoutSec] = await Promise.all([
    // adjust table/fields to your schema names
    sumSeconds('user_reading_sessions', 'started_at', 'duration_seconds'),
    sumSeconds('meditation_sessions', 'startedAt', 'durationSeconds'),
    sumSeconds('screen_time_entries', 'started_at', 'duration_seconds'),
    sumSeconds('workout_sessions', 'started_at', 'total_seconds', (q)=> q.eq('status','completed')),
  ])
  const pct = (sec: number, min: number) => min > 0 ? Math.min(999, Math.round((sec / (min*60)) * 100)) : 0
  return {
    reading: { seconds: readingSec, targetMinutes: goals.reading, percent: pct(readingSec, goals.reading) },
    meditation: { seconds: meditationSec, targetMinutes: goals.meditation, percent: pct(meditationSec, goals.meditation) },
    screen_time: { seconds: screenSec, targetMinutes: goals.screen_time, percent: pct(screenSec, goals.screen_time) },
    workouts: { seconds: workoutSec, targetMinutes: goals.workouts, percent: pct(workoutSec, goals.workouts) },
  }
}

// Personal Mastery Dashboard metrics
export type PersonalMastery = {
  tasksCompleted: number
  bestStreak: number
  consistencyPercent: number
  activeGoals: number
}

function toDateKeyLocal(d: Date): string {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

export async function getPersonalMasteryMetrics(): Promise<PersonalMastery> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) throw new Error('Not authenticated')

  // Current week window (Sunday–Saturday)
  const today = new Date(); today.setHours(0,0,0,0)
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)
  const weekStartKey = toDateKeyLocal(weekStart); const weekEndKey = toDateKeyLocal(weekEnd)

  // Counts for this week only
  const [tasksDoneRes, routineLogsRes, goalsCountRes] = await Promise.all([
    supabase.from('day_tasks').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('done', true).gte('task_date', weekStartKey).lt('task_date', weekEndKey),
    supabase.from('user_routine_logs').select('id,log_date', { count: 'exact' }).eq('user_id', uid).eq('completed', true).gte('log_date', weekStartKey).lt('log_date', weekEndKey),
    supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', uid),
  ])
  const tasksCompleted = (tasksDoneRes.count || 0) + (routineLogsRes.count || 0)
  const activeGoals = goalsCountRes.count || 0

  // Streak and consistency from routine logs
  const start = new Date(today); start.setDate(start.getDate() - 180)
  const startKey = toDateKeyLocal(start); const todayKey = toDateKeyLocal(today)
  const { data: streakRows, error: streakErr } = await supabase
    .from('user_routine_logs')
    .select('log_date')
    .eq('user_id', uid)
    .eq('completed', true)
    .gte('log_date', startKey)
    .lte('log_date', todayKey)
    .order('log_date')
  if (streakErr) throw new Error(streakErr.message)
  const dates = new Set((streakRows || []).map((r: any) => r.log_date as string))

  // Best streak over the fetched window
  let best = 0; let current = 0
  const probe = new Date(start)
  while (probe <= today) {
    const key = toDateKeyLocal(probe)
    if (dates.has(key)) { current += 1 } else { best = Math.max(best, current); current = 0 }
    probe.setDate(probe.getDate() + 1)
  }
  best = Math.max(best, current)

  // Consistency for this month: days with at least one completion / days elapsed this month
  const monthStart = new Date(today); monthStart.setDate(1)
  const monthDenom = today.getDate() // elapsed days including today
  let monthCount = 0
  const mm = new Date(monthStart)
  for (let i = 0; i < monthDenom; i++) { if (dates.has(toDateKeyLocal(mm))) monthCount += 1; mm.setDate(mm.getDate()+1) }
  const consistencyPercent = monthDenom > 0 ? Math.round((monthCount / monthDenom) * 100) : 0

  return { tasksCompleted, bestStreak: best, consistencyPercent, activeGoals }
}


