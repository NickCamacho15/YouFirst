import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, AppState } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getTodaysWorkouts, getThisWeeksWorkouts, getUpcomingWorkouts, getPastWorkouts, listAssignedWorkoutsForUser, getAdminScheduledWorkouts, type AssignedWorkout } from '../../lib/workout-assignments'
import { useUser } from '../../lib/user-context'
import { isWorkoutCompletedOnDate } from '../../lib/workout-session'
import { apiCall } from '../../lib/api-utils'
import { supabase } from '../../lib/supabase'
import WorkoutDetailsModal from './WorkoutDetailsModal'

interface AssignedWorkoutsListProps {
  onWorkoutPress?: (workout: AssignedWorkout) => void
}

type WorkoutWithStatus = AssignedWorkout & { 
  displayDate: string
  completionStatus?: 'completed' | 'incomplete' | 'upcoming'
}

const AssignedWorkoutsList: React.FC<AssignedWorkoutsListProps> = ({ onWorkoutPress }) => {
  const { user } = useUser()
  const isAdmin = user?.role === 'admin'
  const [todaysWorkouts, setTodaysWorkouts] = useState<AssignedWorkout[]>([])
  const [weekWorkouts, setWeekWorkouts] = useState<WorkoutWithStatus[]>([])
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<WorkoutWithStatus[]>([])
  const [pastWorkouts, setPastWorkouts] = useState<WorkoutWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const appState = useRef(AppState.currentState)
  
  // Modal state
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithStatus | AssignedWorkout | null>(null)
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false)
  const [isPastWorkout, setIsPastWorkout] = useState(false)
  const [workoutDuration, setWorkoutDuration] = useState<number | undefined>(undefined)

  useEffect(() => {
    loadWorkouts()

    // Refresh when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[AssignedWorkoutsList] App came to foreground, refreshing...')
        loadWorkouts()
      }
      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [])

  const loadWorkouts = async (isRefresh: boolean = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      // Fetch both assigned workouts and admin's own scheduled workouts with timeout
      const [today, week, all, adminWorkouts, upcoming, past] = await apiCall(
        () => Promise.all([
          getTodaysWorkouts(),
          getThisWeeksWorkouts(),
          listAssignedWorkoutsForUser(),
          isAdmin ? getAdminScheduledWorkouts() : Promise.resolve([]),
          getUpcomingWorkouts(),
          getPastWorkouts(),
        ]),
        {
          timeoutMs: 20000, // 20 second timeout
          maxRetries: 2,
          timeoutMessage: 'Failed to load workouts. Please check your connection and try again.'
        }
      )

      // Helper function to get local date string
      const getLocalDateString = (date: Date = new Date()): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      // Helper function to filter workouts by schedule
      const filterBySchedule = (workouts: AssignedWorkout[], dateStr: string) => {
        return workouts.filter(w => {
          if (w.schedule_type === 'once' && w.scheduled_date === dateStr) return true
          if (w.schedule_type === 'weekly' && w.recurrence_days) {
            const [year, month, day] = dateStr.split('-').map(Number)
            const date = new Date(year, month - 1, day)
            const dayOfWeek = date.getDay()
            return w.recurrence_days.includes(dayOfWeek)
          }
          return false
        })
      }

      // Do NOT merge admin's published schedules automatically; assignments require dates
      const todayStr = getLocalDateString()
      const allMerged = [...all]

      // For week workouts, we need to check each day
      const weekMerged = [...week]
      if (isAdmin && adminWorkouts.length > 0) {
        const today = new Date()
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay())

        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(startOfWeek)
          checkDate.setDate(startOfWeek.getDate() + i)
          const dateStr = getLocalDateString(checkDate)
          
          const adminForThisDay = filterBySchedule(adminWorkouts, dateStr)
          adminForThisDay.forEach(workout => {
            weekMerged.push({
              ...workout,
              displayDate: dateStr,
            })
          })
        }
      }

      // De-duplicate by (plan_id, scheduled_date)
      const dedupMap = new Map<string, AssignedWorkout>()
      for (const w of today) {
        const key = `${w.plan_id}|${w.scheduled_date || ''}`
        if (!dedupMap.has(key)) dedupMap.set(key, w)
      }
      const todaysDeduped = Array.from(dedupMap.values())

      // Remove any workouts already completed today from Today's list
      const completedFlags = await Promise.all(
        todaysDeduped.map(async (w) => {
          try { return await isWorkoutCompletedOnDate(w.plan_id, todayStr) } catch { return false }
        })
      )
      const todaysFiltered: AssignedWorkout[] = todaysDeduped.filter((_, idx) => !completedFlags[idx])
      setTodaysWorkouts(todaysFiltered)
      
      // Add completion status to week workouts
      const sortedWeekWorkouts = weekMerged.sort((a, b) => a.displayDate.localeCompare(b.displayDate))
      const weekWorkoutsWithStatus = await Promise.all(
        sortedWeekWorkouts.map(async (workout) => {
          const status = await getWorkoutStatus(workout.id, workout.displayDate)
          return {
            ...workout,
            completionStatus: status,
          }
        })
      )
      
      setWeekWorkouts(weekWorkoutsWithStatus)

      // Upcoming = next 7 days
      const upcomingWithStatus: WorkoutWithStatus[] = await Promise.all(
        (upcoming || []).map(async (w) => ({
          ...w,
          completionStatus: 'upcoming',
        }))
      )
      setUpcomingWorkouts(upcomingWithStatus)

      // Past workouts with completion status
      const pastWithStatus: WorkoutWithStatus[] = await Promise.all(
        (past || []).map(async (w) => {
          const status = await getWorkoutStatus(w.plan_id, w.displayDate)
          return {
            ...w,
            completionStatus: status,
          }
        })
      )
      setPastWorkouts(pastWithStatus)
    } catch (err: any) {
      console.error('Failed to load workouts:', err)
      setError(err.message || 'Failed to load workouts. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadWorkouts(true)
  }

  const handleWorkoutPress = async (workout: WorkoutWithStatus | AssignedWorkout, isPast: boolean = false) => {
    setSelectedWorkout(workout)
    setIsPastWorkout(isPast)
    
    // If it's a past completed workout, fetch the duration
    const completionStatus = 'completionStatus' in workout ? workout.completionStatus : undefined
    const displayDate = 'displayDate' in workout ? workout.displayDate : undefined
    
    if (isPast && completionStatus === 'completed' && displayDate) {
      try {
        const { data, error } = await supabase
          .from('workout_sessions')
          .select('total_seconds')
          .eq('plan_id', workout.plan_id)
          .eq('status', 'completed')
          .gte('started_at', `${displayDate}T00:00:00`)
          .lt('started_at', `${displayDate}T23:59:59`)
          .order('started_at', { ascending: false })
          .limit(1)
          .single()
        
        if (!error && data) {
          setWorkoutDuration(data.total_seconds)
        }
      } catch (err) {
        console.error('Error fetching workout duration:', err)
      }
    } else {
      setWorkoutDuration(undefined)
    }
    
    setIsDetailsModalVisible(true)
  }

  const handleCloseModal = () => {
    setIsDetailsModalVisible(false)
    setSelectedWorkout(null)
    setWorkoutDuration(undefined)
  }

  const handleStartWorkout = () => {
    if (selectedWorkout) {
      handleCloseModal()
      onWorkoutPress?.(selectedWorkout)
    }
  }

  const getWorkoutStatus = async (
    planId: string,
    dateStr: string
  ): Promise<'completed' | 'incomplete' | 'upcoming'> => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    // If the workout is in the future, it's upcoming
    if (dateStr > todayStr) {
      return 'upcoming'
    }

    // If the workout is in the past or today, check if it was completed
    try {
      const isCompleted = await isWorkoutCompletedOnDate(planId, dateStr)
      return isCompleted ? 'completed' : 'incomplete'
    } catch (error) {
      console.error('Error checking workout status:', error)
      return 'incomplete'
    }
  }

  // Parse date string in local timezone to avoid UTC conversion issues
  const parseDateLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const getScheduleLabel = (workout: AssignedWorkout) => {
    if (workout.schedule_type === 'once' && workout.scheduled_date) {
      const date = parseDateLocal(workout.scheduled_date)
      return `Scheduled for ${date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}`
    }
    if (workout.schedule_type === 'weekly' && workout.recurrence_days) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const days = workout.recurrence_days.map(d => dayNames[d]).join(', ')
      return `Every ${days}`
    }
    return ''
  }

  const getDayName = (dateStr: string) => {
    // Parse date in local timezone
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    
    const today = new Date()
    const todayYear = today.getFullYear()
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0')
    const todayDay = String(today.getDate()).padStart(2, '0')
    const todayStr = `${todayYear}-${todayMonth}-${todayDay}`
    
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const tomorrowYear = tomorrow.getFullYear()
    const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0')
    const tomorrowStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`
    
    if (dateStr === todayStr) return 'Today'
    if (dateStr === tomorrowStr) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading your workouts...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadWorkouts()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const hasAny = todaysWorkouts.length > 0 || weekWorkouts.length > 0 || upcomingWorkouts.length > 0 || pastWorkouts.length > 0
  if (!hasAny) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="barbell-outline" size={56} color="#ccc" />
        <Text style={styles.emptyTitle}>No Workouts Assigned</Text>
        <Text style={styles.emptySubtext}>
          Your coach will assign workouts for you to complete
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Today's Workouts */}
      {todaysWorkouts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="today" size={18} color="#10B981" />
            <Text style={styles.subSectionTitle}>Today's Workouts</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{todaysWorkouts.length}</Text>
            </View>
          </View>
          {todaysWorkouts.map((workout) => (
            <TouchableOpacity
              key={`today-${workout.id}`}
              style={[styles.workoutCard, styles.todayWorkoutCard]}
              onPress={() => onWorkoutPress?.(workout)}
            >
              <View style={styles.workoutHeader}>
                <View style={styles.workoutTitleContainer}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  {workout.description && (
                    <Text style={styles.workoutDescription} numberOfLines={1}>
                      {workout.description}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
              <View style={styles.workoutMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="repeat-outline" size={16} color="#10B981" />
                  <Text style={[styles.metaText, styles.todayMetaText]}>
                    {getScheduleLabel(workout)}
                  </Text>
                </View>
                {workout.assigned_by_username && (
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                    <Text style={styles.metaText}>by {workout.assigned_by_username}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Upcoming Workouts (next 7 days) */}
      {upcomingWorkouts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={18} color="#F59E0B" />
            <Text style={styles.subSectionTitle}>Upcoming Workouts</Text>
          </View>
          {upcomingWorkouts.map((workout, idx) => (
            <TouchableOpacity
              key={`upcoming-${workout.id}-${workout.displayDate}-${idx}`}
              style={styles.weekWorkoutCard}
              onPress={() => handleWorkoutPress(workout, false)}
            >
              <View style={styles.weekDayIndicator}>
                <Text style={styles.weekDayText}>{getDayName(workout.displayDate)}</Text>
              </View>
              <View style={styles.weekWorkoutInfo}>
                <Text style={styles.weekWorkoutName} numberOfLines={1}>{workout.name}</Text>
                {workout.assigned_by_username && (
                  <Text style={styles.weekWorkoutMeta}>by {workout.assigned_by_username}</Text>
                )}
              </View>
              <View style={[styles.statusBadge, styles.statusBadgeUpcoming]}>
                <Ionicons name="time-outline" size={12} color="#F59E0B" />
                <Text style={[styles.statusBadgeText, styles.statusBadgeTextUpcoming]}>Upcoming</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Past Workouts (last 14 days) */}
      {pastWorkouts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color="#8B5CF6" />
            <Text style={styles.subSectionTitle}>Past Workouts</Text>
            <Text style={styles.sectionSubtitle}>Last 14 days</Text>
          </View>
          {pastWorkouts.map((workout, idx) => (
            <TouchableOpacity
              key={`past-${workout.id}-${workout.displayDate}-${idx}`}
              style={styles.weekWorkoutCard}
              onPress={() => handleWorkoutPress(workout, true)}
            >
              <View style={[
                styles.weekDayIndicator,
                styles.pastDayIndicator
              ]}>
                <Text style={styles.weekDayText}>{getDayName(workout.displayDate)}</Text>
              </View>
              <View style={styles.weekWorkoutInfo}>
                <Text style={styles.weekWorkoutName} numberOfLines={1}>{workout.name}</Text>
                {workout.assigned_by_username && (
                  <Text style={styles.weekWorkoutMeta}>by {workout.assigned_by_username}</Text>
                )}
              </View>
              {workout.completionStatus && (
                <View style={[
                  styles.statusBadge,
                  workout.completionStatus === 'completed' && styles.statusBadgeCompleted,
                  workout.completionStatus === 'incomplete' && styles.statusBadgeIncomplete,
                ]}>
                  {workout.completionStatus === 'completed' && (
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                  )}
                  {workout.completionStatus === 'incomplete' && (
                    <Ionicons name="close-circle" size={12} color="#EF4444" />
                  )}
                  <Text style={[
                    styles.statusBadgeText,
                    workout.completionStatus === 'completed' && styles.statusBadgeTextCompleted,
                    workout.completionStatus === 'incomplete' && styles.statusBadgeTextIncomplete,
                  ]}>
                    {workout.completionStatus === 'completed' ? 'Completed' : 'Incomplete'}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Workout Details Modal */}
      <WorkoutDetailsModal
        visible={isDetailsModalVisible}
        onClose={handleCloseModal}
        workout={selectedWorkout as any}
        onStartWorkout={handleStartWorkout}
        isPast={isPastWorkout}
        completionStatus={selectedWorkout && 'completionStatus' in selectedWorkout ? selectedWorkout.completionStatus : undefined}
        duration={workoutDuration}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#999',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  workoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  todayWorkoutCard: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#ECFDF5',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workoutTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  workoutName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workoutDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  workoutMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  todayMetaText: {
    color: '#10B981',
    fontWeight: '600',
  },
  assignedByContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  assignedByText: {
    fontSize: 12,
    color: '#999',
  },
  weekWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  weekDayIndicator: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  pastDayIndicator: {
    backgroundColor: '#8B5CF6',
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  weekWorkoutInfo: {
    flex: 1,
  },
  weekWorkoutName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  weekWorkoutMeta: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusBadgeCompleted: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusBadgeIncomplete: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  statusBadgeUpcoming: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeTextCompleted: {
    color: '#10B981',
  },
  statusBadgeTextIncomplete: {
    color: '#EF4444',
  },
  statusBadgeTextUpcoming: {
    color: '#F59E0B',
  },
})

export default AssignedWorkoutsList
