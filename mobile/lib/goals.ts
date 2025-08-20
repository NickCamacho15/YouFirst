import { supabase } from "./supabase"

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
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  const query = supabase
    .from("goals")
    .select("id,user_id,title,description,due_date,color,benefits,consequences,who_it_helps,steps,created_at")
    .order("created_at", { ascending: false })
  const { data, error } = userId ? await query.eq("user_id", userId) : await query
  if (error) throw new Error(error.message)
  return (data as GoalRecord[]) || []
}

export async function createGoal(input: CreateGoalInput): Promise<GoalRecord> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
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
  return data as GoalRecord
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
  return data as GoalRecord
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
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  const query = supabase
    .from("achievements")
    .select("id,user_id,goal_id,title,description,completed_at,due_date,color,benefits,consequences,who_it_helps,steps")
    .order("completed_at", { ascending: false })
  const { data, error } = userId ? await query.eq("user_id", userId) : await query
  if (error) throw new Error(error.message)
  return (data as AchievementRecord[]) || []
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
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", goalId)
  if (error) throw new Error(error.message)
}


