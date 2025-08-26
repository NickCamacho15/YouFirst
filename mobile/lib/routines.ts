import { supabase } from './supabase'

export type RoutineType = 'morning' | 'evening'
export type RoutineRow = {
  id: string
  user_id: string
  routine_type: RoutineType
  title: string
  position: number
  created_at: string
}

export type RoutineStats = {
  routineId: string
  streakDays: number
  weekPercent: number
  completedToday: boolean
}

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0,0,0,0); return x }
function toDateKeyLocal(d: Date): string { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }
function parseDateKeyLocal(key: string): Date { const [y,m,d] = key.split('-').map(Number); return startOfDay(new Date(y, (m||1)-1, d||1)) }

export async function listRoutines(type: RoutineType): Promise<RoutineRow[]> {
  try {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from<RoutineRow>('user_routines')
      .select('id,user_id,routine_type,title,position,created_at')
      .eq('user_id', auth.user.id)
      .eq('routine_type', type)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  } catch {
    return []
  }
}

export async function createRoutine(type: RoutineType, title: string, position?: number): Promise<RoutineRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from<RoutineRow>('user_routines')
    .insert([{ user_id: auth.user.id, routine_type: type, title, position: position ?? 0 }])
    .select('id,user_id,routine_type,title,position,created_at')
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to create routine')
  return data
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('user_routines').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function toggleRoutineCompleted(routineId: string, completed: boolean, dateKey?: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not authenticated')
  const today = toDateKeyLocal(startOfDay(new Date()))
  const key = dateKey || today
  if (completed) {
    const { error } = await supabase.from('user_routine_logs').upsert([{ user_id: auth.user.id, routine_id: routineId, log_date: key, completed: true }], { onConflict: 'routine_id,log_date' })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('user_routine_logs').delete().eq('routine_id', routineId).eq('log_date', key)
    if (error) throw new Error(error.message)
  }
}

export async function getRoutineStats(routineIds: string[], anchorISO?: string): Promise<Record<string, RoutineStats>> {
  if (!routineIds.length) return {}
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not authenticated')
  const anchor = startOfDay(anchorISO ? parseDateKeyLocal(anchorISO) : new Date())
  // Define week window containing the anchor
  const weekStart = startOfDay(new Date(anchor))
  const day = weekStart.getDay(); const diff = (day === 0 ? -6 : 1) - day
  weekStart.setDate(weekStart.getDate() + diff)
  const weekEnd = startOfDay(new Date(weekStart)); weekEnd.setDate(weekStart.getDate() + 7)
  // Fetch a rolling window to compute streak across week boundaries
  const streakFrom = startOfDay(new Date(anchor)); streakFrom.setDate(anchor.getDate() - 60)
  const { data, error } = await supabase
    .from('user_routine_logs')
    .select('routine_id, log_date, completed')
    .eq('user_id', auth.user.id)
    .in('routine_id', routineIds)
    .gte('log_date', toDateKeyLocal(streakFrom))
    .lte('log_date', toDateKeyLocal(anchor))
  if (error) throw new Error(error.message)
  // Aggregate per routine
  const byIdAll: Record<string, Set<string>> = {}
  for (const id of routineIds) byIdAll[id] = new Set<string>()
  for (const row of data || []) { if (row.completed) byIdAll[row.routine_id].add(row.log_date) }
  const stats: Record<string, RoutineStats> = {}
  for (const id of routineIds) {
    const datesAll = byIdAll[id]
    const anchorKey = toDateKeyLocal(anchor)
    const completedToday = datesAll.has(anchorKey)
    // streak to anchor
    let streak = 0
    const probe = new Date(anchor)
    while (true) {
      const key = toDateKeyLocal(probe)
      if (datesAll.has(key)) { streak += 1; probe.setDate(probe.getDate()-1) } else { break }
    }
    // week percent for the anchor's week
    let weekCount = 0
    const d = new Date(weekStart)
    for (let i = 0; i < 7; i++) { const k = toDateKeyLocal(d); if (datesAll.has(k)) weekCount += 1; d.setDate(d.getDate()+1) }
    const weekPercent = Math.round((weekCount / 7) * 100)
    stats[id] = { routineId: id, streakDays: streak, weekPercent, completedToday }
  }
  return stats
}

export async function listRoutineCompletionsByDate(routineIds: string[], dateKey: string): Promise<Record<string, boolean>> {
  if (!routineIds.length) return {}
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('user_routine_logs')
    .select('routine_id, log_date, completed')
    .eq('user_id', auth.user.id)
    .in('routine_id', routineIds)
    .eq('log_date', dateKey)
  if (error) throw new Error(error.message)
  const map: Record<string, boolean> = {}
  for (const row of data || []) { map[row.routine_id] = !!row.completed }
  return map
}


