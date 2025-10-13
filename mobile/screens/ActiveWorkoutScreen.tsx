/**
 * Active Workout Screen
 * 
 * Main screen for executing a workout:
 * - Displays exercises from template
 * - Logs sets in real-time
 * - Rest timer between sets
 * - Progress tracking
 * - Workout completion
 */

import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import SetLogRow from "../components/workout/SetLogRow"
import RestTimer from "../components/workout/RestTimer"
import WorkoutSummaryModal from "../components/workout/WorkoutSummaryModal"
import { supabase } from "../lib/supabase"
import {
  getActiveSession,
  logSet,
  skipSet,
  startExercise,
  completeExercise,
  completeSession,
  abortSession,
  getPreviousExerciseData,
  type WorkoutSession,
  type SessionExercise,
  type SetLog,
} from "../lib/workout-session"

interface ActiveWorkoutScreenProps {
  navigation: any
  onCompleted?: () => void
}

export default function ActiveWorkoutScreen({ navigation, onCompleted }: ActiveWorkoutScreenProps) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [setLogs, setSetLogs] = useState<SetLog[]>([])
  const [previousData, setPreviousData] = useState<Record<string, SetLog[]>>({})
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restDuration, setRestDuration] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Load active session
  useEffect(() => {
    loadSession()
  }, [])

  // Timer for elapsed time
  useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      const start = new Date(session.started_at)
      const now = new Date()
      setElapsedTime(Math.floor((now.getTime() - start.getTime()) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [session])

  const loadSession = async () => {
    try {
      const data = await getActiveSession()
      
      if (!data) {
        Alert.alert(
          "No Active Workout",
          "Please start a workout from your assigned workouts.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        )
        return
      }

      setSession(data.session)
      setExercises(data.exercises)
      setSetLogs(data.setLogs)

      // Ensure set logs exist for each exercise (for legacy sessions that were created without set_logs
      // or where target_sets was not populated on session_exercises)
      try {
        // Determine sets needed per exercise
        const exercisesNeedingSetsInfo = data.exercises.filter(ex => (ex.target_sets || 0) <= 0 && !!ex.plan_exercise_id)
        let planSetMap: Record<string, number> = {}
        if (exercisesNeedingSetsInfo.length > 0) {
          const { data: planRows } = await supabase
            .from("plan_exercises")
            .select("id, sets, set_details")
            .in("id", exercisesNeedingSetsInfo.map(ex => ex.plan_exercise_id as string))
          ;(planRows || []).forEach((r: any) => {
            const parsed = parseInt(r.sets)
            const len = Array.isArray(r.set_details) ? r.set_details.length : 0
            planSetMap[r.id] = (Number.isFinite(parsed) && parsed > 0) ? parsed : (len > 0 ? len : 5) // sensible default
          })
          // Persist fixed target_sets back to session_exercises
          const updates = exercisesNeedingSetsInfo
            .filter(ex => planSetMap[ex.plan_exercise_id!])
            .map(ex => ({ id: ex.id, target_sets: planSetMap[ex.plan_exercise_id!] }))
          if (updates.length) {
            await supabase.from("session_exercises").upsert(updates, { onConflict: "id" })
            // reflect in local state
            setExercises(prev => prev.map(ex => {
              const updated = (updates as any[]).find(u => u.id === ex.id)
              return updated ? { ...ex, target_sets: updated.target_sets } : ex
            }))
          }
        }

        const missingPayload: any[] = []
        for (const ex of (data.exercises || [])) {
          const countForEx = data.setLogs.filter(l => l.session_exercise_id === ex.id).length
          const setsNeeded = (ex.target_sets && ex.target_sets > 0)
            ? ex.target_sets
            : (ex.plan_exercise_id && planSetMap[ex.plan_exercise_id]) || 0
          if (countForEx === 0 && setsNeeded > 0) {
            for (let j = 0; j < setsNeeded; j++) {
              missingPayload.push({
                session_exercise_id: ex.id,
                set_index: j + 1,
                target_reps: ex.target_reps,
                target_weight: ex.target_weight,
                skipped: false,
              })
            }
          }
        }
        if (missingPayload.length > 0) {
          const { error } = await supabase.from("set_logs").insert(missingPayload)
          if (!error) {
            const { data: refreshed } = await supabase
              .from("set_logs")
              .select("*")
              .in("session_exercise_id", data.exercises.map(e => e.id))
              .order("set_index", { ascending: true })
            setSetLogs(refreshed || [])
          }
        }
      } catch (e) {
        console.warn('[ActiveWorkout] ensure set logs failed', e)
      }

      // Load previous data for all exercises
      const prevDataMap: Record<string, SetLog[]> = {}
      for (const ex of data.exercises) {
        if (ex.plan_exercise_id) {
          const prevData = await getPreviousExerciseData(ex.plan_exercise_id)
          if (prevData) {
            prevDataMap[ex.id] = prevData
          }
        }
      }
      setPreviousData(prevDataMap)

      // Mark first exercise as started
      if (data.exercises.length > 0 && !data.exercises[0].started_at) {
        await startExercise(data.exercises[0].id)
      }
    } catch (error: any) {
      console.error("Failed to load session:", error)
      Alert.alert("Error", "Failed to load workout session")
    } finally {
      setLoading(false)
    }
  }

  // Build quick lookup for sets by exercise
  const setsByExerciseId: Record<string, SetLog[]> = {}
  for (const log of setLogs) {
    if (!setsByExerciseId[log.session_exercise_id]) setsByExerciseId[log.session_exercise_id] = []
    setsByExerciseId[log.session_exercise_id].push(log)
  }

  // Derive the currently active exercise for convenience
  const currentExercise: SessionExercise | null =
    exercises && exercises.length > 0 ? (exercises[currentExerciseIndex] || null) : null

  const handleSetComplete = async (setLog: SetLog, actualReps: number, actualWeight: number | null) => {
    try {
      await logSet(setLog.id, actualReps, actualWeight, null)
      
      // Update local state
      setSetLogs(prev => prev.map(log => 
        log.id === setLog.id 
          ? { ...log, actual_reps: actualReps, actual_weight: actualWeight, completed_at: new Date().toISOString() }
          : log
      ))

      // Determine exercise for this set
      const exerciseForSet = exercises.find(ex => ex.id === setLog.session_exercise_id)
      if (exerciseForSet) {
        // If exercise not started, start it
        if (!exerciseForSet.started_at) {
          await startExercise(exerciseForSet.id)
          setExercises(prev => prev.map(ex => ex.id === exerciseForSet.id ? { ...ex, started_at: new Date().toISOString() } : ex))
        }

        // Rest timer if not last set for that exercise
        const logsForExercise = (setsByExerciseId[exerciseForSet.id] || []).slice()
        const setIndex = logsForExercise.findIndex(s => s.id === setLog.id)
        // Show rest timer between sets; user can skip, complete, or extend
        if (setIndex < (logsForExercise.length - 1) && exerciseForSet.target_rest_seconds > 0) {
          setRestDuration(exerciseForSet.target_rest_seconds)
          setShowRestTimer(true)
        }

        // Auto-complete exercise when all sets done
        const updatedLogs = (setLogs.filter(l => l.session_exercise_id === exerciseForSet.id).map(l => l.id === setLog.id ? { ...l, completed_at: new Date().toISOString() } as any : l))
        const allDone = updatedLogs.every(l => l.completed_at)
        if (allDone && !exerciseForSet.completed_at) {
          await completeExercise(exerciseForSet.id)
          setExercises(prev => prev.map(ex => ex.id === exerciseForSet.id ? { ...ex, completed_at: new Date().toISOString() } : ex))
        }
      }
    } catch (error: any) {
      console.error("Failed to log set:", error)
      Alert.alert("Error", "Failed to log set")
    }
  }

  const handleSetSkip = async (setLog: SetLog) => {
    try {
      await skipSet(setLog.id)
      
      setSetLogs(prev => prev.map(log => 
        log.id === setLog.id 
          ? { ...log, skipped: true, completed_at: new Date().toISOString() }
          : log
      ))
    } catch (error: any) {
      console.error("Failed to skip set:", error)
      Alert.alert("Error", "Failed to skip set")
    }
  }

  const handleNextExercise = async () => {
    if (!currentExercise) return

    try {
      // Mark current exercise as completed
      await completeExercise(currentExercise.id)
      setExercises(prev => prev.map(ex => 
        ex.id === currentExercise.id 
          ? { ...ex, completed_at: new Date().toISOString() }
          : ex
      ))

      // Move to next exercise or finish
      if (currentExerciseIndex < exercises.length - 1) {
        const nextIndex = currentExerciseIndex + 1
        setCurrentExerciseIndex(nextIndex)
        
        // Mark next exercise as started
        await startExercise(exercises[nextIndex].id)
        setExercises(prev => prev.map(ex => 
          ex.id === exercises[nextIndex].id 
            ? { ...ex, started_at: new Date().toISOString() }
            : ex
        ))
      } else {
        // Workout complete!
        await finishWorkout()
      }
    } catch (error: any) {
      console.error("Failed to proceed:", error)
      Alert.alert("Error", "Failed to proceed to next exercise")
    }
  }

  const finishWorkout = async () => {
    if (!session) return

    try {
      await completeSession(session.id)
      
      // Load the just-completed session to get final totals/duration
      try {
        const { data } = await supabase
          .from("workout_sessions")
          .select("*")
          .eq("id", session.id)
          .single()
        if (data) {
          setSession(data as any)
        }
      } catch {}
      
      setShowSummary(true)
      try { onCompleted?.() } catch {}
    } catch (error: any) {
      console.error("Failed to complete workout:", error)
      Alert.alert("Error", "Failed to complete workout")
    }
  }

  const handleQuitWorkout = () => {
    Alert.alert(
      "Quit Workout",
      "Are you sure you want to quit? Your progress will be saved but the workout will be marked as incomplete.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Quit",
          style: "destructive",
          onPress: async () => {
            try {
              if (session) {
                await abortSession(session.id)
              }
              navigation.goBack()
            } catch (error: any) {
              console.error("Failed to abort session:", error)
              Alert.alert("Error", "Failed to quit workout")
            }
          },
        },
      ]
    )
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const allSetsCompleted = exercises.length > 0 && exercises.every(ex => {
    const logs = setsByExerciseId[ex.id] || []
    return logs.length > 0 && logs.every(l => l.completed_at)
  })

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    )
  }

  if (!exercises || exercises.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>No exercises found</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleQuitWorkout}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTime}>{formatTime(elapsedTime)}</Text>
          <Text style={styles.headerSubtitle}>
            Exercise {currentExerciseIndex + 1} of {exercises.length}
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {exercises.map((ex, exIndex) => {
          const exSets = (setsByExerciseId[ex.id] || [])
          const completed = exSets.filter(s => s.completed_at).length
          const prev = previousData[ex.id]
          return (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseIcon}>
                  <Ionicons name="barbell" size={32} color="#4A90E2" />
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseType}>Exercise {exIndex + 1} of {exercises.length} • {ex.type}</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${exSets.length ? (completed / exSets.length) * 100 : 0}%` }]} />
              </View>
              <Text style={styles.progressText}>{completed} of {exSets.length} sets completed</Text>

              <View style={styles.setHeader}>
                <View style={styles.colSet}><Text style={styles.setHeaderLabel}>Set</Text></View>
                {/* Keep column spacing but hide label */}
                <View style={styles.colFlex}><Text style={styles.setHeaderLabel} /></View>
                <View style={styles.colFlex}><Text style={styles.setHeaderLabel}>Reps</Text></View>
                {ex.type === "Lifting" && (
                  <View style={styles.colFlex}><Text style={styles.setHeaderLabel}>lbs</Text></View>
                )}
                <View style={styles.colCheck} />
              </View>

              {exSets.map((setLog, index) => (
                <SetLogRow
                  key={setLog.id}
                  setLog={setLog}
                  setNumber={index + 1}
                  previousWeight={prev?.[index]?.actual_weight}
                  previousReps={prev?.[index]?.actual_reps}
                  exerciseType={ex.type}
                  onComplete={(reps, weight) => handleSetComplete(setLog, reps, weight)}
                  onSkip={() => handleSetSkip(setLog)}
                />
              ))}
            </View>
          )
        })}

        {!allSetsCompleted && (
          <View style={styles.instructions}>
            <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
            <Text style={styles.instructionsText}>Tap the checkbox after completing each set</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {allSetsCompleted ? (
          <TouchableOpacity style={styles.nextButton} onPress={finishWorkout}>
            <Text style={styles.nextButtonText}>Finish Workout</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Text style={styles.footerHint}>Complete all sets to finish</Text>
        )}
      </View>

      {/* Rest Timer */}
      <RestTimer
        visible={showRestTimer}
        duration={restDuration}
        onComplete={() => setShowRestTimer(false)}
        onSkip={() => setShowRestTimer(false)}
        onExtend={() => { /* RestTimer manages its own extension to avoid reset */ }}
      />

      {/* Workout Summary */}
      <WorkoutSummaryModal
        visible={showSummary}
        session={session}
        onClose={() => {
          setShowSummary(false)
          navigation.goBack()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#EF4444",
    textAlign: "center",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTime: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  exerciseType: {
    fontSize: 14,
    color: "#666",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginBottom: 12,
  },
  colSet: { width: 40, alignItems: "center" },
  colFlex: { flex: 1, alignItems: "center" },
  colCheck: { width: 52 },
  setHeaderLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  instructions: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF5FF",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 34,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  footerHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
})

