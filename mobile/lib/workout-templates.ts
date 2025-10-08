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
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })

  // Apply status filter if provided
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq("status", statusFilter)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  // TODO: Add exercise counts and assignment counts
  return (data || []).map(plan => ({
    ...plan,
    exercise_count: 0,
    assignment_count: 0,
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

/**
 * Publish a workout template (make it visible to assigned users)
 */
export async function publishWorkoutTemplate(planId: string): Promise<void> {
  await updateWorkoutTemplate(planId, { status: 'published' })
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

  // Fetch the original plan
  const { data: originalPlan, error: fetchError } = await supabase
    .from("training_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", uid)
    .single()

  if (fetchError || !originalPlan) throw new Error(fetchError?.message || "Plan not found")

  // Create a new plan with the same details
  const newPlan = await createWorkoutTemplate(
    newName || `${originalPlan.name} (Copy)`,
    originalPlan.description
  )

  // TODO: Copy weeks, days, blocks, and exercises
  // For now, just return the new empty plan

  return newPlan
}

