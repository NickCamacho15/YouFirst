import { supabase } from "./supabase"

export type TrainingPlanRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  start_date: string
  is_active: boolean
  created_at: string
}

export async function createPlanInDb(name: string, description?: string, startDate?: string, isActive: boolean = true): Promise<TrainingPlanRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from<TrainingPlanRow>("training_plans")
    .insert([{ user_id: auth.user.id, name, description: description ?? null, start_date: startDate || new Date().toISOString().slice(0,10), is_active: !!isActive }])
    .select("id, user_id, name, description, start_date, is_active, created_at")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to create plan")
  return data
}

export async function listPlans(): Promise<TrainingPlanRow[]> {
  const { data, error } = await supabase
    .from<TrainingPlanRow>("training_plans")
    .select("id, user_id, name, description, start_date, is_active, created_at")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function setActivePlan(planId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  // Clear others, set selected
  const uid = auth.user.id
  const { error: e1 } = await supabase.from<TrainingPlanRow>("training_plans").update({ is_active: false }).eq("user_id", uid)
  if (e1) throw new Error(e1.message)
  const { error: e2 } = await supabase.from<TrainingPlanRow>("training_plans").update({ is_active: true }).eq("id", planId)
  if (e2) throw new Error(e2.message)
}

export type WeekRow = { id: string; plan_id: string; user_id: string; name: string; position: number; created_at: string }
export type DayRow = { id: string; week_id: string; plan_id: string; user_id: string; name: string; position: number; created_at: string }
export type BlockRow = { id: string; day_id: string; plan_id: string; user_id: string; name: string; letter: string | null; position: number; created_at: string }
export type ExerciseRow = {
  id: string; block_id: string; plan_id: string; user_id: string; name: string; type: string; sets: string | null; reps: string | null; weight: string | null; rest: string | null; time: string | null; distance: string | null; pace: string | null; time_cap: string | null; score_type: string | null; target: string | null; position: number; created_at: string
}

export async function listPlanTree(planId: string) {
  const [weeksRes, daysRes, blocksRes, exRes] = await Promise.all([
    supabase.from<WeekRow>("plan_weeks").select("*").eq("plan_id", planId).order("position").order("created_at"),
    supabase.from<DayRow>("plan_days").select("*").eq("plan_id", planId).order("position").order("created_at"),
    supabase.from<BlockRow>("plan_blocks").select("*").eq("plan_id", planId).order("position").order("created_at"),
    supabase.from<ExerciseRow>("plan_exercises").select("*").eq("plan_id", planId).order("position").order("created_at"),
  ])
  if (weeksRes.error) throw new Error(weeksRes.error.message)
  if (daysRes.error) throw new Error(daysRes.error.message)
  if (blocksRes.error) throw new Error(blocksRes.error.message)
  if (exRes.error) throw new Error(exRes.error.message)

  const weeks = (weeksRes.data || []).map((w) => ({ ...w, days: [] as DayRow[] }))
  const weekIdToWeek = new Map(weeks.map((w) => [w.id, w]))
  const days = daysRes.data || []
  const blocks = blocksRes.data || []
  const exercises = exRes.data || []

  const dayIdToDay: Map<string, any> = new Map()
  for (const d of days) {
    const day = { ...d, blocks: [] as any[] }
    dayIdToDay.set(d.id, day)
    weekIdToWeek.get(d.week_id)?.days.push(day)
  }
  const blockIdToBlock: Map<string, any> = new Map()
  for (const b of blocks) {
    const block = { ...b, exercises: [] as ExerciseRow[] }
    blockIdToBlock.set(b.id, block)
    dayIdToDay.get(b.day_id)?.blocks.push(block)
  }
  for (const e of exercises) {
    blockIdToBlock.get(e.block_id)?.exercises.push(e)
  }
  return weeks
}

export async function createWeek(planId: string, name: string, position: number): Promise<WeekRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { data, error } = await supabase.from<WeekRow>("plan_weeks").insert([{ plan_id: planId, user_id: auth.user.id, name, position }]).select("*").single()
  if (error || !data) throw new Error(error?.message || "Failed to create week")
  return data
}

export async function createDay(planId: string, weekId: string, name: string, position: number): Promise<DayRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { data, error } = await supabase.from<DayRow>("plan_days").insert([{ plan_id: planId, week_id: weekId, user_id: auth.user.id, name, position }]).select("*").single()
  if (error || !data) throw new Error(error?.message || "Failed to create day")
  return data
}

export async function createBlock(planId: string, dayId: string, name: string, letter: string, position: number): Promise<BlockRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { data, error } = await supabase.from<BlockRow>("plan_blocks").insert([{ plan_id: planId, day_id: dayId, user_id: auth.user.id, name, letter, position }]).select("*").single()
  if (error || !data) throw new Error(error?.message || "Failed to create block")
  return data
}

export async function createExercise(planId: string, blockId: string, payload: { name: string; type: string; sets?: string; reps?: string; weight?: string; rest?: string; time?: string; distance?: string; pace?: string; time_cap?: string; score_type?: string; target?: string; position: number }): Promise<ExerciseRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from<ExerciseRow>("plan_exercises")
    .insert([{ plan_id: planId, block_id: blockId, user_id: auth.user.id, name: payload.name, type: payload.type, sets: payload.sets ?? null, reps: payload.reps ?? null, weight: payload.weight ?? null, rest: payload.rest ?? null, time: payload.time ?? null, distance: payload.distance ?? null, pace: payload.pace ?? null, time_cap: payload.time_cap ?? null, score_type: payload.score_type ?? null, target: payload.target ?? null, position: payload.position }])
    .select("*")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to create exercise")
  return data
}

export async function updateExercise(id: string, payload: Partial<Omit<ExerciseRow, "id" | "block_id" | "plan_id" | "user_id" | "created_at" | "position">>): Promise<void> {
  const { error } = await supabase
    .from<ExerciseRow>("plan_exercises")
    .update(payload)
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteExercises(ids: string[]): Promise<void> {
  if (!ids.length) return
  const { error } = await supabase
    .from<ExerciseRow>("plan_exercises")
    .delete()
    .in("id", ids)
  if (error) throw new Error(error.message)
}


