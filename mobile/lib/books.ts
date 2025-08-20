import { supabase } from "./supabase"

export type UserBook = {
  id: string
  user_id: string
  title: string
  author: string | null
  started_on: string | null
  completed_on: string | null
  total_pages: number | null
  created_at: string
}

export async function listBooks(): Promise<UserBook[]> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  const query = supabase
    .from("user_books")
    .select("id,user_id,title,author,started_on,completed_on,total_pages,created_at")
    .order("created_at", { ascending: false })
  const { data, error } = userId ? await query.eq("user_id", userId) : await query
  if (error) throw new Error(error.message)
  return (data as UserBook[]) || []
}

export async function addBook(payload: { title: string; author?: string; totalPages?: number }): Promise<UserBook> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from("user_books")
    .insert([
      {
        user_id: userId,
        title: payload.title,
        author: payload.author || null,
        total_pages: typeof payload.totalPages === "number" ? payload.totalPages : null,
      },
    ])
    .select("id,user_id,title,author,started_on,completed_on,total_pages,created_at")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to add book")
  return data as UserBook
}

export type ReadingInsight = {
  id: string
  user_id: string
  book_id: string | null
  insight: string
  created_at: string
}

export async function listInsights(limit = 50): Promise<ReadingInsight[]> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  const query = supabase
    .from("user_reading_insights")
    .select("id,user_id,book_id,insight,created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  const { data, error } = userId ? await query.eq("user_id", userId) : await query
  if (error) throw new Error(error.message)
  return (data as ReadingInsight[]) || []
}

export async function addInsight(payload: { insight: string; bookId?: string }): Promise<ReadingInsight> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")
  const { data, error } = await supabase
    .from("user_reading_insights")
    .insert([{ user_id: userId, book_id: payload.bookId || null, insight: payload.insight }])
    .select("id,user_id,book_id,insight,created_at")
    .single()
  if (error || !data) throw new Error(error?.message || "Failed to add insight")
  return data as ReadingInsight
}


