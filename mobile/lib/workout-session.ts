/**
 * Workout Session Service
 * 
 * Handles workout session lifecycle:
 * - Starting sessions from templates
 * - Logging sets in real-time
 * - Completing/aborting sessions
 * - Fetching session history
 */

import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"

export interface SessionExercise {
  id: string
  session_id: string
  plan_exercise_id: string | null
  name: string
  type: string
  order_index: number
  target_sets: number
  target_reps: number | null
  target_weight: number | null
  target_rest_seconds: number
  target_time_seconds: number | null
  target_distance_m: number | null
  set_details: any[] | null  // Per-set targets from template
  started_at: string | null
  completed_at: string | null
}

export interface SetLog {
  id: string
  session_exercise_id: string
  set_index: number
  target_reps: number | null
  target_weight: number | null
  actual_reps: number | null
  actual_weight: number | null
  rest_seconds_actual: number | null
  completed_at: string | null
  skipped: boolean
}

export interface WorkoutSession {
  id: string
  user_id: string
  plan_id: string | null
  started_at: string
  ended_at: string | null
  total_seconds: number | null
  status: 'in_progress' | 'completed' | 'aborted'
  exercises_completed: number
  total_volume: number | null
  notes: string | null
}

/**
 * Start a new workout session from a template
 */
export async function startWorkoutSession(planId: string): Promise<{
  session: WorkoutSession
  exercises: SessionExercise[]
}> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  console.log("[startWorkoutSession] Starting session for plan:", planId, "user:", uid)

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from("training_plans")
    .select("*")
    .eq("id", planId)
    .single()

  if (templateError || !template) {
    console.error("[startWorkoutSession] Template not found:", templateError)
    throw new Error("Template not found")
  }

  console.log("[startWorkoutSession] Template found:", template.name)

  // Fetch exercises separately (support both old and new structure)
  console.log("[startWorkoutSession] Fetching exercises for plan:", planId)
  const { data: templateExercises, error: fetchExercisesError } = await supabase
    .from("plan_exercises")
    .select("*")
    .eq("plan_id", planId)
    .order("position", { ascending: true })

  console.log("[startWorkoutSession] Query result - data:", templateExercises, "error:", fetchExercisesError)

  if (fetchExercisesError) {
    console.error("[startWorkoutSession] Failed to fetch exercises:", fetchExercisesError)
    throw new Error("Failed to fetch exercises")
  }

  if (!templateExercises || templateExercises.length === 0) {
    console.error("[startWorkoutSession] No exercises found. templateExercises:", templateExercises)
    throw new Error("No exercises found in template")
  }

  console.log("[startWorkoutSession] Found", templateExercises.length, "exercises")

  // Attach exercises to template
  template.exercises = templateExercises

  // Create workout session
  console.log("[startWorkoutSession] Creating session for user:", uid, "plan:", planId)
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert([{
      user_id: uid,
      plan_id: planId,
      started_at: new Date().toISOString(),
      status: 'in_progress',
    }])
    .select()
    .single()

  if (sessionError || !session) {
    console.error("[startWorkoutSession] Failed to create session:", sessionError)
    throw new Error("Failed to create session")
  }
  
  console.log("[startWorkoutSession] Session created:", session.id)

  // Create session exercises
  console.log("[startWorkoutSession] Creating", template.exercises.length, "session exercises")
  const sessionExercises = template.exercises.map((ex: any, index: number) => ({
    session_id: session.id,
    plan_exercise_id: ex.id,
    name: ex.name,
    type: ex.type,
    order_index: index + 1,
    target_sets: parseInt(ex.sets) || 0,
    target_reps: ex.reps ? parseInt(ex.reps) : null,
    target_weight: ex.weight ? parseFloat(ex.weight) : null,
    target_rest_seconds: parseInt(ex.rest) || 0,
    target_time_seconds: ex.time ? parseInt(ex.time) : null,
    target_distance_m: ex.distance ? parseInt(ex.distance) : null,
    // Note: set_details is stored in plan_exercises, not session_exercises
  }))

  const { data: sessionExercisesData, error: exercisesError } = await supabase
    .from("session_exercises")
    .insert(sessionExercises)
    .select()

  if (exercisesError || !sessionExercisesData) {
    console.error("[startWorkoutSession] Failed to create session exercises:", exercisesError)
    throw new Error("Failed to create session exercises")
  }
  
  console.log("[startWorkoutSession] Created", sessionExercisesData.length, "session exercises")

  // Create set logs for each exercise
  for (let i = 0; i < sessionExercisesData.length; i++) {
    const exercise = sessionExercisesData[i]
    const planExercise = template.exercises[i]
    const setLogs = []
    const setDetails = planExercise.set_details || []
    
    for (let j = 0; j < exercise.target_sets; j++) {
      const setDetail = setDetails[j]
      setLogs.push({
        session_exercise_id: exercise.id,
        set_index: j + 1,
        target_reps: setDetail?.reps || exercise.target_reps,
        target_weight: setDetail?.weight || exercise.target_weight,
        skipped: false,
      })
    }

    await supabase.from("set_logs").insert(setLogs)
  }
  
  console.log("[startWorkoutSession] Workout session created successfully!")

  return { session, exercises: sessionExercisesData }
}

/**
 * Get active workout session for user
 */
export async function getActiveSession(): Promise<{
  session: WorkoutSession
  exercises: SessionExercise[]
  setLogs: SetLog[]
} | null> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sessionError) throw sessionError
  if (!session) return null

  const { data: exercises, error: exercisesError } = await supabase
    .from("session_exercises")
    .select("*")
    .eq("session_id", session.id)
    .order("order_index", { ascending: true })

  if (exercisesError) throw exercisesError

  const { data: setLogs, error: setLogsError } = await supabase
    .from("set_logs")
    .select("*")
    .in("session_exercise_id", exercises.map((e: any) => e.id))
    .order("set_index", { ascending: true })

  if (setLogsError) throw setLogsError

  return { session, exercises: exercises || [], setLogs: setLogs || [] }
}

/**
 * Log a completed set
 */
export async function logSet(
  setLogId: string,
  actualReps: number,
  actualWeight: number | null,
  restSeconds: number | null
): Promise<void> {
  const { error } = await supabase
    .from("set_logs")
    .update({
      actual_reps: actualReps,
      actual_weight: actualWeight,
      rest_seconds_actual: restSeconds,
      completed_at: new Date().toISOString(),
    })
    .eq("id", setLogId)

  if (error) throw error
}

/**
 * Skip a set
 */
export async function skipSet(setLogId: string): Promise<void> {
  const { error } = await supabase
    .from("set_logs")
    .update({
      skipped: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", setLogId)

  if (error) throw error
}

/**
 * Mark exercise as started
 */
export async function startExercise(exerciseId: string): Promise<void> {
  const { error } = await supabase
    .from("session_exercises")
    .update({
      started_at: new Date().toISOString(),
    })
    .eq("id", exerciseId)

  if (error) throw error
}

/**
 * Mark exercise as completed
 */
export async function completeExercise(exerciseId: string): Promise<void> {
  const { error } = await supabase
    .from("session_exercises")
    .update({
      completed_at: new Date().toISOString(),
    })
    .eq("id", exerciseId)

  if (error) throw error
}

/**
 * Complete workout session
 */
export async function completeSession(sessionId: string): Promise<void> {
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("started_at")
    .eq("id", sessionId)
    .single()

  if (!session) throw new Error("Session not found")

  const endTime = new Date()
  const startTime = new Date(session.started_at)
  const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

  // Count completed exercises
  const { data: exercises } = await supabase
    .from("session_exercises")
    .select("id, completed_at")
    .eq("session_id", sessionId)

  const exercisesCompleted = exercises?.filter(e => e.completed_at).length || 0

  // Calculate total volume (for lifting exercises)
  const { data: setLogs } = await supabase
    .from("set_logs")
    .select("actual_reps, actual_weight")
    .in("session_exercise_id", exercises?.map(e => e.id) || [])
    .not("completed_at", "is", null)

  const totalVolume = setLogs?.reduce((sum, log) => {
    if (log.actual_reps && log.actual_weight) {
      return sum + (log.actual_reps * log.actual_weight)
    }
    return sum
  }, 0) || 0

  const { error } = await supabase
    .from("workout_sessions")
    .update({
      ended_at: endTime.toISOString(),
      total_seconds: totalSeconds,
      status: "completed",
      exercises_completed: exercisesCompleted,
      total_volume: totalVolume,
    })
    .eq("id", sessionId)

  if (error) throw error
}

/**
 * Abort workout session
 */
export async function abortSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("workout_sessions")
    .update({
      status: "aborted",
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  if (error) throw error
}

/**
 * Get workout history
 */
export async function getWorkoutHistory(limit: number = 10): Promise<WorkoutSession[]> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", uid)
    .in("status", ["completed", "aborted"])
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Get previous workout data for an exercise (for "Previous" column)
 */
/**
 * Check if a workout was completed on a specific date
 */
export async function isWorkoutCompletedOnDate(
  planId: string,
  dateStr: string
): Promise<boolean> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  // Parse date string to get start and end of day in local timezone
  const [year, month, day] = dateStr.split('-').map(Number)
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0)
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59)

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, status")
    .eq("user_id", uid)
    .eq("plan_id", planId)
    .gte("started_at", startOfDay.toISOString())
    .lte("started_at", endOfDay.toISOString())
    .order("started_at", { ascending: false })
    .limit(1)

  if (error) {
    console.error("Error checking workout completion:", error)
    return false
  }

  return data && data.length > 0 && data[0].status === 'completed'
}

export async function getPreviousExerciseData(
  planExerciseId: string
): Promise<SetLog[] | null> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  // Find most recent completed session with this exercise
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select(`
      id,
      session_exercises!inner(
        id,
        plan_exercise_id,
        set_logs:set_logs(*)
      )
    `)
    .eq("user_id", uid)
    .eq("status", "completed")
    .eq("session_exercises.plan_exercise_id", planExerciseId)
    .order("started_at", { ascending: false })
    .limit(1)

  if (!sessions || sessions.length === 0) return null

  const sessionExercise = sessions[0].session_exercises[0]
  return sessionExercise?.set_logs || null
}

