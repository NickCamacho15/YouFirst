import { supabase } from "./supabase"

export type WorkoutSessionRow = {
  id: string
  user_id: string
  plan_id: string | null
  plan_day_id: string | null
  session_date: string
  started_at: string
  ended_at: string | null
  total_seconds: number | null
  status: "in_progress" | "completed" | "aborted"
}

export type SessionExerciseRow = {
  id: string
  session_id: string
  plan_exercise_id: string | null
  name: string
  type: "Lifting" | "Cardio" | "METCON"
  order_index: number
  started_at: string | null
  completed_at: string | null
  target_sets: number | null
  target_reps: number | null
  target_weight: number | null
  target_rest_seconds: number | null
  target_time_seconds: number | null
  target_distance_m: number | null
  target_pace_sec_per_km: number | null
  target_time_cap_seconds: number | null
  target_score_type: string | null
  target_score: string | null
}

export type SetLogRow = {
  id: string
  session_exercise_id: string
  set_index: number
  target_reps: number | null
  target_weight: number | null
  target_time_seconds: number | null
  target_distance_m: number | null
  target_pace_sec_per_km: number | null
  actual_reps: number | null
  actual_weight: number | null
  actual_time_seconds: number | null
  actual_distance_m: number | null
  actual_pace_sec_per_km: number | null
  actual_score: string | null
  rest_seconds_actual: number | null
  completed_at: string | null
}

type SnapshotExercise = {
  plan_exercise_id: string | null
  name: string
  type: "Lifting" | "Cardio" | "METCON"
  order_index: number
  targets: Partial<{
    sets: number
    reps: number
    weight: number
    rest_seconds: number
    time_seconds: number
    distance_m: number
    pace_sec_per_km: number
    time_cap_seconds: number
    score_type: string
    score: string
  }>
}

function toInt(v?: string | number | null): number | null {
  if (v === undefined || v === null) return null
  const n = typeof v === "number" ? Math.floor(v) : parseInt(String(v).replace(/[^0-9]/g, ""), 10)
  return Number.isFinite(n) ? n : null
}
function toFloat(v?: string | number | null): number | null {
  if (v === undefined || v === null) return null
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) ? n : null
}

export async function createSessionFromSnapshot(args: { planId?: string; planDayId?: string; exercises: SnapshotExercise[] }): Promise<{ session: WorkoutSessionRow; exercises: SessionExerciseRow[] }>{
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { planId, planDayId, exercises } = args
  const { data: session, error: err1 } = await supabase
    .from<WorkoutSessionRow>("workout_sessions")
    .insert([{ user_id: auth.user.id, plan_id: planId ?? null, plan_day_id: planDayId ?? null }])
    .select("*")
    .single()
  if (err1 || !session) throw new Error(err1?.message || "Failed to create session")

  const rows = exercises.map((e) => ({
    session_id: session.id,
    plan_exercise_id: e.plan_exercise_id,
    name: e.name,
    type: e.type,
    order_index: e.order_index,
    target_sets: toInt(e.targets.sets ?? null),
    target_reps: toInt(e.targets.reps ?? null),
    target_weight: toFloat(e.targets.weight ?? null),
    target_rest_seconds: toInt(e.targets.rest_seconds ?? null),
    target_time_seconds: toInt(e.targets.time_seconds ?? null),
    target_distance_m: toInt(e.targets.distance_m ?? null),
    target_pace_sec_per_km: toInt(e.targets.pace_sec_per_km ?? null),
    target_time_cap_seconds: toInt(e.targets.time_cap_seconds ?? null),
    target_score_type: e.targets.score_type ?? null,
    target_score: e.targets.score ?? null,
  }))
  const { data: inserted, error: err2 } = await supabase
    .from<SessionExerciseRow>("session_exercises")
    .insert(rows)
    .select("*")
  if (err2) throw new Error(err2.message)
  return { session, exercises: inserted || [] }
}

export async function getActiveSessionForToday(): Promise<{ session: WorkoutSessionRow; exercises: SessionExerciseRow[]; sets: SetLogRow[] } | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { data: sessions, error } = await supabase
    .from<WorkoutSessionRow>("workout_sessions")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  if (!sessions || sessions.length === 0) return null
  const session = sessions[0]
  const [{ data: ex, error: e1 }, { data: sets, error: e2 }] = await Promise.all([
    supabase.from<SessionExerciseRow>("session_exercises").select("*").eq("session_id", session.id).order("order_index"),
    supabase.from<SetLogRow>("set_logs").select("*").in("session_exercise_id", (await supabase.from("session_exercises").select("id").eq("session_id", session.id)).data?.map((r: any)=> r.id) || ["00000000-0000-0000-0000-000000000000"]) ,
  ])
  if (e1) throw new Error(e1.message)
  if (e2) throw new Error(e2.message)
  return { session, exercises: ex || [], sets: sets || [] }
}

export async function completeSet(params: { sessionExerciseId: string; setIndex: number; actuals?: Partial<{ reps: number; weight: number; time_seconds: number; distance_m: number; pace_sec_per_km: number; score: string }>; rest_seconds?: number }): Promise<SetLogRow> {
  const payload: Partial<SetLogRow> = {
    session_exercise_id: params.sessionExerciseId,
    set_index: params.setIndex,
    actual_reps: toInt(params.actuals?.reps ?? null),
    actual_weight: toFloat(params.actuals?.weight ?? null),
    actual_time_seconds: toInt(params.actuals?.time_seconds ?? null),
    actual_distance_m: toInt(params.actuals?.distance_m ?? null),
    actual_pace_sec_per_km: toInt(params.actuals?.pace_sec_per_km ?? null),
    actual_score: params.actuals?.score ?? null,
    rest_seconds_actual: toInt(params.rest_seconds ?? null),
    completed_at: new Date().toISOString(),
  } as any
  const { data, error } = await supabase
    .from<SetLogRow>("set_logs")
    .upsert(payload as any, { onConflict: "session_exercise_id,set_index" })
    .select("*")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to save set")
  return data
}

export async function endSession(sessionId: string, totalSeconds?: number): Promise<void> {
  const { error } = await supabase
    .from<WorkoutSessionRow>("workout_sessions")
    .update({ status: "completed", ended_at: new Date().toISOString(), total_seconds: totalSeconds ?? null })
    .eq("id", sessionId)
  if (error) throw new Error(error.message)
}

export async function markExercisesCompleted(sessionExerciseIds: string[]): Promise<void> {
  if (!sessionExerciseIds.length) return
  const { error } = await supabase
    .from<SessionExerciseRow>("session_exercises")
    .update({ completed_at: new Date().toISOString() })
    .in("id", sessionExerciseIds)
  if (error) throw new Error(error.message)
}

// Utility: create snapshot from plan day structure already fetched via listPlanTree
export function buildSnapshotFromPlanDay(day: { blocks: Array<{ exercises: Array<any> }> }): SnapshotExercise[] {
  const items: SnapshotExercise[] = []
  let order = 0
  for (const b of day.blocks || []) {
    for (const e of (b.exercises || [])) {
      const type = (e.type as any) as "Lifting" | "Cardio" | "METCON"
      items.push({
        plan_exercise_id: e.id,
        name: e.name,
        type,
        order_index: order++,
        targets: {
          sets: toInt(e.sets),
          reps: toInt(e.reps),
          weight: toFloat(e.weight),
          rest_seconds: toInt(e.rest),
          time_seconds: toInt(e.time),
          distance_m: toInt(e.distance),
          pace_sec_per_km: toInt(e.pace),
          time_cap_seconds: toInt(e.time_cap),
          score_type: e.score_type || null,
          score: e.target || null,
        },
      })
    }
  }
  return items
}


