import { supabase } from './supabase'
import { getCurrentUserId } from './auth'
import { listRoutines, listRoutineCompletionsByDate } from './routines'
import { listTasksByDate } from './tasks'

type WinsRow = { id: string; user_id: string; win_date: string; created_at: string }

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0,0,0,0); return x }
function toDateKeyLocal(d: Date): string { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }
function parseDateKeyLocal(key: string): Date { const [y,m,d] = key.split('-').map(Number); return startOfDay(new Date(y, (m||1)-1, d||1)) }

// --------- Events (wins and dependencies such as routines/tasks) ---------
type Listener = () => void
const listeners = new Set<Listener>()
export function subscribeWins(listener: Listener): () => void { listeners.add(listener); return () => { listeners.delete(listener) } }
export function emitWinsChanged(): void { for (const l of Array.from(listeners)) { try { l() } catch {} } }

// --------- Queries ---------
export async function hasWon(dateKey?: string): Promise<boolean> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const key = dateKey || toDateKeyLocal(startOfDay(new Date()))
  const { data, error } = await supabase
    .from<WinsRow>('user_wins')
    .select('win_date')
    .eq('user_id', uid)
    .eq('win_date', key)
    .maybeSingle()
  if (error) return false
  return !!data
}

export async function listWinsBetween(startKey: string, endKeyInclusive: string): Promise<Set<string>> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from<WinsRow>('user_wins')
    .select('win_date')
    .eq('user_id', uid)
    .gte('win_date', startKey)
    .lte('win_date', endKeyInclusive)
    .order('win_date')
  if (error) return new Set<string>()
  const set = new Set<string>()
  for (const row of data || []) set.add(row.win_date)
  return set
}

export async function markWon(dateKey?: string): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const key = dateKey || toDateKeyLocal(startOfDay(new Date()))
  const payload = { user_id: uid, win_date: key }
  // Prefer simple insert and ignore duplicates; fall back to alternate upsert if server requires conflict target
  let error: any | null = null
  try {
    const res = await supabase.from('user_wins').insert([payload])
    error = res.error
  } catch (e: any) {
    error = e
  }
  if (error) {
    const msg = String(error.message || '')
    const code = String(error.code || '')
    const isDuplicate = code === '23505' || /duplicate key|unique constraint/i.test(msg)
    if (!isDuplicate) {
      // Try alternate upsert conflict target order as a fallback
      const up = await supabase.from('user_wins').upsert([payload] as any, { onConflict: 'win_date,user_id' })
      if (up.error) throw new Error(up.error.message)
    }
  }
  emitWinsChanged()
}

export async function getStreaks(): Promise<{ current: number; best: number }> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const today = startOfDay(new Date())
  const start = new Date(today); start.setDate(start.getDate() - 365)
  const startKey = toDateKeyLocal(start)
  const todayKey = toDateKeyLocal(today)
  const { data, error } = await supabase
    .from<WinsRow>('user_wins')
    .select('win_date')
    .eq('user_id', uid)
    .gte('win_date', startKey)
    .lte('win_date', todayKey)
    .order('win_date')
  if (error) throw new Error(error.message)
  const dates = new Set<string>((data || []).map((r) => r.win_date))
  let best = 0; let current = 0
  const probe = new Date(start)
  while (probe <= today) {
    const key = toDateKeyLocal(probe)
    if (dates.has(key)) { current += 1 } else { best = Math.max(best, current); current = 0 }
    probe.setDate(probe.getDate() + 1)
  }
  best = Math.max(best, current)
  return { current, best }
}

export type Eligibility = {
  allComplete: boolean;
  missing: { morning: boolean; tasks: boolean; evening: boolean };
  hasAnyConfigured: boolean;
}

export async function checkEligibility(dateKey?: string): Promise<Eligibility> {
  const key = dateKey || toDateKeyLocal(startOfDay(new Date()))
  // Morning routines
  const m = await listRoutines('morning')
  const mIds = m.map(r => r.id)
  const mMap = mIds.length ? await listRoutineCompletionsByDate(mIds, key) : {}
  const morningDone = mIds.length === 0 ? true : mIds.every(id => !!mMap[id])
  // Evening routines
  const e = await listRoutines('evening')
  const eIds = e.map(r => r.id)
  const eMap = eIds.length ? await listRoutineCompletionsByDate(eIds, key) : {}
  const eveningDone = eIds.length === 0 ? true : eIds.every(id => !!eMap[id])
  // Tasks
  const tasks = await listTasksByDate(key)
  const tasksDone = tasks.length === 0 ? true : tasks.every(t => !!t.done)
  // New behavior: if nothing is configured yet across morning, tasks, and evening,
  // the user should not be considered eligible to win the day.
  const hasAnyConfigured = (mIds.length > 0) || (eIds.length > 0) || (tasks.length > 0)
  const allComplete = hasAnyConfigured && morningDone && eveningDone && tasksDone
  return {
    allComplete,
    missing: { morning: !morningDone, tasks: !tasksDone, evening: !eveningDone },
    hasAnyConfigured,
  }
}

// Helpers for calendar
export async function getWinsForMonth(d: Date): Promise<Set<string>> {
  const y = d.getFullYear(); const m = d.getMonth()
  const start = toDateKeyLocal(new Date(y, m, 1))
  const end = toDateKeyLocal(new Date(y, m + 1, 0))
  return listWinsBetween(start, end)
}

export { toDateKeyLocal as toDateKey, parseDateKeyLocal as parseDateKey }


