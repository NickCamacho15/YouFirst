import { supabase } from "./supabase"

export interface ChallengeInput {
  title: string
  description?: string
  durationDays: 40 | 70 | 100
  startDate?: string // ISO date string (YYYY-MM-DD)
  rules: string[]
}

export interface ChallengeRow {
  id: string
  user_id: string
  title: string
  description: string | null
  duration_days: number
  start_date: string
  share_code: string | null
  status: "active" | "completed" | "cancelled"
  rules: string[]
  created_at: string
}

export interface RuleCheckRow {
  id: string
  challenge_id: string
  user_id: string
  rule_index: number
  log_date: string
  completed: boolean
  created_at: string
}

function todayIso(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export async function createChallenge(input: ChallengeInput): Promise<ChallengeRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("user_challenges")
    .insert([
      {
        user_id: auth.user.id,
        title: input.title,
        description: input.description ?? null,
        duration_days: input.durationDays,
        start_date: input.startDate ?? todayIso(),
        rules: input.rules ?? [],
      },
    ])
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to create challenge")
  return data as ChallengeRow
}

export async function listChallenges(): Promise<ChallengeRow[]> {
  const { data, error } = await supabase
    .from("user_challenges")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as ChallengeRow[]
}

export async function getChallengeById(id: string): Promise<ChallengeRow | null> {
  const { data, error } = await supabase
    .from("user_challenges")
    .select("*")
    .eq("id", id)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return (data as ChallengeRow) ?? null
}

export async function deleteChallenge(id: string): Promise<void> {
  const { error } = await supabase.from("user_challenges").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function setRuleCompleted(
  challengeId: string,
  ruleIndex: number,
  dateIso: string,
  completed: boolean
): Promise<RuleCheckRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")

  if (completed) {
    const { data, error } = await supabase
      .from("user_challenge_rule_checks")
      .upsert(
        [
          {
            challenge_id: challengeId,
            user_id: auth.user.id,
            rule_index: ruleIndex,
            log_date: dateIso,
            completed: true,
          },
        ],
        { onConflict: "challenge_id,rule_index,log_date" }
      )
      .select()
      .single()

    if (error || !data) throw new Error(error?.message || "Failed to set rule completed")
    return data as RuleCheckRow
  }

  // If unchecking, delete the row
  const { data, error } = await supabase
    .from("user_challenge_rule_checks")
    .delete()
    .eq("challenge_id", challengeId)
    .eq("rule_index", ruleIndex)
    .eq("log_date", dateIso)
    .select()
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as RuleCheckRow) ?? ({} as RuleCheckRow)
}

export async function getRuleChecksForChallenge(
  challengeId: string,
  fromDateIso: string,
  toDateIso: string
): Promise<RuleCheckRow[]> {
  const { data, error } = await supabase
    .from("user_challenge_rule_checks")
    .select("*")
    .eq("challenge_id", challengeId)
    .gte("log_date", fromDateIso)
    .lte("log_date", toDateIso)
    .order("log_date", { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []) as RuleCheckRow[]
}


