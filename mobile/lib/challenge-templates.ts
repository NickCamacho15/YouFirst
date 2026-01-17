import { supabase } from "./supabase"

export type ChallengeTemplateScope = "global" | "group"
export type ChallengeTemplateStartMode = "rolling" | "fixed"
export type ChallengeTemplateStatus = "draft" | "published" | "archived"

export type ChallengeTemplateRow = {
  id: string
  scope: ChallengeTemplateScope
  group_id: string | null
  created_by: string
  title: string
  description: string | null
  duration_days: number
  rules: string[]
  start_mode: ChallengeTemplateStartMode
  start_date: string | null
  join_deadline: string | null
  status: ChallengeTemplateStatus
  published_at: string | null
  created_at: string
}

export async function listPublishedChallengeTemplates(): Promise<ChallengeTemplateRow[]> {
  const { data, error } = await supabase
    .from("challenge_templates")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as ChallengeTemplateRow[]
}

export async function joinChallengeTemplate(templateId: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_challenge_template", { p_template_id: templateId })
  if (error) throw new Error(error.message)
  return data as string
}

export async function canPublishGlobalChallengeTemplates(): Promise<boolean> {
  // RLS allows selecting only your own allowlist row (if present)
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return false

  const { data, error } = await supabase
    .from("global_challenge_publishers")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle()

  if (error) return false
  return !!data?.user_id
}

export async function listGroupChallengeTemplates(): Promise<ChallengeTemplateRow[]> {
  const { data, error } = await supabase
    .from("challenge_templates")
    .select("*")
    .eq("scope", "group")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as ChallengeTemplateRow[]
}

export async function listMyChallengeTemplates(): Promise<ChallengeTemplateRow[]> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("challenge_templates")
    .select("*")
    .eq("created_by", auth.user.id)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as ChallengeTemplateRow[]
}

export async function createGroupChallengeTemplate(input: {
  groupId: string
  title: string
  description?: string
  durationDays: 40 | 70 | 100
  rules: string[]
  startMode: ChallengeTemplateStartMode
  startDate?: string
  joinDeadline?: string
}): Promise<ChallengeTemplateRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("challenge_templates")
    .insert([
      {
        scope: "group",
        group_id: input.groupId,
        created_by: auth.user.id,
        title: input.title,
        description: input.description ?? null,
        duration_days: input.durationDays,
        rules: input.rules ?? [],
        start_mode: input.startMode,
        start_date: input.startMode === "fixed" ? input.startDate ?? null : null,
        join_deadline: input.startMode === "fixed" ? input.joinDeadline ?? null : null,
        status: "draft",
        published_at: null,
      },
    ])
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to create template")
  return data as ChallengeTemplateRow
}

export async function createChallengeTemplate(input: {
  scope: ChallengeTemplateScope
  groupId?: string
  title: string
  description?: string
  durationDays: 40 | 70 | 100
  rules: string[]
  startMode: ChallengeTemplateStartMode
  startDate?: string
  joinDeadline?: string
}): Promise<ChallengeTemplateRow> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")

  const payload: any = {
    scope: input.scope,
    group_id: input.scope === "group" ? input.groupId ?? null : null,
    created_by: auth.user.id,
    title: input.title,
    description: input.description ?? null,
    duration_days: input.durationDays,
    rules: input.rules ?? [],
    start_mode: input.startMode,
    start_date: input.startMode === "fixed" ? input.startDate ?? null : null,
    join_deadline: input.startMode === "fixed" ? input.joinDeadline ?? null : null,
    status: "draft",
    published_at: null,
  }

  const { data, error } = await supabase.from("challenge_templates").insert([payload]).select().single()
  if (error || !data) throw new Error(error?.message || "Failed to create template")
  return data as ChallengeTemplateRow
}

export async function setChallengeTemplateStatus(
  templateId: string,
  status: ChallengeTemplateStatus
): Promise<void> {
  const patch: any = { status }
  if (status === "published") patch.published_at = new Date().toISOString()
  if (status !== "published") patch.published_at = null

  const { error } = await supabase.from("challenge_templates").update(patch).eq("id", templateId)
  if (error) throw new Error(error.message)
}

