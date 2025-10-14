import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { AssignedWorkout } from '../../lib/workout-assignments'
import { supabase } from '../../lib/supabase'

interface WorkoutDetailsModalProps {
  visible: boolean
  onClose: () => void
  workout: (AssignedWorkout & { displayDate?: string }) | null
  onStartWorkout?: () => void
  isPast?: boolean
  completionStatus?: 'completed' | 'incomplete' | 'upcoming'
  duration?: number // in seconds
}

interface Exercise {
  id: string
  name: string
  type: 'Lifting' | 'Cardio' | 'METCON'
  sets?: number
  reps?: number
  weight?: number
  rest?: number
  time?: number
  distance?: number
  pace?: number
  position: number
}

const WorkoutDetailsModal: React.FC<WorkoutDetailsModalProps> = ({
  visible,
  onClose,
  workout,
  onStartWorkout,
  isPast = false,
  completionStatus,
  duration,
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loadingExercises, setLoadingExercises] = useState(false)

  useEffect(() => {
    if (visible && workout) {
      loadExercises()
    }
  }, [visible, workout])

  const loadExercises = async () => {
    if (!workout?.plan_id) return
    
    setLoadingExercises(true)
    try {
      const { data, error } = await supabase
        .from('plan_exercises')
        .select('*')
        .eq('plan_id', workout.plan_id)
        .order('position', { ascending: true })
      
      if (error) {
        console.error('Error loading exercises:', error)
      } else {
        setExercises(data || [])
      }
    } catch (err) {
      console.error('Error loading exercises:', err)
    } finally {
      setLoadingExercises(false)
    }
  }

  if (!workout) return null

  const parseDateLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not scheduled'
    const date = parseDateLocal(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getScheduleLabel = () => {
    if (workout.schedule_type === 'once') {
      return 'One-time'
    }
    if (workout.schedule_type === 'weekly' && workout.recurrence_days) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const days = workout.recurrence_days.map(d => dayNames[d]).join(', ')
      return `Weekly: ${days}`
    }
    return 'Not scheduled'
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout Details</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Workout Name with Status Badge */}
          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Text style={styles.workoutName}>{workout.name}</Text>
              {isPast && completionStatus && (
                <View style={[
                  styles.statusBadgeSmall,
                  completionStatus === 'completed' ? styles.completedBadgeSmall : styles.incompleteBadgeSmall
                ]}>
                  <Ionicons 
                    name={completionStatus === 'completed' ? "checkmark-circle" : "close-circle"} 
                    size={14} 
                    color={completionStatus === 'completed' ? "#10B981" : "#EF4444"} 
                  />
                  <Text style={[
                    styles.statusTextSmall,
                    completionStatus === 'completed' ? styles.completedTextSmall : styles.incompleteTextSmall
                  ]}>
                    {completionStatus === 'completed' ? 'Completed' : 'Incomplete'}
                  </Text>
                </View>
              )}
            </View>
            {workout.description && (
              <Text style={styles.description}>{workout.description}</Text>
            )}
          </View>

          {/* Date */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar" size={20} color="#4A90E2" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  {isPast ? 'Scheduled Date' : 'Date'}
                </Text>
                <Text style={styles.infoValue}>
                  {formatDate(workout.displayDate || workout.scheduled_date || '')}
                </Text>
              </View>
            </View>
          </View>

          {/* Schedule */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="repeat" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Schedule</Text>
                <Text style={styles.infoValue}>{getScheduleLabel()}</Text>
              </View>
            </View>
          </View>

          {/* Assigned By */}
          {workout.assigned_by_username && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="person" size={20} color="#6B7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Assigned By</Text>
                  <Text style={styles.infoValue}>{workout.assigned_by_username}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Duration (for completed past workouts) */}
          {isPast && completionStatus === 'completed' && duration !== undefined && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="time" size={20} color="#10B981" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>{formatDuration(duration)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Weeks Count */}
          {workout.weeks_count !== undefined && workout.weeks_count > 0 && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="fitness" size={20} color="#F59E0B" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Program Length</Text>
                  <Text style={styles.infoValue}>
                    {workout.weeks_count} {workout.weeks_count === 1 ? 'week' : 'weeks'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Exercises */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            {loadingExercises ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4A90E2" />
                <Text style={styles.loadingText}>Loading exercises...</Text>
              </View>
            ) : exercises.length > 0 ? (
              exercises.map((exercise, idx) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseNumber}>{idx + 1}</Text>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseType}>{exercise.type}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.exerciseDetails}>
                    {exercise.type === 'Lifting' && (
                      <>
                        {exercise.sets && (
                          <View style={styles.detailItem}>
                            <Ionicons name="repeat" size={14} color="#666" />
                            <Text style={styles.detailText}>{exercise.sets} sets</Text>
                          </View>
                        )}
                        {exercise.reps && (
                          <View style={styles.detailItem}>
                            <Ionicons name="flash" size={14} color="#666" />
                            <Text style={styles.detailText}>{exercise.reps} reps</Text>
                          </View>
                        )}
                        {exercise.weight && (
                          <View style={styles.detailItem}>
                            <Ionicons name="barbell" size={14} color="#666" />
                            <Text style={styles.detailText}>{exercise.weight} lbs</Text>
                          </View>
                        )}
                        {exercise.rest && (
                          <View style={styles.detailItem}>
                            <Ionicons name="time" size={14} color="#666" />
                            <Text style={styles.detailText}>{exercise.rest}s rest</Text>
                          </View>
                        )}
                      </>
                    )}
                    
                    {exercise.type === 'Cardio' && (
                      <>
                        {exercise.time && (
                          <View style={styles.detailItem}>
                            <Ionicons name="timer" size={14} color="#666" />
                            <Text style={styles.detailText}>{exercise.time} min</Text>
                          </View>
                        )}
                        {exercise.distance && (
                          <View style={styles.detailItem}>
                            <Ionicons name="navigate" size={14} color="#666" />
                            <Text style={styles.detailText}>{exercise.distance} m</Text>
                          </View>
                        )}
                        {exercise.pace && (
                          <View style={styles.detailItem}>
                            <Ionicons name="speedometer" size={14} color="#666" />
                            <Text style={styles.detailText}>{exercise.pace} min/km</Text>
                          </View>
                        )}
                      </>
                    )}
                    
                    {exercise.type === 'METCON' && (
                      <>
                        {exercise.sets && (
                          <View style={styles.detailItem}>
                            <Ionicons name="repeat" size={14} color="#666" />
                            <Text style={styles.detailText}>{exercise.sets} rounds</Text>
                          </View>
                        )}
                        {exercise.reps && (
                          <View style={styles.detailItem}>
                            <Ionicons name="flash" size={14} color="#666" />
                            <Text style={styles.detailText}>{exercise.reps} reps</Text>
                          </View>
                        )}
                        {exercise.time && (
                          <View style={styles.detailItem}>
                            <Ionicons name="timer" size={14} color="#666" />
                            <Text style={styles.detailText}>{exercise.time} min cap</Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noExercisesText}>No exercises added yet</Text>
            )}
          </View>
        </ScrollView>

        {/* No action buttons - past workouts are read-only */}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  completedBadgeSmall: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  incompleteBadgeSmall: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  statusTextSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedTextSmall: {
    color: '#10B981',
  },
  incompleteTextSmall: {
    color: '#EF4444',
  },
  section: {
    marginBottom: 24,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    flex: 1,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  viewDetailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  exerciseCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  exerciseType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  noExercisesText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
})

export default WorkoutDetailsModal

