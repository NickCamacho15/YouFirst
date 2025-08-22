import { supabase } from "./supabase"

export type PersonalRecords = {
  user_id: string
  bench_press_1rm: number | null
  squat_1rm: number | null
  deadlift_1rm: number | null
  overhead_press_1rm: number | null
  updated_at?: string
}

const TABLE = "personal_records"

export async function getPersonalRecords(): Promise<PersonalRecords | null> {
  const { data, error } = await supabase
    .from<PersonalRecords>(TABLE)
    .select("user_id, bench_press_1rm, squat_1rm, deadlift_1rm, overhead_press_1rm, updated_at")
    .single()

  if (error) {
    // eslint-disable-next-line no-console
    console.warn("getPersonalRecords error:", error.message)
    return null
  }
  return data
}

export async function upsertPersonalRecords(input: Omit<PersonalRecords, "user_id" | "updated_at">): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Not authenticated")
  const payload: Partial<PersonalRecords> = {
    user_id: auth.user.id,
    bench_press_1rm: input.bench_press_1rm,
    squat_1rm: input.squat_1rm,
    deadlift_1rm: input.deadlift_1rm,
    overhead_press_1rm: input.overhead_press_1rm,
  }
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "user_id" })
  if (error) throw new Error(error.message)
}


