import { supabase } from './supabase'
import { getCurrentUserId } from './auth'

export type DayTaskRow = {
  id: string
  user_id: string
  task_date: string
  title: string
  time_text: string | null
  done: boolean
  created_at: string
}

export type CreateTaskInput = { dateKey: string; title: string; timeText?: string }

export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function listTasksByDate(dateKey: string): Promise<DayTaskRow[]> {
  try {
    const uid = await getCurrentUserId()
    if (!uid) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from<DayTaskRow>('day_tasks')
      .select('id,user_id,task_date,title,time_text,done,created_at')
      .eq('user_id', uid)
      .eq('task_date', dateKey)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  } catch {
    // On schema-not-found or other error, surface empty to keep UI functional
    return []
  }
}

export async function createTask(input: CreateTaskInput): Promise<DayTaskRow> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from<DayTaskRow>('day_tasks')
    .insert([{ user_id: uid, task_date: input.dateKey, title: input.title, time_text: input.timeText ?? null, done: false }])
    .select('id,user_id,task_date,title,time_text,done,created_at')
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to create task')
  return data
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('day_tasks').update({ done }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('day_tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateTask(id: string, changes: { title?: string; timeText?: string }): Promise<void> {
  const payload: any = {}
  if (typeof changes.title === 'string') payload.title = changes.title
  if (typeof changes.timeText === 'string') payload.time_text = changes.timeText
  if (!Object.keys(payload).length) return
  const { error } = await supabase.from('day_tasks').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}


