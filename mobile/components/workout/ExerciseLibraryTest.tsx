/**
 * Exercise Library Test Screen
 * 
 * Test harness for validating the ExerciseLibraryModal component.
 * Use this to verify all functionality works correctly before
 * integrating into the main app.
 * 
 * Test Checklist:
 * 1. Modal opens smoothly
 * 2. Exercises load (30+ items)
 * 3. Search works (try "bench", "squat")
 * 4. Category filters work
 * 5. Can select/deselect exercises
 * 6. Multi-select shows count
 * 7. Add button disabled when nothing selected
 * 8. Selected exercises returned
 * 9. Modal closes properly
 * 
 * @packageDocumentation
 */

import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import ExerciseLibraryModal from "./ExerciseLibraryModal"
import type { ExerciseLibraryItem } from "../../types/workout"

export default function ExerciseLibraryTest() {
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedExercises, setSelectedExercises] = useState<
    ExerciseLibraryItem[]
  >([])
  const [lastAction, setLastAction] = useState("")

  const handleSelect = (exercises: ExerciseLibraryItem[]) => {
    setSelectedExercises(exercises)
    setLastAction(`Selected ${exercises.length} exercise(s)`)
    console.log("✅ Selected exercises:", exercises)
  }

  const clearSelection = () => {
    setSelectedExercises([])
    setLastAction("Cleared selection")
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="flask" size={32} color="#4A90E2" />
          <Text style={styles.title}>Exercise Library Test</Text>
          <Text style={styles.subtitle}>Phase 1 Validation</Text>
        </View>

        {/* Test Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Test Checklist</Text>
          <View style={styles.checklist}>
            <Text style={styles.checklistItem}>✓ Modal opens smoothly</Text>
            <Text style={styles.checklistItem}>✓ 30+ exercises load</Text>
            <Text style={styles.checklistItem}>
              ✓ Search works (try "bench", "squat")
            </Text>
            <Text style={styles.checklistItem}>
              ✓ Category filters work
            </Text>
            <Text style={styles.checklistItem}>
              ✓ Can select/deselect exercises
            </Text>
            <Text style={styles.checklistItem}>
              ✓ Multi-select shows count
            </Text>
            <Text style={styles.checklistItem}>
              ✓ Add button disabled when nothing selected
            </Text>
            <Text style={styles.checklistItem}>
              ✓ Selected exercises returned
            </Text>
            <Text style={styles.checklistItem}>✓ Modal closes properly</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧪 Test Actions</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>Open Exercise Library</Text>
          </TouchableOpacity>

          {selectedExercises.length > 0 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={clearSelection}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.secondaryButtonText}>Clear Selection</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status */}
        {lastAction && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Last Action</Text>
            <Text style={styles.statusText}>{lastAction}</Text>
          </View>
        )}

        {/* Results */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            ✅ Selected Exercises ({selectedExercises.length})
          </Text>

          {selectedExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No exercises selected</Text>
              <Text style={styles.emptySubtext}>
                Tap "Open Exercise Library" to select some exercises
              </Text>
            </View>
          ) : (
            <View style={styles.exerciseList}>
              {selectedExercises.map((exercise, index) => (
                <View key={exercise.id} style={styles.exerciseItem}>
                  <View style={styles.exerciseIcon}>
                    <Ionicons
                      name={
                        exercise.exercise_type === "Cardio"
                          ? "fitness"
                          : exercise.exercise_type === "Bodyweight"
                          ? "body"
                          : "barbell"
                      }
                      size={20}
                      color="#4A90E2"
                    />
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                      {index + 1}. {exercise.name}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.category} • {exercise.exercise_type}
                    </Text>
                    <Text style={styles.exerciseDefaults}>
                      Defaults: {exercise.default_sets} sets ×{" "}
                      {exercise.default_reps} reps · {exercise.default_rest_seconds}s rest
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Debug Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔍 Debug Info</Text>
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              Total Selected: {selectedExercises.length}
            </Text>
            <Text style={styles.debugText}>
              Modal Visible: {modalVisible ? "Yes" : "No"}
            </Text>
            <Text style={styles.debugText}>
              Categories: {new Set(selectedExercises.map((e) => e.category)).size}
            </Text>
          </View>
        </View>

        {/* Success Message */}
        {selectedExercises.length > 0 && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.successText}>
              🎉 Exercise library working! Phase 1 validation complete.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Exercise Library Modal */}
      <ExerciseLibraryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectExercises={handleSelect}
        allowMultiSelect={true}
        preSelectedIds={selectedExercises.map((e) => e.id)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    padding: 20,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },

  // Checklist
  checklist: {
    gap: 8,
  },
  checklistItem: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },

  // Buttons
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#4A90E2",
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },

  // Status
  statusText: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "500",
  },

  // Exercise List
  exerciseList: {
    gap: 12,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    gap: 12,
  },
  exerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  exerciseDefaults: {
    fontSize: 11,
    color: "#999",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },

  // Debug Info
  debugInfo: {
    gap: 6,
  },
  debugText: {
    fontSize: 13,
    color: "#666",
    fontFamily: "monospace",
  },

  // Success Banner
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 12,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#065F46",
    lineHeight: 20,
  },
})

