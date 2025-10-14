import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"

export type PersonalRecords = {
  user_id: string
  bench_press_1rm: number | null
  squat_1rm: number | null
  deadlift_1rm: number | null
  overhead_press_1rm: number | null
  updated_at?: string
}

const TABLE = "personal_records"

export async function getPersonalRecords(): Promise<PersonalRecords | null> {
  const cached = getCachedPersonalRecords()
  if (cached) return cached
  const { data, error } = await supabase
    .from<PersonalRecords>(TABLE)
    .select("user_id, bench_press_1rm, squat_1rm, deadlift_1rm, overhead_press_1rm, updated_at")
    .single()

  if (error) {
    // eslint-disable-next-line no-console
    console.warn("getPersonalRecords error:", error.message)
    return null
  }
  personalRecordsCache = data || null
  personalRecordsCacheAt = Date.now()
  return data
}

export async function upsertPersonalRecords(input: Omit<PersonalRecords, "user_id" | "updated_at">): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")
  const payload: Partial<PersonalRecords> = {
    user_id: uid,
    bench_press_1rm: input.bench_press_1rm,
    squat_1rm: input.squat_1rm,
    deadlift_1rm: input.deadlift_1rm,
    overhead_press_1rm: input.overhead_press_1rm,
  }
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "user_id" })
  if (error) throw new Error(error.message)
}

export type PrLift = 'bench' | 'squat' | 'deadlift' | 'ohp'
export type PrHistoryRow = { id: string; user_id: string; lift: PrLift; value: number; recorded_at: string }

export async function addPrEntry(lift: PrLift, value: number, recordedAt?: Date): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const { error } = await supabase
    .from<PrHistoryRow>('personal_record_history')
    .insert([{ user_id: uid, lift, value, recorded_at: recordedAt ? recordedAt.toISOString() : new Date().toISOString() } as any])
  if (error) throw new Error(error.message)
}

export async function getPrSeries(lift: PrLift, limit = 100): Promise<Array<{ recorded_at: string; value: number }>> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const cached = getCachedPrSeries(lift)
  if (cached) return cached
  const { data, error } = await supabase
    .from<PrHistoryRow>('personal_record_history')
    .select('recorded_at, value')
    .eq('user_id', uid)
    .eq('lift', lift)
    .order('recorded_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  const rows = (data || [])
  setPrSeriesCache(lift, rows)
  return rows
  return (data || [])
}

// ---- Simple caches ----
let personalRecordsCache: PersonalRecords | null = null
let personalRecordsCacheAt = 0
const prSeriesCache: Partial<Record<PrLift, Array<{ recorded_at: string; value: number }>>> = {}
const prSeriesCacheAt: Partial<Record<PrLift, number>> = {}

export function getCachedPersonalRecords(maxAgeMs = 30000): PersonalRecords | null {
  if (!personalRecordsCache || Date.now() - personalRecordsCacheAt > maxAgeMs) return null
  return personalRecordsCache
}

function setPrSeriesCache(lift: PrLift, rows: Array<{ recorded_at: string; value: number }>): void {
  prSeriesCache[lift] = rows
  prSeriesCacheAt[lift] = Date.now()
}

export function getCachedPrSeries(lift: PrLift, maxAgeMs = 30000): Array<{ recorded_at: string; value: number }> | null {
  const at = prSeriesCacheAt[lift]
  const rows = prSeriesCache[lift]
  if (!rows || !at || Date.now() - at > maxAgeMs) return null
  return rows
}

// ===== Custom PRs (arbitrary exercises) =====

export type CustomPr = {
  id: string
  user_id: string
  exercise_name: string
  pr_lbs: number
  exercise_library_id?: string | null
  updated_at: string
}

const CUSTOM_TABLE = 'personal_records_custom'
const CUSTOM_HISTORY_TABLE = 'personal_record_history_custom'

export async function addOrUpdateCustomPr(exerciseName: string, valueLbs: number): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const name = (exerciseName || '').trim()
  if (!name) throw new Error('Exercise name is required')
  if (!(valueLbs >= 0)) throw new Error('Weight must be a non-negative number')

  // Upsert current PR
  const { error: upsertErr } = await supabase
    .from(CUSTOM_TABLE)
    .upsert({ user_id: uid, exercise_name: name, pr_lbs: valueLbs }, { onConflict: 'user_id,exercise_name' } as any)
  if (upsertErr) throw new Error(upsertErr.message)

  // Insert history row
  const { error: histErr } = await supabase
    .from(CUSTOM_HISTORY_TABLE)
    .insert([{ user_id: uid, exercise_name: name, value: valueLbs } as any])
  if (histErr) throw new Error(histErr.message)
}

export async function listCustomPrs(limit = 100): Promise<CustomPr[]> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from<CustomPr>(CUSTOM_TABLE)
    .select('id, user_id, exercise_name, pr_lbs, exercise_library_id, updated_at')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data || []
}
