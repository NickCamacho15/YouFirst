import { supabase } from "./supabase"

export type TrainingPlanRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
}

export async function createPlanInDb(name: string, description?: string): Promise<TrainingPlanRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from<TrainingPlanRow>("training_plans")
    .insert([{ user_id: auth.user.id, name, description: description ?? null }])
    .select("id, user_id, name, description, created_at")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to create plan")
  return data
}

export async function listPlans(): Promise<TrainingPlanRow[]> {
  const { data, error } = await supabase
    .from<TrainingPlanRow>("training_plans")
    .select("id, user_id, name, description, created_at")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export type WeekRow = { id: string; plan_id: string; user_id: string; name: string; position: number; created_at: string }
export type DayRow = { id: string; week_id: string; plan_id: string; user_id: string; name: string; position: number; created_at: string }
export type BlockRow = { id: string; day_id: string; plan_id: string; user_id: string; name: string; letter: string | null; position: number; created_at: string }
export type ExerciseRow = {
  id: string; block_id: string; plan_id: string; user_id: string; name: string; type: string; sets: string | null; reps: string | null; weight: string | null; rest: string | null; position: number; created_at: string
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

export async function createExercise(planId: string, blockId: string, payload: { name: string; type: string; sets?: string; reps?: string; weight?: string; rest?: string; position: number }): Promise<ExerciseRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from<ExerciseRow>("plan_exercises")
    .insert([{ plan_id: planId, block_id: blockId, user_id: auth.user.id, name: payload.name, type: payload.type, sets: payload.sets ?? null, reps: payload.reps ?? null, weight: payload.weight ?? null, rest: payload.rest ?? null, position: payload.position }])
    .select("*")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to create exercise")
  return data
}


