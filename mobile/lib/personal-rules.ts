import { supabase } from "./supabase"

export type PersonalRule = {
  id: string
  user_id: string
  text: string
  created_at: string
}

export type PersonalRuleCheck = {
  id: string
  rule_id: string
  user_id: string
  log_date: string
  completed: boolean
  created_at: string
}

export async function listPersonalRules(): Promise<PersonalRule[]> {
  const { data, error } = await supabase.from("personal_rules").select("id,user_id,text,created_at").order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []) as PersonalRule[]
}

export async function addPersonalRule(text: string): Promise<PersonalRule> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { data, error } = await supabase.from("personal_rules").insert([{ user_id: auth.user.id, text }]).select().single()
  if (error || !data) throw new Error(error?.message || "Failed to add rule")
  return data as PersonalRule
}

export async function deletePersonalRule(id: string): Promise<void> {
  const { error } = await supabase.from("personal_rules").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function setPersonalRuleCompleted(ruleId: string, dateIso: string, completed: boolean): Promise<PersonalRuleCheck | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  if (completed) {
    const { data, error } = await supabase
      .from("personal_rule_checks")
      .upsert([{ rule_id: ruleId, user_id: auth.user.id, log_date: dateIso, completed: true }], { onConflict: "rule_id,log_date" })
      .select()
      .single()
    if (error || !data) throw new Error(error?.message || "Failed to set rule complete")
    return data as PersonalRuleCheck
  }
  const { data, error } = await supabase
    .from("personal_rule_checks")
    .delete()
    .eq("rule_id", ruleId)
    .eq("user_id", auth.user.id)
    .eq("log_date", dateIso)
    .select()
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as PersonalRuleCheck) ?? null
}

export async function listPersonalRuleChecks(fromDateIso: string, toDateIso: string): Promise<PersonalRuleCheck[]> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from("personal_rule_checks")
    .select("id,rule_id,user_id,log_date,completed,created_at")
    .eq("user_id", auth.user.id)
    .gte("log_date", fromDateIso)
    .lte("log_date", toDateIso)
  if (error) throw new Error(error.message)
  return (data || []) as PersonalRuleCheck[]
}


