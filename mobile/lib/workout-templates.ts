import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"

export type WorkoutTemplate = {
  id: string
  user_id: string
  name: string
  description: string | null
  status: 'draft' | 'published' | 'archived'
  is_active: boolean
  start_date: string
  created_at: string
}

export type WorkoutTemplateWithDetails = WorkoutTemplate & {
  exercise_count?: number
  assignment_count?: number
}

/**
 * List workout templates for the current admin user
 * Optionally filter by status
 */
export async function listWorkoutTemplates(statusFilter?: 'all' | 'draft' | 'published' | 'archived'): Promise<WorkoutTemplateWithDetails[]> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  let query = supabase
    .from("training_plans")
    .select(`
      *,
      exercises:plan_exercises(count)
    `)
    .eq("user_id", uid)
    .order("created_at", { ascending: false })

  // Apply status filter if provided
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq("status", statusFilter)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  // Get assignment counts for each plan
  const planIds = (data || []).map(p => p.id)
  let assignmentCounts: Record<string, number> = {}
  
  if (planIds.length > 0) {
    const { data: assignments } = await supabase
      .from("plan_assignments")
      .select("plan_id")
      .in("plan_id", planIds)
    
    if (assignments) {
      assignments.forEach(a => {
        assignmentCounts[a.plan_id] = (assignmentCounts[a.plan_id] || 0) + 1
      })
    }
  }

  return (data || []).map(plan => ({
    ...plan,
    exercise_count: plan.exercises?.[0]?.count || 0,
    assignment_count: assignmentCounts[plan.id] || 0,
  }))
}

/**
 * Create a new workout template in draft mode
 */
export async function createWorkoutTemplate(name: string, description?: string): Promise<WorkoutTemplate> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("training_plans")
    .insert([{
      user_id: uid,
      name,
      description: description || null,
      status: 'draft', // Always start as draft
      is_active: false,
      start_date: new Date().toISOString().slice(0, 10),
    }])
    .select("*")
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to create workout template")
  return data
}

/**
 * Update a workout template
 */
export async function updateWorkoutTemplate(
  planId: string,
  updates: Partial<Pick<WorkoutTemplate, 'name' | 'description' | 'status'>>
): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("training_plans")
    .update(updates)
    .eq("id", planId)
    .eq("user_id", uid) // Ensure user owns this plan

  if (error) throw new Error(error.message)
}

export interface WorkoutSchedule {
  scheduleType: 'once' | 'weekly'
  scheduledDate?: string
  recurrenceDays?: number[]
  startDate?: string
  endDate?: string
}

/**
 * Publish a workout template with schedule settings
 */
export async function publishWorkoutTemplate(
  planId: string,
  schedule: WorkoutSchedule
): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const updateData: any = {
    status: 'published',
    schedule_type: schedule.scheduleType,
  }

  if (schedule.scheduleType === 'once' && schedule.scheduledDate) {
    updateData.scheduled_date = schedule.scheduledDate
  }

  if (schedule.scheduleType === 'weekly') {
    updateData.recurrence_days = schedule.recurrenceDays || []
    updateData.start_date = schedule.startDate || new Date().toISOString().split('T')[0]
    if (schedule.endDate) {
      updateData.end_date = schedule.endDate
    }
  }

  console.log('[publishWorkoutTemplate] Updating plan:', { planId, updateData })

  const { data, error } = await supabase
    .from("training_plans")
    .update(updateData)
    .eq("id", planId)
    .eq("user_id", uid)
    .select()

  if (error) {
    console.error('[publishWorkoutTemplate] Error:', error)
    throw new Error(error.message)
  }

  console.log('[publishWorkoutTemplate] Success:', data)
}

/**
 * Unpublish a workout template (make it draft again)
 */
export async function unpublishWorkoutTemplate(planId: string): Promise<void> {
  await updateWorkoutTemplate(planId, { status: 'draft' })
}

/**
 * Archive a workout template
 */
export async function archiveWorkoutTemplate(planId: string): Promise<void> {
  await updateWorkoutTemplate(planId, { status: 'archived' })
}

/**
 * Delete a workout template and all its associated data
 */
export async function deleteWorkoutTemplate(planId: string): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("training_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", uid)

  if (error) throw new Error(error.message)
}

/**
 * Duplicate a workout template (creates a new draft copy)
 */
export async function duplicateWorkoutTemplate(planId: string, newName?: string): Promise<WorkoutTemplate> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  // Fetch the original plan with exercises
  const { data: originalPlan, error: fetchError } = await supabase
    .from("training_plans")
    .select(`
      *,
      exercises:plan_exercises(*)
    `)
    .eq("id", planId)
    .eq("user_id", uid)
    .single()

  if (fetchError || !originalPlan) throw new Error(fetchError?.message || "Plan not found")

  // Create a new plan with the same details
  const newPlan = await createWorkoutTemplate(
    newName || `${originalPlan.name} (Copy)`,
    originalPlan.description
  )

  // Copy exercises (support both old and new structure)
  if (originalPlan.exercises && originalPlan.exercises.length > 0) {
    const exercisesToCopy = originalPlan.exercises.map((ex: any) => ({
        plan_id: newPlan.id,
        exercise_library_id: ex.exercise_library_id,
        block_id: null,
        user_id: uid,
        name: ex.name,
        type: ex.type,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        rest: ex.rest,
        time: ex.time,
        distance: ex.distance,
        pace: ex.pace,
        time_cap: ex.time_cap,
        score_type: ex.score_type,
        target: ex.target,
        notes: ex.notes,
        position: ex.position,
        set_details: ex.set_details,
      }))

    await supabase.from("plan_exercises").insert(exercisesToCopy)
  }

  return newPlan
}

/**
 * Get a single template with exercises
 */
export async function getTemplateWithExercises(planId: string) {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("training_plans")
    .select(`
      *,
      exercises:plan_exercises(
        *,
        library:exercise_library(*)
      )
    `)
    .eq("id", planId)
    .eq("user_id", uid)
    .order("exercises.position", { ascending: true })
    .single()

  if (error) throw new Error(error.message)
  return data
}

