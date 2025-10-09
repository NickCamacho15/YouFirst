/**
 * Template Exercise Card
 * 
 * Displays an exercise within a workout template builder.
 * Shows exercise name, configuration, and action buttons.
 * 
 * Features:
 * - Exercise icon based on type
 * - Name and category display
 * - Sets/reps/weight/rest summary
 * - Edit and remove actions
 * - Optional drag handle for reordering
 * 
 * @packageDocumentation
 */

import React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { TemplateExercise } from "../../types/workout"

interface TemplateExerciseCardProps {
  exercise: TemplateExercise
  onEdit: () => void
  onRemove: () => void
  onReorder?: () => void
  isDragging?: boolean
  showDragHandle?: boolean
}

export default function TemplateExerciseCard({
  exercise,
  onEdit,
  onRemove,
  onReorder,
  isDragging = false,
  showDragHandle = false,
}: TemplateExerciseCardProps) {
  // Get icon based on exercise type
  const getExerciseIcon = () => {
    switch (exercise.type) {
      case "Cardio":
        return "fitness"
      case "Bodyweight":
        return "body"
      case "Timed":
        return "timer"
      default:
        return "barbell"
    }
  }

  // Format configuration display
  const getConfigDisplay = () => {
    // For Lifting/Bodyweight with set_details, show per-set breakdown
    if ((exercise.type === "Lifting" || exercise.type === "Bodyweight") && 
        exercise.set_details && exercise.set_details.length > 0) {
      
      const setDescriptions = exercise.set_details.map(detail => {
        if (exercise.type === "Lifting" && detail.weight !== null) {
          return `${detail.reps} × ${detail.weight} lbs`
        } else {
          return `${detail.reps} reps`
        }
      })
      
      // If all sets are the same, show compact version
      const allSame = setDescriptions.every(desc => desc === setDescriptions[0])
      if (allSame) {
        const parts: string[] = []
        parts.push(`${exercise.sets} sets × ${setDescriptions[0]}`)
        if (exercise.rest_seconds > 0) {
          const mins = Math.floor(exercise.rest_seconds / 60)
          const secs = exercise.rest_seconds % 60
          const restTime = mins > 0 
            ? secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}:00`
            : `${secs}s`
          parts.push(`${restTime} rest`)
        }
        return parts.join(" × ")
      }
      
      // Different sets, show breakdown
      let display = setDescriptions.join(", ")
      if (exercise.rest_seconds > 0) {
        const mins = Math.floor(exercise.rest_seconds / 60)
        const secs = exercise.rest_seconds % 60
        const restTime = mins > 0 
          ? secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}:00`
          : `${secs}s`
        display += ` × ${restTime} rest`
      }
      return display
    }
    
    // Fallback to original logic for other types or if no set_details
    const parts: string[] = []

    // Sets
    if (exercise.sets) {
      parts.push(`${exercise.sets} sets`)
    }

    // Reps or Time
    if (exercise.type === "Cardio") {
      if (exercise.time_seconds) {
        const mins = Math.floor(exercise.time_seconds / 60)
        parts.push(`${mins} min`)
      }
      if (exercise.distance_m) {
        const miles = (exercise.distance_m / 1609.34).toFixed(1)
        parts.push(`${miles} mi`)
      }
    } else if (exercise.type === "Timed") {
      if (exercise.time_seconds) {
        parts.push(`${exercise.time_seconds}s`)
      }
    } else {
      // Lifting/Bodyweight (fallback for old data without set_details)
      if (exercise.reps) {
        parts.push(`${exercise.reps} reps`)
      }
      if (exercise.weight && exercise.type === "Lifting") {
        parts.push(`@ ${exercise.weight} lbs`)
      }
    }

    // Rest time
    if (exercise.rest_seconds > 0) {
      const mins = Math.floor(exercise.rest_seconds / 60)
      const secs = exercise.rest_seconds % 60
      const restTime = mins > 0 
        ? secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}:00`
        : `${secs}s`
      parts.push(`${restTime} rest`)
    }

    return parts.join(" × ")
  }

  return (
    <View style={[styles.card, isDragging && styles.cardDragging]}>
      {/* Exercise Header */}
      <View style={styles.header}>
        {/* Drag Handle (optional) */}
        {showDragHandle && (
          <TouchableOpacity
            onPress={onReorder}
            style={styles.dragHandle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="reorder-three" size={24} color="#999" />
          </TouchableOpacity>
        )}

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={getExerciseIcon()}
            size={24}
            color="#4A90E2"
          />
        </View>

        {/* Exercise Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text style={styles.category} numberOfLines={1}>
            {exercise.type}
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          onPress={onEdit}
          style={styles.actionButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="create-outline" size={20} color="#4A90E2" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRemove}
          style={styles.actionButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Configuration Display */}
      <View style={styles.configContainer}>
        <Text style={styles.configText}>{getConfigDisplay()}</Text>
      </View>

      {/* Notes (if any) */}
      {exercise.notes && (
        <View style={styles.notesContainer}>
          <Ionicons name="document-text-outline" size={14} color="#999" />
          <Text style={styles.notesText} numberOfLines={2}>
            {exercise.notes}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDragging: {
    opacity: 0.6,
    transform: [{ scale: 1.02 }],
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dragHandle: {
    marginRight: 8,
    padding: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  category: {
    fontSize: 13,
    color: "#666",
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },

  // Configuration
  configContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  configText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },

  // Notes
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 6,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    lineHeight: 18,
  },
})

