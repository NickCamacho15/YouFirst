/**
 * Exercise Library Service
 * 
 * Provides functions for fetching, searching, and managing exercises
 * from the exercise library database table.
 * 
 * @packageDocumentation
 */

import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"
import type {
  ExerciseLibraryRow,
  ExerciseLibraryItem,
  ExerciseFilters,
  ExerciseCategory,
  ExerciseType,
} from "../types/workout"

/**
 * Fetch all exercises from library with optional filters
 * 
 * @param filters - Optional filters for search, category, type, etc.
 * @returns Array of exercise library items
 * 
 * @example
 * // Get all exercises
 * const exercises = await listExercises()
 * 
 * @example
 * // Get only chest exercises
 * const chestExercises = await listExercises({ category: 'Chest' })
 * 
 * @example
 * // Search for "squat"
 * const squats = await listExercises({ search: 'squat' })
 */
export async function listExercises(
  filters?: ExerciseFilters
): Promise<ExerciseLibraryItem[]> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  let query = supabase
    .from("exercise_library")
    .select("*")
    .order("name")

  // Apply search filter (case-insensitive)
  if (filters?.search && filters.search.trim()) {
    query = query.ilike("name", `%${filters.search.trim()}%`)
  }

  // Apply category filter
  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category)
  }

  // Apply body part filter
  if (filters?.bodyPart && filters.bodyPart !== "all") {
    query = query.eq("body_part", filters.bodyPart)
  }

  // Apply exercise type filter
  if (filters?.exerciseType && filters.exerciseType !== "all") {
    query = query.eq("exercise_type", filters.exerciseType)
  }

  // Apply equipment filter (contains any of the specified equipment)
  if (filters?.equipment && filters.equipment.length > 0) {
    query = query.overlaps("equipment", filters.equipment)
  }

  // Apply custom-only filter
  if (filters?.customOnly) {
    query = query.eq("is_custom", true)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data || []) as ExerciseLibraryItem[]
}

/**
 * Get a single exercise by ID
 * 
 * @param exerciseId - Exercise library ID
 * @returns Exercise library item
 */
export async function getExerciseById(
  exerciseId: string
): Promise<ExerciseLibraryItem | null> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("*")
    .eq("id", exerciseId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null // Not found
    throw new Error(error.message)
  }

  return data as ExerciseLibraryItem
}

/**
 * Get exercise categories with counts
 * 
 * @returns Array of categories with exercise counts
 * 
 * @example
 * const categories = await getExerciseCategories()
 * // [{ category: 'Chest', count: 5 }, { category: 'Back', count: 5 }, ...]
 */
export async function getExerciseCategories(): Promise<
  Array<{ category: ExerciseCategory; count: number }>
> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("category")

  if (error) throw new Error(error.message)

  // Count by category
  const counts = new Map<ExerciseCategory, number>()
  data?.forEach((item) => {
    const cat = item.category as ExerciseCategory
    counts.set(cat, (counts.get(cat) || 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category))
}

/**
 * Get all unique body parts
 * 
 * @returns Array of body part strings
 */
export async function getBodyParts(): Promise<string[]> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("body_part")
    .not("body_part", "is", null)

  if (error) throw new Error(error.message)

  // Get unique body parts
  const bodyParts = new Set<string>()
  data?.forEach((item) => {
    if (item.body_part) bodyParts.add(item.body_part)
  })

  return Array.from(bodyParts).sort()
}

/**
 * Get all unique equipment types
 * 
 * @returns Array of equipment strings
 */
export async function getEquipmentTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("equipment")

  if (error) throw new Error(error.message)

  // Flatten and get unique equipment
  const equipment = new Set<string>()
  data?.forEach((item) => {
    item.equipment?.forEach((eq: string) => equipment.add(eq))
  })

  return Array.from(equipment).sort()
}

/**
 * Create a custom exercise
 * 
 * @param exercise - Exercise data
 * @returns Created exercise
 * 
 * @example
 * const newExercise = await createCustomExercise({
 *   name: 'My Custom Exercise',
 *   category: 'Chest',
 *   exercise_type: 'Lifting',
 * })
 */
export async function createCustomExercise(exercise: {
  name: string
  description?: string
  category: ExerciseCategory
  body_part?: string
  equipment?: string[]
  exercise_type: ExerciseType
  default_sets?: number
  default_reps?: number
  default_rest_seconds?: number
  instructions?: string
}): Promise<ExerciseLibraryRow> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  // Get user's group_id
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("group_id")
    .eq("id", uid)
    .single()

  if (userError || !user) throw new Error("Failed to get user info")

  const { data, error } = await supabase
    .from("exercise_library")
    .insert([
      {
        ...exercise,
        is_custom: true,
        created_by: uid,
        group_id: user.group_id,
      },
    ])
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message || "Failed to create exercise")
  }

  return data as ExerciseLibraryRow
}

/**
 * Update a custom exercise (only if user created it)
 * 
 * @param exerciseId - Exercise ID
 * @param updates - Fields to update
 */
export async function updateCustomExercise(
  exerciseId: string,
  updates: Partial<Omit<ExerciseLibraryRow, 'id' | 'created_at' | 'created_by' | 'group_id' | 'is_custom'>>
): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("exercise_library")
    .update(updates)
    .eq("id", exerciseId)
    .eq("created_by", uid)
    .eq("is_custom", true)

  if (error) throw new Error(error.message)
}

/**
 * Delete a custom exercise (only if user created it)
 * 
 * @param exerciseId - Exercise ID to delete
 */
export async function deleteCustomExercise(exerciseId: string): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("exercise_library")
    .delete()
    .eq("id", exerciseId)
    .eq("created_by", uid)
    .eq("is_custom", true)

  if (error) throw new Error(error.message)
}

/**
 * Search exercises using full-text search
 * 
 * This uses the PostgreSQL RPC function for fast full-text search.
 * Falls back to ILIKE search if RPC is not available.
 * 
 * @param searchTerm - Search query
 * @returns Array of matching exercises
 * 
 * @example
 * const results = await searchExercises('bench press')
 */
export async function searchExercises(
  searchTerm: string
): Promise<ExerciseLibraryItem[]> {
  if (!searchTerm.trim()) {
    return listExercises()
  }

  // Try RPC function first (fast full-text search)
  const { data, error } = await supabase.rpc("search_exercises", {
    search_query: searchTerm.trim(),
  })

  if (error) {
    // Fallback to simple ILIKE search if RPC doesn't exist
    console.warn("Full-text search RPC not available, using ILIKE fallback:", error.message)
    return listExercises({ search: searchTerm })
  }

  return (data || []) as ExerciseLibraryItem[]
}

/**
 * Get exercises by multiple IDs
 * 
 * @param exerciseIds - Array of exercise IDs
 * @returns Array of exercises
 */
export async function getExercisesByIds(
  exerciseIds: string[]
): Promise<ExerciseLibraryItem[]> {
  if (exerciseIds.length === 0) return []

  const { data, error } = await supabase
    .from("exercise_library")
    .select("*")
    .in("id", exerciseIds)

  if (error) throw new Error(error.message)
  return (data || []) as ExerciseLibraryItem[]
}

/**
 * Get exercises by category (convenience function)
 * 
 * @param category - Exercise category
 * @returns Array of exercises in that category
 */
export async function getExercisesByCategory(
  category: ExerciseCategory
): Promise<ExerciseLibraryItem[]> {
  return listExercises({ category })
}

/**
 * Get exercises by type (convenience function)
 * 
 * @param type - Exercise type
 * @returns Array of exercises of that type
 */
export async function getExercisesByType(
  type: ExerciseType
): Promise<ExerciseLibraryItem[]> {
  return listExercises({ exerciseType: type })
}

/**
 * Check if an exercise exists
 * 
 * @param exerciseId - Exercise ID
 * @returns True if exists, false otherwise
 */
export async function exerciseExists(exerciseId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("id")
    .eq("id", exerciseId)
    .single()

  return !error && !!data
}

/**
 * Get total exercise count
 * 
 * @returns Total number of exercises (standard + custom)
 */
export async function getExerciseCount(): Promise<number> {
  const { count, error } = await supabase
    .from("exercise_library")
    .select("*", { count: "exact", head: true })

  if (error) throw new Error(error.message)
  return count || 0
}

/**
 * Get custom exercise count for current user's group
 * 
 * @returns Number of custom exercises
 */
export async function getCustomExerciseCount(): Promise<number> {
  const uid = await getCurrentUserId()
  if (!uid) return 0

  const { data: user } = await supabase
    .from("users")
    .select("group_id")
    .eq("id", uid)
    .single()

  if (!user?.group_id) return 0

  const { count, error } = await supabase
    .from("exercise_library")
    .select("*", { count: "exact", head: true })
    .eq("is_custom", true)
    .eq("group_id", user.group_id)

  if (error) throw new Error(error.message)
  return count || 0
}

