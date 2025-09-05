import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"

export type GoalStep = { text: string; done: boolean }

export type GoalRecord = {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  color: string | null
  benefits: string[] | null
  consequences: string[] | null
  who_it_helps: string[] | null
  steps: GoalStep[] | null
  created_at: string
}

export type CreateGoalInput = {
  title: string
  description?: string
  targetDate?: string
  color?: string
  benefits: string[]
  consequences: string[]
  whoItHelps: string[]
  actionSteps: string[]
}

export async function listGoals(): Promise<GoalRecord[]> {
  const userId = await getCurrentUserId()
  const query = supabase
    .from("goals")
    .select("id,user_id,title,description,due_date,color,benefits,consequences,who_it_helps,steps,created_at")
    .order("created_at", { ascending: false })
  const { data, error } = userId ? await query.eq("user_id", userId) : await query
  if (error) throw new Error(error.message)
  const rows = (data as GoalRecord[]) || []
  goalsCache = rows
  goalsCacheUser = userId || null
  goalsCacheAt = Date.now()
  return rows
}

export async function createGoal(input: CreateGoalInput): Promise<GoalRecord> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")
  const stepsArray: GoalStep[] = input.actionSteps.filter(Boolean).map((t) => ({ text: t, done: false }))
  const { data, error } = await supabase
    .from("goals")
    .insert([
      {
        user_id: userId,
        title: input.title,
        description: input.description ?? null,
        due_date: input.targetDate ?? null,
        color: input.color ?? null,
        benefits: input.benefits?.length ? input.benefits : null,
        consequences: input.consequences?.length ? input.consequences : null,
        who_it_helps: input.whoItHelps?.length ? input.whoItHelps : null,
        steps: stepsArray.length ? stepsArray : null,
      },
    ])
    .select("id,user_id,title,description,due_date,color,benefits,consequences,who_it_helps,steps,created_at")
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to create goal")
  const created = data as GoalRecord
  // update cache
  if (goalsCache && goalsCacheUser === userId) {
    goalsCache = [created, ...goalsCache]
    goalsCacheAt = Date.now()
  }
  return created
}

export async function setGoalStepDone(goalId: string, stepIndex: number, done: boolean): Promise<GoalRecord> {
  const { data: existing, error: fetchErr } = await supabase
    .from("goals")
    .select("steps")
    .eq("id", goalId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)
  const steps: GoalStep[] = (existing?.steps as GoalStep[]) || []
  if (!steps[stepIndex]) return await getGoal(goalId)
  steps[stepIndex] = { ...steps[stepIndex], done }
  const { data, error } = await supabase
    .from("goals")
    .update({ steps })
    .eq("id", goalId)
    .select("id,user_id,title,description,due_date,color,benefits,consequences,who_it_helps,steps,created_at")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to update step")
  const updated = data as GoalRecord
  // refresh cache item if present
  if (goalsCache) {
    goalsCache = goalsCache.map((g) => (g.id === updated.id ? updated : g))
    goalsCacheAt = Date.now()
  }
  return updated
}

export async function getGoal(id: string): Promise<GoalRecord> {
  const { data, error } = await supabase
    .from("goals")
    .select("id,user_id,title,description,due_date,color,benefits,consequences,who_it_helps,steps,created_at")
    .eq("id", id)
    .single()
  if (error || !data) throw new Error(error?.message || "Not found")
  return data as GoalRecord
}

// Achievements
export type AchievementRecord = {
  id: string
  user_id: string
  goal_id: string | null
  title: string
  description: string | null
  completed_at: string
  due_date: string | null
  color: string | null
  benefits: string[] | null
  consequences: string[] | null
  who_it_helps: string[] | null
  steps: GoalStep[] | null
}

export async function listAchievements(): Promise<AchievementRecord[]> {
  const userId = await getCurrentUserId()
  const query = supabase
    .from("achievements")
    .select("id,user_id,goal_id,title,description,completed_at,due_date,color,benefits,consequences,who_it_helps,steps")
    .order("completed_at", { ascending: false })
  const { data, error } = userId ? await query.eq("user_id", userId) : await query
  if (error) throw new Error(error.message)
  const rows = (data as AchievementRecord[]) || []
  achievementsCache = rows
  achievementsCacheUser = userId || null
  achievementsCacheAt = Date.now()
  return rows
}

export type CreateAchievementInput = {
  title: string
  description?: string | null
  completedAtIso: string
}

export async function createAchievement(input: CreateAchievementInput): Promise<AchievementRecord> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")
  const payload = {
    user_id: userId,
    goal_id: null,
    title: input.title,
    description: input.description ?? null,
    completed_at: input.completedAtIso,
    due_date: null,
    color: "#4A90E2",
    benefits: null,
    consequences: null,
    who_it_helps: null,
    steps: null,
  }
  const { data, error } = await supabase
    .from("achievements")
    .insert([payload])
    .select("id,user_id,goal_id,title,description,completed_at,due_date,color,benefits,consequences,who_it_helps,steps")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to create achievement")
  const created = data as AchievementRecord
  if (achievementsCache && achievementsCacheUser === userId) {
    achievementsCache = [created, ...achievementsCache]
    achievementsCacheAt = Date.now()
  }
  return created
}

export async function completeGoal(goal: GoalRecord): Promise<void> {
  const insertPayload = {
    user_id: goal.user_id,
    goal_id: goal.id,
    title: goal.title,
    description: goal.description,
    completed_at: new Date().toISOString(),
    due_date: goal.due_date,
    color: goal.color,
    benefits: goal.benefits,
    consequences: goal.consequences,
    who_it_helps: goal.who_it_helps,
    steps: goal.steps,
  }
  const { error: insErr } = await supabase.from("achievements").insert([insertPayload])
  if (insErr) throw new Error(insErr.message)
  const { error: delErr } = await supabase.from("goals").delete().eq("id", goal.id)
  if (delErr) throw new Error(delErr.message)
  // update caches
  if (goalsCache) {
    goalsCache = goalsCache.filter((g) => g.id !== goal.id)
    goalsCacheAt = Date.now()
  }
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", goalId)
  if (error) throw new Error(error.message)
  if (goalsCache) {
    goalsCache = goalsCache.filter((g) => g.id !== goalId)
    goalsCacheAt = Date.now()
  }
}

// ---- Simple in-memory caches with short TTL to reduce flashes between tab switches
let goalsCache: GoalRecord[] | null = null
let goalsCacheAt = 0
let goalsCacheUser: string | null = null
let achievementsCache: AchievementRecord[] | null = null
let achievementsCacheAt = 0
let achievementsCacheUser: string | null = null

export function getCachedGoals(maxAgeMs = 30000): GoalRecord[] | null {
  if (!goalsCache || Date.now() - goalsCacheAt > maxAgeMs) return null
  return goalsCache
}

export function getCachedAchievements(maxAgeMs = 30000): AchievementRecord[] | null {
  if (!achievementsCache || Date.now() - achievementsCacheAt > maxAgeMs) return null
  return achievementsCache
}


