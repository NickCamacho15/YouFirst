import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getTodaysWorkouts, getThisWeeksWorkouts, listAssignedWorkoutsForUser, type AssignedWorkout } from '../../lib/workout-assignments'

interface AssignedWorkoutsListProps {
  onWorkoutPress?: (workout: AssignedWorkout) => void
}

const AssignedWorkoutsList: React.FC<AssignedWorkoutsListProps> = ({ onWorkoutPress }) => {
  const [todaysWorkouts, setTodaysWorkouts] = useState<AssignedWorkout[]>([])
  const [weekWorkouts, setWeekWorkouts] = useState<Array<AssignedWorkout & { displayDate: string }>>([])
  const [allWorkouts, setAllWorkouts] = useState<AssignedWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadWorkouts()
  }, [])

  const loadWorkouts = async () => {
    setLoading(true)
    setError(null)
    try {
      const [today, week, all] = await Promise.all([
        getTodaysWorkouts(),
        getThisWeeksWorkouts(),
        listAssignedWorkoutsForUser(),
      ])
      setTodaysWorkouts(today)
      setWeekWorkouts(week)
      setAllWorkouts(all)
    } catch (err: any) {
      console.error('Failed to load workouts:', err)
      setError(err.message || 'Failed to load workouts')
    } finally {
      setLoading(false)
    }
  }

  const getScheduleLabel = (workout: AssignedWorkout) => {
    if (workout.schedule_type === 'immediate') {
      return 'Available now'
    }
    if (workout.schedule_type === 'once' && workout.scheduled_date) {
      return `Scheduled for ${new Date(workout.scheduled_date).toLocaleDateString()}`
    }
    if (workout.schedule_type === 'weekly' && workout.recurrence_days) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const days = workout.recurrence_days.map(d => dayNames[d]).join(', ')
      return `Every ${days}`
    }
    return ''
  }

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    const isToday = dateStr === today.toISOString().split('T')[0]
    const isTomorrow = dateStr === tomorrow.toISOString().split('T')[0]
    
    if (isToday) return 'Today'
    if (isTomorrow) return 'Tomorrow'
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
        <TouchableOpacity style={styles.retryButton} onPress={loadWorkouts}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (allWorkouts.length === 0) {
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
            <Ionicons name="today" size={22} color="#10B981" />
            <Text style={styles.sectionTitle}>Today's Workouts</Text>
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

      {/* This Week */}
      {weekWorkouts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={22} color="#4A90E2" />
            <Text style={styles.sectionTitle}>This Week</Text>
          </View>
          {weekWorkouts.map((workout, idx) => (
            <TouchableOpacity
              key={`week-${workout.id}-${workout.displayDate}-${idx}`}
              style={styles.weekWorkoutCard}
              onPress={() => onWorkoutPress?.(workout)}
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
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* All Workouts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="list" size={22} color="#8B5CF6" />
          <Text style={styles.sectionTitle}>All My Workouts</Text>
        </View>
        {allWorkouts.map((workout) => (
          <TouchableOpacity
            key={`all-${workout.id}`}
            style={styles.workoutCard}
            onPress={() => onWorkoutPress?.(workout)}
          >
            <View style={styles.workoutHeader}>
              <View style={styles.workoutTitleContainer}>
                <Text style={styles.workoutName}>{workout.name}</Text>
                {workout.description && (
                  <Text style={styles.workoutDescription} numberOfLines={2}>
                    {workout.description}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>

            <View style={styles.workoutMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="repeat-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{getScheduleLabel(workout)}</Text>
              </View>
              {workout.weeks_count > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.metaText}>
                    {workout.weeks_count} {workout.weeks_count === 1 ? 'week' : 'weeks'}
                  </Text>
                </View>
              )}
            </View>

            {workout.assigned_by_username && (
              <View style={styles.assignedByContainer}>
                <Text style={styles.assignedByText}>
                  Assigned by {workout.assigned_by_username}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
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
})

export default AssignedWorkoutsList
