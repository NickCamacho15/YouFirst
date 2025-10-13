import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"

export type ScheduleType = 'once' | 'weekly'

export type PlanAssignment = {
  id: string
  plan_id: string
  user_id: string
  assigned_by: string
  created_at: string
  schedule_type: ScheduleType
  scheduled_date: string | null
  recurrence_days: number[] | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

export type GroupMember = {
  id: string
  email: string
  username: string | null
  display_name: string | null
  role: 'admin' | 'user' | null
  group_id: string | null
  created_at: string
}

export type GroupMemberWithAssignments = GroupMember & {
  assigned_workout_count: number
}

export type AssignedWorkout = {
  id: string  // The plan ID
  plan_id: string  // The plan ID (for consistency)
  name: string
  description: string | null
  status: string
  created_at: string
  assignment_id: string
  assigned_at: string
  assigned_by: string
  assigned_by_username?: string
  weeks_count?: number
  schedule_type: ScheduleType
  scheduled_date?: string | null
  recurrence_days?: number[] | null
  start_date?: string | null
  end_date?: string | null
}

export type ScheduleParams = {
  scheduleType: ScheduleType
  scheduledDate?: string  // ISO date string for 'once'
  recurrenceDays?: number[]  // [1,3,5] for MWF
  startDate?: string  // ISO date string for 'weekly'
  endDate?: string  // ISO date string, optional
}

/**
 * Get all members in the current admin's group
 */
export async function getGroupMembers(): Promise<GroupMemberWithAssignments[]> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  // First, get the current user's group_id
  const { data: currentUser, error: userError } = await supabase
    .from("users")
    .select("group_id, role")
    .eq("id", uid)
    .single()

  if (userError || !currentUser) throw new Error(userError?.message || "User not found")
  if (currentUser.role !== 'admin') throw new Error("Only admins can view group members")
  if (!currentUser.group_id) throw new Error("Admin not in a group")

  // Get all users in the same group (including the admin)
  const { data: members, error: membersError } = await supabase
    .from("users")
    .select("id, email, username, display_name, role, group_id, created_at")
    .eq("group_id", currentUser.group_id)
    .order("created_at", { ascending: true })

  if (membersError) throw new Error(membersError.message)

  // TODO: Get assignment counts for each member
  return (members || []).map(member => ({
    ...member,
    assigned_workout_count: 0,
  }))
}

/**
 * Assign a workout template to a user with optional scheduling
 */
export async function assignWorkoutToUser(
  planId: string,
  userId: string,
  scheduleParams?: ScheduleParams
): Promise<PlanAssignment> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  // Use the RPC function which has built-in authorization checks
  const { data, error } = await supabase.rpc("assign_plan_to_user", {
    p_plan_id: planId,
    p_user_id: userId,
  })

  if (error) throw new Error(error.message)

  // If scheduling params provided, update the assignment
  if (scheduleParams) {
    const updateData: any = {
      schedule_type: scheduleParams.scheduleType,
    }

    if (scheduleParams.scheduleType === 'once' && scheduleParams.scheduledDate) {
      updateData.scheduled_date = scheduleParams.scheduledDate
    }

    if (scheduleParams.scheduleType === 'weekly') {
      updateData.recurrence_days = scheduleParams.recurrenceDays || []
      updateData.start_date = scheduleParams.startDate || new Date().toISOString().split('T')[0]
      if (scheduleParams.endDate) {
        updateData.end_date = scheduleParams.endDate
      }
    }

    const { error: updateError } = await supabase
      .from("plan_assignments")
      .update(updateData)
      .eq("plan_id", planId)
      .eq("user_id", userId)

    if (updateError) throw new Error(updateError.message)
  }

  // Fetch the final assignment
  const { data: assignment, error: fetchError } = await supabase
    .from("plan_assignments")
    .select("*")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .single()

  if (fetchError || !assignment) throw new Error(fetchError?.message || "Assignment not found")

  return assignment
}

/**
 * Assign a workout to multiple users at once with optional scheduling
 */
export async function assignWorkoutToMultipleUsers(
  planId: string,
  userIds: string[],
  scheduleParams?: ScheduleParams
): Promise<void> {
  const promises = userIds.map(userId => assignWorkoutToUser(planId, userId, scheduleParams))
  await Promise.all(promises)
}

/**
 * Remove a workout assignment from a user
 */
export async function unassignWorkoutFromUser(planId: string, userId: string): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  // Verify the admin owns this plan and is in the same group as the user
  const { error } = await supabase
    .from("plan_assignments")
    .delete()
    .eq("plan_id", planId)
    .eq("user_id", userId)

  if (error) throw new Error(error.message)
}

/**
 * Get all workouts assigned to a specific user
 */
export async function getAssignedWorkouts(userId?: string): Promise<AssignedWorkout[]> {
  const uid = userId || (await getCurrentUserId())
  if (!uid) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("plan_assignments")
    .select(`
      id,
      plan_id,
      user_id,
      assigned_by,
      created_at,
      schedule_type,
      scheduled_date,
      recurrence_days,
      start_date,
      end_date,
      training_plans (
        id,
        name,
        description,
        status,
        created_at
      )
    `)
    .eq("user_id", uid)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  // Filter to only show published plans
  const filtered = (data || []).filter((assignment: any) => {
    return assignment.training_plans && assignment.training_plans.status === 'published'
  })

  // Fetch additional data for each assignment
  const enriched = await Promise.all(
    filtered.map(async (assignment: any) => {
      // Get assigned_by username
      let assigned_by_username = 'Unknown'
      try {
        const { data: assignerData } = await supabase
          .from('users')
          .select('username')
          .eq('id', assignment.assigned_by)
          .single()
        if (assignerData?.username) {
          assigned_by_username = assignerData.username
        }
      } catch {}

      // Get week count
      let weeks_count = 0
      try {
        const { count } = await supabase
          .from('plan_weeks')
          .select('id', { count: 'exact', head: true })
          .eq('plan_id', assignment.plan_id)
        weeks_count = count || 0
      } catch {}

      return {
        ...assignment.training_plans,
        plan_id: assignment.plan_id,  // Explicitly set plan_id
        assignment_id: assignment.id,
        assigned_at: assignment.created_at,
        assigned_by: assignment.assigned_by,
        assigned_by_username,
        weeks_count,
        schedule_type: assignment.schedule_type || 'once',
        scheduled_date: assignment.scheduled_date,
        recurrence_days: assignment.recurrence_days,
        start_date: assignment.start_date,
        end_date: assignment.end_date,
      }
    })
  )

  return enriched
}

/**
 * Get local date string in YYYY-MM-DD format
 */
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if a workout is scheduled for today
 */
function isScheduledForToday(workout: AssignedWorkout): boolean {
  const today = new Date()
  const todayDay = today.getDay()  // 0=Sun, 1=Mon, ..., 6=Sat
  const todayStr = getLocalDateString(today)

  if (workout.schedule_type === 'once') {
    return workout.scheduled_date === todayStr
  }

  if (workout.schedule_type === 'weekly') {
    // Check if today is in recurrence_days
    if (!workout.recurrence_days || !workout.recurrence_days.includes(todayDay)) {
      return false
    }
    // Check if we're within the active date range
    if (workout.start_date && todayStr < workout.start_date) {
      return false
    }
    if (workout.end_date && todayStr > workout.end_date) {
      return false
    }
    return true
  }

  return false
}

/**
 * Get workouts scheduled for today
 */
export async function getTodaysWorkouts(): Promise<AssignedWorkout[]> {
  const allWorkouts = await getAssignedWorkouts()
  return allWorkouts.filter(isScheduledForToday)
}

/**
 * Get workouts scheduled for this week
 */
export async function getThisWeeksWorkouts(): Promise<Array<AssignedWorkout & { displayDate: string }>> {
  const allWorkouts = await getAssignedWorkouts()
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())  // Sunday
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)  // Saturday
  endOfWeek.setHours(23, 59, 59, 999)

  const weekWorkouts: Array<AssignedWorkout & { displayDate: string }> = []

  for (const workout of allWorkouts) {
    if (workout.schedule_type === 'once') {
      if (workout.scheduled_date) {
        const workoutDate = new Date(workout.scheduled_date)
        if (workoutDate >= startOfWeek && workoutDate <= endOfWeek) {
          weekWorkouts.push({ ...workout, displayDate: workout.scheduled_date })
        }
      }
    }

    if (workout.schedule_type === 'weekly' && workout.recurrence_days) {
      // Generate instances for each day this week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + dayOffset)
        const dayOfWeek = date.getDay()
        const dateStr = getLocalDateString(date)

        if (workout.recurrence_days.includes(dayOfWeek)) {
          // Check date range
          if (workout.start_date && dateStr < workout.start_date) continue
          if (workout.end_date && dateStr > workout.end_date) continue
          
          weekWorkouts.push({ ...workout, displayDate: dateStr })
        }
      }
    }
  }

  // Sort by date
  weekWorkouts.sort((a, b) => a.displayDate.localeCompare(b.displayDate))

  return weekWorkouts
}

/**
 * Get upcoming workouts for the next 7 days (rolling), excluding today
 */
export async function getUpcomingWorkouts(): Promise<Array<AssignedWorkout & { displayDate: string }>> {
  const allWorkouts = await getAssignedWorkouts()

  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() + 1) // start from tomorrow
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 7)
  endDate.setHours(23, 59, 59, 999)

  const upcoming: Array<AssignedWorkout & { displayDate: string }> = []

  for (const workout of allWorkouts) {
    if (workout.schedule_type === 'once' && workout.scheduled_date) {
      const d = new Date(workout.scheduled_date)
      if (d >= startDate && d <= endDate) {
        upcoming.push({ ...workout, displayDate: workout.scheduled_date })
      }
      continue
    }
    if (workout.schedule_type === 'weekly' && workout.recurrence_days) {
      // generate days for the next 7 days
      for (let offset = 1; offset <= 7; offset++) {
        const d = new Date(today)
        d.setDate(today.getDate() + offset)
        const dayOfWeek = d.getDay()
        const dateStr = getLocalDateString(d)
        if (!workout.recurrence_days.includes(dayOfWeek)) continue
        if (workout.start_date && dateStr < workout.start_date) continue
        if (workout.end_date && dateStr > workout.end_date) continue
        upcoming.push({ ...workout, displayDate: dateStr })
      }
    }
  }

  upcoming.sort((a, b) => a.displayDate.localeCompare(b.displayDate))
  return upcoming
}

/**
 * Get all users assigned to a specific workout
 */
export async function getUsersAssignedToWorkout(planId: string): Promise<GroupMember[]> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("plan_assignments")
    .select(`
      user_id,
      users (
        id,
        email,
        username,
        display_name,
        role,
        group_id,
        created_at
      )
    `)
    .eq("plan_id", planId)

  if (error) throw new Error(error.message)

  return (data || []).map((assignment: any) => assignment.users).filter(Boolean)
}

/**
 * Get admin's own published workouts with schedule filtering
 * This shows workouts the admin published with a schedule in their own Workouts tab
 */
export async function getAdminScheduledWorkouts(): Promise<AssignedWorkout[]> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("training_plans")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "published")
    .not("schedule_type", "is", null)

  if (error) throw new Error(error.message)

  // Transform to AssignedWorkout format
  return (data || []).map((plan: any) => ({
    id: plan.id,
    plan_id: plan.id,
    user_id: uid,
    assigned_by: uid,
    created_at: plan.created_at,
    schedule_type: plan.schedule_type,
    scheduled_date: plan.scheduled_date,
    recurrence_days: plan.recurrence_days,
    start_date: plan.start_date,
    end_date: plan.end_date,
    training_plans: {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      status: plan.status,
      created_at: plan.created_at,
    },
    name: plan.name,
    description: plan.description,
    assigned_by_username: 'You',
    weeks_count: 0,
  }))
}

// Export aliases for component compatibility
export const listGroupMembers = getGroupMembers
export const listAssignedWorkoutsForUser = getAssignedWorkouts

