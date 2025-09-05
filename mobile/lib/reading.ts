import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"

export type ReadingSessionRow = {
  id: string
  user_id: string
  started_at: string
  ended_at: string
  duration_seconds: number
  book_title: string | null
  reflection: string | null
  pages_read: number | null
  created_at: string
}

export type SaveReadingSessionInput = {
  startedAt: string // ISO string
  endedAt: string // ISO string
  durationSeconds: number
  bookTitle?: string
  reflection?: string
  pagesRead?: number
  bookId?: string
}

export async function saveReadingSession(input: SaveReadingSessionInput): Promise<ReadingSessionRow> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  const payload = {
    user_id: userId,
    started_at: input.startedAt,
    ended_at: input.endedAt,
    duration_seconds: Math.max(0, Math.floor(input.durationSeconds || 0)),
    book_title: input.bookTitle?.trim() ? input.bookTitle.trim() : null,
    reflection: input.reflection?.trim() ? input.reflection.trim() : null,
    pages_read: typeof input.pagesRead === "number" && !Number.isNaN(input.pagesRead) ? input.pagesRead : null,
    book_id: input.bookId || null,
  }

  const { data, error } = await supabase
    .from("user_reading_sessions")
    .insert([payload])
    .select("id,user_id,started_at,ended_at,duration_seconds,book_title,reflection,pages_read,created_at")
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to save session")
  return data as ReadingSessionRow
}

export async function listReadingSessions(limit = 50): Promise<ReadingSessionRow[]> {
  const userId = await getCurrentUserId()
  const query = supabase
    .from("user_reading_sessions")
    .select("id,user_id,started_at,ended_at,duration_seconds,book_title,reflection,pages_read,created_at")
    .order("started_at", { ascending: false })
    .limit(limit)
  const { data, error } = userId ? await query.eq("user_id", userId) : await query
  if (error) throw new Error(error.message)
  return (data as ReadingSessionRow[]) || []
}

export type ReadingStats = {
  totalSeconds: number
  sessionCount: number
  averageSeconds: number
}

export async function getReadingStats(): Promise<ReadingStats> {
  const userId = await getCurrentUserId()
  if (!userId) return { totalSeconds: 0, sessionCount: 0, averageSeconds: 0 }

  const { data, error } = await supabase
    .from("user_reading_sessions")
    .select("duration_seconds", { count: "exact" })
    .eq("user_id", userId)

  if (error) throw new Error(error.message)
  const durations = (data as { duration_seconds: number }[]) || []
  const totalSeconds = durations.reduce((sum, r) => sum + (r.duration_seconds || 0), 0)
  const sessionCount = durations.length
  const averageSeconds = sessionCount ? Math.round(totalSeconds / sessionCount) : 0
  return { totalSeconds, sessionCount, averageSeconds }
}


