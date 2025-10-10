/**
 * Exercise Config Modal
 * 
 * Modal for configuring exercise settings (sets, reps, weight, rest, etc.)
 * Shows different fields based on exercise type.
 * 
 * Features:
 * - Dynamic fields based on exercise type
 * - Number inputs with +/- buttons
 * - Rest time quick-select chips
 * - Custom rest time input
 * - Notes field
 * - Validation
 * 
 * @packageDocumentation
 */

import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { TemplateExercise, ExerciseConfig, SetDetail } from "../../types/workout"

interface ExerciseConfigModalProps {
  visible: boolean
  exercise: TemplateExercise
  onSave: (config: ExerciseConfig) => void
  onClose: () => void
  currentExerciseNumber?: number  // For multi-exercise flow (e.g., 1, 2, 3)
  totalExercises?: number          // Total count in multi-exercise flow
}

const REST_TIME_PRESETS = [0, 60, 90, 120, 150, 180, 240] // in seconds

export default function ExerciseConfigModal({
  visible,
  exercise,
  onSave,
  onClose,
  currentExerciseNumber,
  totalExercises,
}: ExerciseConfigModalProps) {
  // State for individual sets
  interface SetData {
    id: string
    weight: string
    reps: string
  }
  
  const [sets, setSets] = useState<SetData[]>(() => {
    // Initialize from set_details if available, otherwise use defaults
    if (exercise.set_details && exercise.set_details.length > 0) {
      return exercise.set_details.map((detail, i) => ({
        id: `set-${i}`,
        weight: detail.weight !== null ? detail.weight.toString() : "",
        reps: detail.reps !== null ? detail.reps.toString() : "",
      }))
    }
    
    // Fallback: Initialize with empty values for new exercises
    const initialSets: SetData[] = []
    for (let i = 0; i < exercise.sets; i++) {
      initialSets.push({
        id: `set-${i}`,
        weight: exercise.weight !== null && exercise.weight !== undefined ? exercise.weight.toString() : "",
        reps: exercise.reps !== null && exercise.reps !== undefined ? exercise.reps.toString() : "",
      })
    }
    return initialSets
  })
  
  const [restSeconds, setRestSeconds] = useState(exercise.rest_seconds)
  const [timeSeconds, setTimeSeconds] = useState((exercise.time_seconds || 0).toString())
  const [distanceM, setDistanceM] = useState((exercise.distance_m || 0).toString())

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      // Initialize from set_details if available, otherwise use defaults
      if (exercise.set_details && exercise.set_details.length > 0) {
        const loadedSets = exercise.set_details.map((detail, i) => ({
          id: `set-${i}`,
          weight: detail.weight !== null ? detail.weight.toString() : "",
          reps: detail.reps !== null ? detail.reps.toString() : "",
        }))
        setSets(loadedSets)
      } else {
        const initialSets: SetData[] = []
        for (let i = 0; i < exercise.sets; i++) {
          initialSets.push({
            id: `set-${i}`,
            weight: exercise.weight !== null && exercise.weight !== undefined ? exercise.weight.toString() : "",
            reps: exercise.reps !== null && exercise.reps !== undefined ? exercise.reps.toString() : "",
          })
        }
        setSets(initialSets)
      }
      
      setRestSeconds(exercise.rest_seconds)
      setTimeSeconds((exercise.time_seconds || 0).toString())
      setDistanceM((exercise.distance_m || 0).toString())
    }
  }, [visible, exercise])

  const handleSave = () => {
    // Validate
    if (sets.length === 0) {
      Alert.alert("No Sets", "Please add at least one set")
      return
    }

    const config: ExerciseConfig = {
      sets: sets.length,
      rest_seconds: restSeconds,
    }

    // Add type-specific fields
    if (exercise.type === "Lifting" || exercise.type === "Bodyweight") {
      // Validate and build set_details array
      const setDetails: SetDetail[] = []
      
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i]
        
        // Validate reps (required)
        if (!set.reps || set.reps.trim() === "") {
          Alert.alert("Missing Reps", `Set ${i + 1}: Please enter reps`)
          return
        }
        const repsNum = parseInt(set.reps)
        if (isNaN(repsNum) || repsNum < 1) {
          Alert.alert("Invalid Reps", `Set ${i + 1}: Reps must be at least 1`)
          return
        }
        
        const detail: SetDetail = {
          set_number: i + 1,
          reps: repsNum,
          weight: null,
        }
        
        if (exercise.type === "Lifting") {
          // Validate weight (optional, but if provided must be valid)
          if (set.weight && set.weight.trim() !== "") {
            const weightNum = parseFloat(set.weight)
            if (isNaN(weightNum) || weightNum < 0) {
              Alert.alert("Invalid Weight", `Set ${i + 1}: Weight must be 0 or greater`)
              return
            }
            detail.weight = weightNum
          }
        }
        
        setDetails.push(detail)
      }
      
      config.set_details = setDetails
      
      // Also set defaults (using first set's values for backward compatibility)
      config.reps = setDetails[0].reps
      config.weight = setDetails[0].weight || undefined
      
    } else if (exercise.type === "Cardio") {
      const timeNum = parseInt(timeSeconds)
      if (!isNaN(timeNum) && timeNum > 0) {
        config.time_seconds = timeNum
      }

      const distNum = parseInt(distanceM)
      if (!isNaN(distNum) && distNum > 0) {
        config.distance_m = distNum
      }
    } else if (exercise.type === "Timed") {
      const timeNum = parseInt(timeSeconds)
      if (!isNaN(timeNum) && timeNum > 0) {
        config.time_seconds = timeNum
      }
    }

    onSave(config)
    // Don't call onClose() here - let parent decide whether to close
  }
  
  const addSet = () => {
    const lastSet = sets[sets.length - 1]
    setSets([
      ...sets,
      {
        id: `set-${Date.now()}`,
        weight: lastSet?.weight || "",
        reps: lastSet?.reps || "",
      },
    ])
  }
  
  const updateSet = (id: string, field: 'weight' | 'reps', value: string) => {
    setSets(sets.map(set => 
      set.id === id ? { ...set, [field]: value } : set
    ))
  }
  
  const removeSet = (id: string) => {
    if (sets.length <= 1) {
      Alert.alert("Cannot Remove", "You must have at least one set")
      return
    }
    setSets(sets.filter(set => set.id !== id))
  }

  const formatRestTime = (seconds: number): string => {
    if (seconds === 0) return "No fixed rest time"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    if (secs === 0) return `${mins}:00`
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const renderLiftingFields = () => (
    <>
      {/* Header Row */}
      <View style={styles.setHeader}>
        <Text style={styles.setHeaderText}>Set</Text>
        <Text style={[styles.setHeaderText, { flex: 1 }]}>Reps</Text>
        {exercise.type === "Lifting" && <Text style={[styles.setHeaderText, { flex: 1 }]}>lbs</Text>}
        <View style={{ width: 32 }} />
      </View>

      {/* Set Rows */}
      {sets.map((set, index) => (
        <View key={set.id}>
          <View style={styles.setRow}>
            <Text style={styles.setNumber}>{index + 1}</Text>
            <TextInput
              style={styles.setInput}
              value={set.reps}
              onChangeText={(value) => updateSet(set.id, 'reps', value)}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor="#999"
            />
            {exercise.type === "Lifting" && (
              <TextInput
                style={styles.setInput}
                value={set.weight}
                onChangeText={(value) => updateSet(set.id, 'weight', value)}
                keyboardType="decimal-pad"
                placeholder="135"
                placeholderTextColor="#999"
              />
            )}
            <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
              {sets.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeSet(set.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Rest Time Indicator */}
          <View style={styles.restIndicator}>
            <View style={styles.restLine} />
            <Text style={styles.restText}>{formatRestTime(restSeconds)}</Text>
          </View>
        </View>
      ))}

      {/* Add Set Button */}
      <TouchableOpacity style={styles.addSetButton} onPress={addSet}>
        <Ionicons name="add" size={20} color="#4A90E2" />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>
    </>
  )

  const renderCardioFields = () => (
    <>
      {/* Duration */}
      <View style={styles.field}>
        <Text style={styles.label}>Duration (minutes)</Text>
        <View style={styles.numberInput}>
          <TouchableOpacity
            onPress={() => {
              const current = parseInt(timeSeconds) || 0
              setTimeSeconds(Math.max(0, current - 60).toString())
            }}
            style={styles.adjustButton}
          >
            <Ionicons name="remove" size={20} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.numberValue}
            value={(parseInt(timeSeconds) / 60).toFixed(0)}
            onChangeText={(v) => {
              const mins = parseInt(v) || 0
              setTimeSeconds((mins * 60).toString())
            }}
            keyboardType="number-pad"
            maxLength={3}
          />
          <TouchableOpacity
            onPress={() => {
              const current = parseInt(timeSeconds) || 0
              setTimeSeconds((current + 60).toString())
            }}
            style={styles.adjustButton}
          >
            <Ionicons name="add" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Distance */}
      <View style={styles.field}>
        <Text style={styles.label}>Distance (miles)</Text>
        <View style={styles.numberInput}>
          <TouchableOpacity
            onPress={() => {
              const current = parseInt(distanceM) || 0
              const miles = current / 1609.34
              setDistanceM(Math.max(0, (miles - 0.1) * 1609.34).toFixed(0))
            }}
            style={styles.adjustButton}
          >
            <Ionicons name="remove" size={20} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.numberValue}
            value={(parseInt(distanceM) / 1609.34).toFixed(1)}
            onChangeText={(v) => {
              const miles = parseFloat(v) || 0
              setDistanceM((miles * 1609.34).toFixed(0))
            }}
            keyboardType="decimal-pad"
            placeholder="0.0"
            maxLength={4}
          />
          <TouchableOpacity
            onPress={() => {
              const current = parseInt(distanceM) || 0
              const miles = current / 1609.34
              setDistanceM(((miles + 0.1) * 1609.34).toFixed(0))
            }}
            style={styles.adjustButton}
          >
            <Ionicons name="add" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  )

  const renderTimedFields = () => (
    <>
      {/* Simple duration input for timed exercises */}
      <View style={styles.field}>
        <Text style={styles.label}>Duration per Set (seconds)</Text>
        <TextInput
          style={styles.simpleInput}
          value={timeSeconds}
          onChangeText={setTimeSeconds}
          keyboardType="number-pad"
          placeholder="60"
          placeholderTextColor="#999"
        />
      </View>
      
      <Text style={styles.helperTextSmall}>
        Sets: {sets.length} × {timeSeconds || 0}s each
      </Text>
    </>
  )

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
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {exercise.name}
            </Text>
            {currentExerciseNumber && totalExercises && totalExercises > 1 && (
              <Text style={styles.progressText}>
                {currentExerciseNumber} of {totalExercises}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Type-specific fields */}
          {(exercise.type === "Lifting" || exercise.type === "Bodyweight") &&
            renderLiftingFields()}
          {exercise.type === "Cardio" && renderCardioFields()}
          {exercise.type === "Timed" && renderTimedFields()}

          {/* Rest Between Sets */}
          <View style={[styles.field, { marginTop: 24 }]}>
            <Text style={styles.label}>Rest Between Sets</Text>
            <View style={styles.restChips}>
              {REST_TIME_PRESETS.map((seconds) => (
                <TouchableOpacity
                  key={seconds}
                  style={[
                    styles.restChip,
                    restSeconds === seconds && styles.restChipActive,
                  ]}
                  onPress={() => setRestSeconds(seconds)}
                >
                  <Text
                    style={[
                      styles.restChipText,
                      restSeconds === seconds && styles.restChipTextActive,
                    ]}
                  >
                    {formatRestTime(seconds)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Helper Text */}
          <View style={styles.helperBox}>
            <Ionicons name="information-circle-outline" size={18} color="#4A90E2" />
            <Text style={styles.helperText}>
              These settings will be used as the target for this exercise when users perform the workout.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  // Header
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
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  progressText: {
    fontSize: 13,
    color: "#4A90E2",
    fontWeight: "500",
    marginTop: 2,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A90E2",
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },

  // Fields
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },

  // Number Input
  numberInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    height: 56,
  },
  adjustButton: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  numberValue: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },

  // Rest Chips
  restChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  restChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  restChipActive: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  restChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  restChipTextActive: {
    color: "#fff",
  },

  // Text Area
  textArea: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#333",
    minHeight: 100,
  },

  // Helper
  helperBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EBF5FF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },
  helperTextSmall: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
    marginBottom: 16,
  },

  // Set-based UI
  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginBottom: 8,
  },
  setHeaderText: {
    width: 60,
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 4,
  },
  setNumber: {
    width: 60,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  setPrevious: {
    width: 60,
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  setInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  removeSetButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  restIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  restLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#4A90E2",
  },
  restText: {
    fontSize: 13,
    color: "#4A90E2",
    fontWeight: "500",
    marginLeft: 8,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderStyle: "dashed",
    gap: 8,
  },
  addSetText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4A90E2",
  },
  simpleInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },
})

