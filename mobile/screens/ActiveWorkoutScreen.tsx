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
}

export default function ActiveWorkoutScreen({ navigation }: ActiveWorkoutScreenProps) {
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

  const currentExercise = exercises[currentExerciseIndex]
  const currentSets = currentExercise 
    ? setLogs.filter(log => log.session_exercise_id === currentExercise.id)
    : []

  const completedSetsCount = currentSets.filter(log => log.completed_at).length
  const previousSets = currentExercise && previousData[currentExercise.id]

  const handleSetComplete = async (setLog: SetLog, actualReps: number, actualWeight: number | null) => {
    try {
      await logSet(setLog.id, actualReps, actualWeight, null)
      
      // Update local state
      setSetLogs(prev => prev.map(log => 
        log.id === setLog.id 
          ? { ...log, actual_reps: actualReps, actual_weight: actualWeight, completed_at: new Date().toISOString() }
          : log
      ))

      // Show rest timer if not last set
      const setIndex = currentSets.findIndex(s => s.id === setLog.id)
      if (setIndex < currentSets.length - 1 && currentExercise.target_rest_seconds > 0) {
        setRestDuration(currentExercise.target_rest_seconds)
        setShowRestTimer(true)
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
      
      // Reload session to get updated stats
      const updated = await getActiveSession()
      if (updated) {
        setSession(updated.session)
      }
      
      setShowSummary(true)
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

  const allSetsCompleted = currentSets.every(log => log.completed_at)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    )
  }

  if (!currentExercise) {
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
        {/* Exercise Info */}
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseIcon}>
            <Ionicons name="barbell" size={32} color="#4A90E2" />
          </View>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{currentExercise.name}</Text>
            <Text style={styles.exerciseType}>{currentExercise.type}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(completedSetsCount / currentSets.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {completedSetsCount} of {currentSets.length} sets completed
        </Text>

        {/* Set Header */}
        <View style={styles.setHeader}>
          <Text style={styles.setHeaderText}>Set</Text>
          <Text style={styles.setHeaderText}>Previous</Text>
          <Text style={styles.setHeaderText}>Reps</Text>
          {currentExercise.type === "Lifting" && (
            <Text style={styles.setHeaderText}>lbs</Text>
          )}
          <View style={{ width: 40 }} />
        </View>

        {/* Sets List */}
        {currentSets.map((setLog, index) => (
          <SetLogRow
            key={setLog.id}
            setLog={setLog}
            setNumber={index + 1}
            previousWeight={previousSets?.[index]?.actual_weight}
            previousReps={previousSets?.[index]?.actual_reps}
            exerciseType={currentExercise.type}
            onComplete={(reps, weight) => handleSetComplete(setLog, reps, weight)}
            onSkip={() => handleSetSkip(setLog)}
          />
        ))}

        {/* Instructions */}
        {!allSetsCompleted && (
          <View style={styles.instructions}>
            <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
            <Text style={styles.instructionsText}>
              Tap the checkbox after completing each set
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {allSetsCompleted ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextExercise}
          >
            <Text style={styles.nextButtonText}>
              {currentExerciseIndex < exercises.length - 1 ? "Next Exercise" : "Finish Workout"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Text style={styles.footerHint}>
            Complete all sets to continue
          </Text>
        )}
      </View>

      {/* Rest Timer */}
      <RestTimer
        visible={showRestTimer}
        duration={restDuration}
        onComplete={() => setShowRestTimer(false)}
        onSkip={() => setShowRestTimer(false)}
        onExtend={(secs) => setRestDuration(prev => prev + secs)}
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
  setHeaderText: {
    flex: 1,
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

