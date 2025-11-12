import { supabase } from './supabase'
import { getCurrentUserId } from './auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { listRoutines, listRoutineCompletionsByDate } from './routines'
import { listTasksByDate } from './tasks'
import { cacheGet, cacheSet, cacheInvalidatePrefix } from './cache'

type WinsRow = { id: string; user_id: string; win_date: string; created_at: string }

export type DailyWinStatus = {
  dateKey: string;
  intentionMorning: boolean;
  intentionEvening: boolean;
  criticalTasks: boolean;
  workout: boolean;
  reading: boolean;
  prayerMeditation: boolean;
  allComplete: boolean;
}

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0,0,0,0); return x }
function toDateKeyLocal(d: Date): string { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }
function parseDateKeyLocal(key: string): Date { const [y,m,d] = key.split('-').map(Number); return startOfDay(new Date(y, (m||1)-1, d||1)) }

function dayBoundsFromDateKeyLocal(key: string): { startISO: string; endISO: string } {
  const start = parseDateKeyLocal(key)
  const end = new Date(start)
  end.setDate(start.getDate() + 1)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

// --------- Events (wins and dependencies such as routines/tasks) ---------
type Listener = () => void
const listeners = new Set<Listener>()
export function subscribeWins(listener: Listener): () => void { listeners.add(listener); return () => { listeners.delete(listener) } }
export function emitWinsChanged(): void { for (const l of Array.from(listeners)) { try { l() } catch {} } }

// --------- Queries ---------
export type DailyComponent = 'intention_morning' | 'intention_evening' | 'tasks' | 'workout' | 'reading' | 'prayer_meditation'

export async function setDailyOverride(component: DailyComponent, completed: boolean, dateKey?: string): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const key = dateKey || toDateKeyLocal(startOfDay(new Date()))
  if (completed) {
    const { error } = await supabase
      .from('user_daily_overrides')
      .upsert([{ user_id: uid, day: key, component, completed: true }] as any, { onConflict: 'user_id,day,component' })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('user_daily_overrides')
      .delete()
      .eq('user_id', uid)
      .eq('day', key)
      .eq('component', component)
    if (error) throw new Error(error.message)
  }
  emitWinsChanged()
}
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
  const cacheKey = `wins:${uid}:${startKey}:${endKeyInclusive}`
  
  // Check in-memory cache first (fastest)
  const memCached = cacheGet<Set<string>>(cacheKey)
  if (memCached) return memCached
  
  // Check AsyncStorage for persistent cache (instant on app restart)
  try {
    const persistentCached = await AsyncStorage.getItem(cacheKey)
    if (persistentCached) {
      const dates: string[] = JSON.parse(persistentCached)
      const set = new Set<string>(dates)
      cacheSet(cacheKey, set, 5 * 60) // Also set in-memory cache
      // Don't refresh immediately - warmStartupCaches will handle it
      return set
    }
  } catch {}
  
  // No cache, fetch fresh
  return await refreshWinsBetween(uid, startKey, endKeyInclusive, cacheKey)
}

async function refreshWinsBetween(uid: string, startKey: string, endKeyInclusive: string, cacheKey: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from<WinsRow>('user_wins')
    .select('win_date')
    .eq('user_id', uid)
    .gte('win_date', startKey)
    .lte('win_date', endKeyInclusive)
    .order('win_date')
  if (error) return new Set<string>()
  const set = new Set<string>()
  for (const row of data || []) {
    // Normalize to YYYY-MM-DD in case drivers return full timestamps
    const key = String((row as any).win_date || '').slice(0, 10)
    if (key) set.add(key)
  }
  
  // Cache in memory
  cacheSet(cacheKey, set, 5 * 60 * 1000)
  
  // Persist to AsyncStorage for instant load on next app start
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(Array.from(set)))
  } catch {}
  
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
  // Invalidate caches related to wins for this user
  cacheInvalidatePrefix(`wins:${uid}:`)
  // Invalidate daily status cache for this date
  try { await AsyncStorage.removeItem(`winStatus:${uid}:${key}`) } catch {}
  // Also invalidate persistent caches so UI refreshes immediately:
  // - Remove any stored month wins sets (keys prefixed with wins:${uid}:)
  // - Remove streaks cache so counters recompute
  try {
    const allKeys = await AsyncStorage.getAllKeys()
    const winsPrefix = `wins:${uid}:`
    const toRemove = allKeys.filter(k => k.startsWith(winsPrefix) || k === `${STREAKS_CACHE_KEY}_${uid}`)
    if (toRemove.length) {
      await AsyncStorage.multiRemove(toRemove)
    }
  } catch {}
  emitWinsChanged()
}

const STREAKS_CACHE_KEY = 'youfirst_streaks_v1'

export async function getStreaks(): Promise<{ current: number; best: number }> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  
  // Try cache first for instant load
  try {
    const cached = await AsyncStorage.getItem(`${STREAKS_CACHE_KEY}_${uid}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      // Return cached immediately - warmStartupCaches will refresh it
      return parsed
    }
  } catch {}
  
  // No cache, fetch fresh
  return await refreshStreaks(uid)
}

// Always fetch fresh streaks, bypassing cache (used after win events)
export async function getStreaksFresh(): Promise<{ current: number; best: number }> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  return await refreshStreaks(uid)
}

async function refreshStreaks(uid: string): Promise<{ current: number; best: number }> {
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
  const result = { current, best }
  
  // Cache the result
  try {
    await AsyncStorage.setItem(`${STREAKS_CACHE_KEY}_${uid}`, JSON.stringify(result))
  } catch {}
  
  return result
}

export type Eligibility = {
  allComplete: boolean;
  missing: { morning: boolean; evening: boolean; tasks: boolean; workout: boolean; reading: boolean; prayerMeditation: boolean };
  hasAnyConfigured: boolean;
}

export async function getDailyWinStatus(dateKey?: string): Promise<DailyWinStatus> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const key = dateKey || toDateKeyLocal(startOfDay(new Date()))
  const cacheKey = `winStatus:${uid}:${key}`
  const cached = cacheGet<DailyWinStatus>(cacheKey)
  if (cached) return cached
  // Try persisted cache (snappy render on cold start)
  try {
    const raw = await AsyncStorage.getItem(cacheKey)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object' && typeof obj.exp === 'number' && obj.data) {
        if (Date.now() < obj.exp) {
          cacheSet(cacheKey, obj.data as DailyWinStatus, Math.max(1000, obj.exp - Date.now()))
          return obj.data as DailyWinStatus
        }
      }
    }
  } catch {}

  // Intention: morning
  const morningRoutines = await listRoutines('morning')
  const morningIds = morningRoutines.map(r => r.id)
  const morningMap = morningIds.length ? await listRoutineCompletionsByDate(morningIds, key) : {}
  const intentionMorning = morningIds.length > 0 && morningIds.every(id => !!morningMap[id])

  // Intention: evening
  const eveningRoutines = await listRoutines('evening')
  const eveningIds = eveningRoutines.map(r => r.id)
  const eveningMap = eveningIds.length ? await listRoutineCompletionsByDate(eveningIds, key) : {}
  const intentionEvening = eveningIds.length > 0 && eveningIds.every(id => !!eveningMap[id])

  // Tasks: at least one done today
  const tasks = await listTasksByDate(key)
  const criticalTasks = tasks.some(t => !!t.done)

  // Sessions today (local bounds)
  const { startISO, endISO } = dayBoundsFromDateKeyLocal(key)
  const [workoutCnt, readingCnt, meditationCnt] = await Promise.all([
    supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'completed').gte('started_at', startISO).lt('started_at', endISO),
    supabase.from('user_reading_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('started_at', startISO).lt('started_at', endISO),
    supabase.from('meditation_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('started_at', startISO).lt('started_at', endISO),
  ])
  const workout = (workoutCnt.count || 0) > 0
  const reading = (readingCnt.count || 0) > 0
  const prayerMeditation = (meditationCnt.count || 0) > 0

  // Overrides per component for the date
  const { data: overrides } = await supabase
    .from('user_daily_overrides')
    .select('component, completed')
    .eq('user_id', uid)
    .eq('day', key)

  let m = intentionMorning
  let e = intentionEvening
  let t = criticalTasks
  let w = workout
  let r = reading
  let p = prayerMeditation
  for (const row of overrides || []) {
    switch (row.component) {
      case 'intention_morning': m = !!row.completed; break
      case 'intention_evening': e = !!row.completed; break
      case 'tasks': t = !!row.completed; break
      case 'workout': w = !!row.completed; break
      case 'reading': r = !!row.completed; break
      case 'prayer_meditation': p = !!row.completed; break
    }
  }

  const allComplete = m && e && t && w && r && p
  const out: DailyWinStatus = { dateKey: key, intentionMorning: m, intentionEvening: e, criticalTasks: t, workout: w, reading: r, prayerMeditation: p, allComplete }
  // Past days can be cached longer; today should refresh more frequently
  const todayKey = toDateKeyLocal(startOfDay(new Date()))
  const ttl = key === todayKey ? 5 * 60 * 1000 : 12 * 60 * 60 * 1000
  cacheSet(cacheKey, out, ttl)
  try { await AsyncStorage.setItem(cacheKey, JSON.stringify({ exp: Date.now() + ttl, data: out })) } catch {}
  return out
}

export async function listDailyStatusesBetween(startKey: string, endKeyInclusive: string): Promise<Record<string, DailyWinStatus>> {
  const start = parseDateKeyLocal(startKey)
  const end = parseDateKeyLocal(endKeyInclusive)
  const out: Record<string, DailyWinStatus> = {}
  const keys: string[] = []
  const cur = new Date(start)
  while (cur <= end) { keys.push(toDateKeyLocal(cur)); cur.setDate(cur.getDate() + 1) }
  // First try memory/persisted cache to render instantly
  const uid = await getCurrentUserId().catch(() => null)
  const results: Array<DailyWinStatus | null> = new Array(keys.length).fill(null)
  if (uid) {
    await Promise.all(keys.map(async (k, i) => {
      const ck = `winStatus:${uid}:${k}`
      const mem = cacheGet<DailyWinStatus>(ck)
      if (mem) { results[i] = mem; return }
      try {
        const raw = await AsyncStorage.getItem(ck)
        if (raw) {
          const obj = JSON.parse(raw)
          if (obj && typeof obj.exp === 'number' && obj.data && Date.now() < obj.exp) {
            results[i] = obj.data as DailyWinStatus
            cacheSet(ck, results[i]!, Math.max(1000, obj.exp - Date.now()))
          }
        }
      } catch {}
    }))
  }
  // Fetch any missing statuses - OPTIMIZED with pre-fetched routines
  const missing: string[] = []
  results.forEach((r, i) => { if (!r) missing.push(keys[i]) })
  if (missing.length) {
    // PRE-FETCH routines once for ALL days (huge optimization!)
    const [morningRoutines, eveningRoutines] = await Promise.all([
      listRoutines('morning').catch(() => []),
      listRoutines('evening').catch(() => [])
    ])
    const morningIds = morningRoutines.map(r => r.id)
    const eveningIds = eveningRoutines.map(r => r.id)
    
    const limit = 12 // Increased from 8 to 12 for even faster loading
    let idx = 0
    async function worker() {
      while (idx < missing.length) {
        const k = missing[idx++]
        try { 
          // Pass pre-fetched routines to avoid redundant queries
          const s = await getDailyWinStatusOptimized(k, uid!, morningIds, eveningIds)
          const pos = keys.indexOf(k)
          if (pos >= 0) results[pos] = s
        } catch {}
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, missing.length) }, () => worker()))
  }
  results.forEach((r, i) => { if (r) out[keys[i]] = r })
  return out
}

// Optimized version that accepts pre-fetched routine IDs
async function getDailyWinStatusOptimized(
  dateKey: string, 
  uid: string,
  morningRoutineIds: string[],
  eveningRoutineIds: string[]
): Promise<DailyWinStatus> {
  const key = dateKey
  
  // Check if already fetched and cached during this batch
  const cacheKey = `winStatus:${uid}:${key}`
  const cached = cacheGet<DailyWinStatus>(cacheKey)
  if (cached) return cached

  // Fetch routine completions using pre-fetched IDs (saves 2 queries per day!)
  const morningMap = morningRoutineIds.length ? await listRoutineCompletionsByDate(morningRoutineIds, key) : {}
  const intentionMorning = morningRoutineIds.length > 0 && morningRoutineIds.every(id => !!morningMap[id])

  const eveningMap = eveningRoutineIds.length ? await listRoutineCompletionsByDate(eveningRoutineIds, key) : {}
  const intentionEvening = eveningRoutineIds.length > 0 && eveningRoutineIds.every(id => !!eveningMap[id])

  // Tasks
  const tasks = await listTasksByDate(key)
  const criticalTasks = tasks.some(t => !!t.done)

  // Sessions (parallel)
  const { startISO, endISO } = dayBoundsFromDateKeyLocal(key)
  const [workoutCnt, readingCnt, meditationCnt] = await Promise.all([
    supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'completed').gte('started_at', startISO).lt('started_at', endISO),
    supabase.from('user_reading_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('started_at', startISO).lt('started_at', endISO),
    supabase.from('meditation_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('started_at', startISO).lt('started_at', endISO),
  ])
  const workout = (workoutCnt.count || 0) > 0
  const reading = (readingCnt.count || 0) > 0
  const prayerMeditation = (meditationCnt.count || 0) > 0

  // Overrides
  const { data: overrides } = await supabase
    .from('user_daily_overrides')
    .select('component, completed')
    .eq('user_id', uid)
    .eq('day', key)

  let m = intentionMorning
  let e = intentionEvening
  let t = criticalTasks
  let w = workout
  let r = reading
  let p = prayerMeditation
  for (const row of overrides || []) {
    switch (row.component) {
      case 'intention_morning': m = !!row.completed; break
      case 'intention_evening': e = !!row.completed; break
      case 'tasks': t = !!row.completed; break
      case 'workout': w = !!row.completed; break
      case 'reading': r = !!row.completed; break
      case 'prayer_meditation': p = !!row.completed; break
    }
  }

  const allComplete = m && e && t && w && r && p
  const out: DailyWinStatus = { dateKey: key, intentionMorning: m, intentionEvening: e, criticalTasks: t, workout: w, reading: r, prayerMeditation: p, allComplete }
  
  // Cache the result
  const todayKey = toDateKeyLocal(startOfDay(new Date()))
  const ttl = key === todayKey ? 5 * 60 * 1000 : 12 * 60 * 60 * 1000
  cacheSet(cacheKey, out, ttl)
  try { await AsyncStorage.setItem(cacheKey, JSON.stringify({ exp: Date.now() + ttl, data: out })) } catch {}
  
  return out
}

export async function checkEligibility(dateKey?: string): Promise<Eligibility> {
  const key = dateKey || toDateKeyLocal(startOfDay(new Date()))
  const status = await getDailyWinStatus(key)
  // Configuration gate: routines/tasks presence
  const [morningRoutines, eveningRoutines, tasks] = await Promise.all([
    listRoutines('morning'),
    listRoutines('evening'),
    listTasksByDate(key),
  ])
  const hasAnyConfigured = morningRoutines.length > 0 || eveningRoutines.length > 0 || tasks.length > 0
  return {
    allComplete: status.allComplete,
    missing: {
      morning: !status.intentionMorning,
      evening: !status.intentionEvening,
      tasks: !status.criticalTasks,
      workout: !status.workout,
      reading: !status.reading,
      prayerMeditation: !status.prayerMeditation,
    },
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

export async function invalidateDailyStatus(dateKey?: string): Promise<void> {
  try {
    const uid = await getCurrentUserId()
    if (!uid) return
    const key = dateKey || toDateKeyLocal(startOfDay(new Date()))
    cacheInvalidatePrefix(`winStatus:${uid}:${key}`)
    cacheInvalidatePrefix(`winDetails:${uid}:${key}`)
    try { await AsyncStorage.removeItem(`winStatus:${uid}:${key}`) } catch {}
    try { await AsyncStorage.removeItem(`winDetails:${uid}:${key}`) } catch {}
  } catch {}
}

// --------- Details API ---------
export type DailyWinDetails = {
  dateKey: string
  intentionMorning: Array<{ id: string; title: string; completed: boolean }>
  intentionEvening: Array<{ id: string; title: string; completed: boolean }>
  tasks: Array<{ id: string; title: string; done: boolean; timeText?: string | null }>
  workout: Array<{ id: string; startedAt: string; durationSec: number; planName?: string | null }>
  reading: Array<{ id: string; startedAt: string; durationSec: number; bookTitle?: string | null }>
  center: Array<{ id: string; startedAt: string; durationSec: number }>
}

export async function getDailyWinDetails(dateKey?: string): Promise<DailyWinDetails> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const key = dateKey || toDateKeyLocal(startOfDay(new Date()))
  const cacheKey = `winDetails:${uid}:${key}`
  const cached = cacheGet<DailyWinDetails>(cacheKey)
  if (cached) return cached
  try { const raw = await AsyncStorage.getItem(cacheKey); if (raw) { const obj = JSON.parse(raw); if (obj?.exp && obj?.data && Date.now() < obj.exp) { cacheSet(cacheKey, obj.data, obj.exp - Date.now()); return obj.data } } } catch {}

  const { startISO, endISO } = dayBoundsFromDateKeyLocal(key)

  // Routines
  const [mRows, eRows] = await Promise.all([listRoutines('morning'), listRoutines('evening')])
  const mMap = mRows.length ? await listRoutineCompletionsByDate(mRows.map(r=>r.id), key) : {}
  const eMap = eRows.length ? await listRoutineCompletionsByDate(eRows.map(r=>r.id), key) : {}

  // Tasks
  const tasks = await listTasksByDate(key)

  // Sessions (basic fields only to keep it light)
  const [workoutRes, readingRes, medRes] = await Promise.all([
    supabase.from('workout_sessions').select('id, started_at, total_seconds, status, plan_id', { head: false })
      .eq('user_id', uid).gte('started_at', startISO).lt('started_at', endISO).order('started_at'),
    supabase.from('user_reading_sessions').select('id, started_at, duration_seconds, book_title', { head: false })
      .eq('user_id', uid).gte('started_at', startISO).lt('started_at', endISO).order('started_at'),
    supabase.from('meditation_sessions').select('id, started_at, duration_seconds', { head: false })
      .eq('user_id', uid).gte('started_at', startISO).lt('started_at', endISO).order('started_at'),
  ])

  const details: DailyWinDetails = {
    dateKey: key,
    intentionMorning: mRows.map(r => ({ id: r.id, title: r.title, completed: !!mMap[r.id] })),
    intentionEvening: eRows.map(r => ({ id: r.id, title: r.title, completed: !!eMap[r.id] })),
    tasks: tasks.map(t => ({ id: t.id, title: t.title, done: !!t.done, timeText: t.time_text })),
    workout: (workoutRes.data || []).map((s: any) => ({ id: s.id, startedAt: s.started_at, durationSec: Number(s.total_seconds) || 0, planName: null })),
    reading: (readingRes.data || []).map((s: any) => ({ id: s.id, startedAt: s.started_at, durationSec: Number(s.duration_seconds) || 0, bookTitle: s.book_title || null })),
    center: (medRes.data || []).map((s: any) => ({ id: s.id, startedAt: s.started_at, durationSec: Number(s.duration_seconds) || 0 })),
  }

  const todayKey = toDateKeyLocal(startOfDay(new Date()))
  const ttl = key === todayKey ? 5 * 60 * 1000 : 12 * 60 * 60 * 1000
  cacheSet(cacheKey, details, ttl)
  try { await AsyncStorage.setItem(cacheKey, JSON.stringify({ exp: Date.now() + ttl, data: details })) } catch {}
  return details
}

