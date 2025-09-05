import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"

export type BodyMetrics = {
  user_id: string
  gender: "male" | "female"
  age_years: number
  height_inches: number
  weight_lbs: number
  est_body_fat_percent: number
  updated_at?: string
}

const TABLE = "body_metrics"

export async function getBodyMetrics(): Promise<BodyMetrics | null> {
  const uid = await getCurrentUserId()
  if (!uid) return null
  const { data, error } = await supabase
    .from<BodyMetrics>(TABLE)
    .select("user_id, gender, age_years, height_inches, weight_lbs, est_body_fat_percent, updated_at")
    .eq("user_id", uid)
    .maybeSingle()
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("getBodyMetrics error:", error.message)
    return null
  }
  return data
}

export async function upsertBodyMetrics(input: Omit<BodyMetrics, "user_id" | "updated_at">): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")
  const payload: BodyMetrics = { user_id: uid, ...input }
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "user_id" })
  if (error) throw new Error(error.message)
}

// Utilities
export function inchesFromFeetInches(feet: number, inches: number): number {
  return feet * 12 + inches
}

export function calculateBmiFromImperial(weightLbs: number, heightInches: number): number {
  if (!weightLbs || !heightInches) return 0
  return (703 * weightLbs) / (heightInches * heightInches)
}

// Deurenberg formula: BF% = 1.20*BMI + 0.23*age - 10.8*sex - 5.4
// sex: 1 for male, 0 for female
export function estimateBodyFatPercentDeurenberg(params: { gender: "male" | "female"; ageYears: number; weightLbs: number; heightInches: number }): number {
  const { gender, ageYears, weightLbs, heightInches } = params
  const bmi = calculateBmiFromImperial(weightLbs, heightInches)
  const sex = gender === "male" ? 1 : 0
  const bf = 1.2 * bmi + 0.23 * ageYears - 10.8 * sex - 5.4
  // Clamp to sane range 0..60
  return Math.max(0, Math.min(60, Number(bf.toFixed(1))))
}


