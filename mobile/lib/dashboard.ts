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


