/**
 * Set Log Row Component
 * 
 * Displays a single set during workout execution with:
 * - Set number
 * - Previous performance (if available)
 * - Editable weight and reps inputs
 * - Checkbox to mark as completed
 * - Visual feedback for completed sets
 */

import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { SetLog } from "../../lib/workout-session"

interface SetLogRowProps {
  setLog: SetLog
  setNumber: number
  previousWeight?: number | null
  previousReps?: number | null
  exerciseType: string
  onComplete: (actualReps: number, actualWeight: number | null) => void
  onSkip: () => void
  disabled?: boolean
}

export default function SetLogRow({
  setLog,
  setNumber,
  previousWeight,
  previousReps,
  exerciseType,
  onComplete,
  onSkip,
  disabled = false,
}: SetLogRowProps) {
  const [weight, setWeight] = useState(
    setLog.actual_weight?.toString() || setLog.target_weight?.toString() || ""
  )
  const [reps, setReps] = useState(
    setLog.actual_reps?.toString() || setLog.target_reps?.toString() || ""
  )

  const isCompleted = !!setLog.completed_at
  const isSkipped = setLog.skipped

  const handleCheck = () => {
    if (disabled || isCompleted) return

    const repsNum = parseInt(reps)
    if (isNaN(repsNum) || repsNum < 1) {
      Alert.alert("Invalid Reps", "Please enter valid reps")
      return
    }

    let weightNum: number | null = null
    if (exerciseType === "Lifting") {
      if (weight && weight.trim() !== "") {
        weightNum = parseFloat(weight)
        if (isNaN(weightNum) || weightNum < 0) {
          Alert.alert("Invalid Weight", "Please enter valid weight")
          return
        }
      }
    }

    onComplete(repsNum, weightNum)
  }

  const formatPrevious = () => {
    if (exerciseType === "Lifting" && previousWeight !== undefined && previousWeight !== null) {
      return `${previousReps || "-"} × ${previousWeight} lbs`
    } else if (previousReps !== undefined && previousReps !== null) {
      return `${previousReps} reps`
    }
    return "—"
  }

  return (
    <View style={[styles.container, isCompleted && styles.completed, isSkipped && styles.skipped]}>
      <View style={styles.row}>
        {/* Set Number */}
        <Text style={styles.setNumber}>{setNumber}</Text>

        {/* Previous */}
        <Text style={styles.previous}>{formatPrevious()}</Text>

        {/* Reps Input */}
        <TextInput
          style={[styles.input, isCompleted && styles.inputCompleted]}
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          placeholder={setLog.target_reps?.toString() || "10"}
          placeholderTextColor="#999"
          editable={!isCompleted && !disabled}
        />

        {/* Weight Input (only for Lifting) */}
        {exerciseType === "Lifting" && (
          <TextInput
            style={[styles.input, isCompleted && styles.inputCompleted]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder={setLog.target_weight?.toString() || "135"}
            placeholderTextColor="#999"
            editable={!isCompleted && !disabled}
          />
        )}

        {/* Checkbox */}
        <TouchableOpacity
          onPress={handleCheck}
          style={styles.checkbox}
          disabled={disabled || isCompleted}
        >
          {isCompleted ? (
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
          ) : isSkipped ? (
            <Ionicons name="close-circle" size={28} color="#EF4444" />
          ) : (
            <Ionicons name="ellipse-outline" size={28} color="#999" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  completed: {
    backgroundColor: "#F0FDF4",
    borderColor: "#10B981",
  },
  skipped: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  setNumber: {
    width: 40,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  previous: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  inputCompleted: {
    backgroundColor: "#fff",
    borderColor: "#10B981",
  },
  checkbox: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
})

