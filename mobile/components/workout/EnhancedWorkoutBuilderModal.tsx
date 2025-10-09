/**
 * Enhanced Workout Builder Modal
 * 
 * Hevy-style simplified workout template builder.
 * Allows admins to create workout templates by selecting exercises
 * from the library and configuring them.
 * 
 * Features:
 * - Template name input
 * - Description input
 * - Add exercises from library
 * - Configure each exercise (sets/reps/weight)
 * - Reorder exercises
 * - Remove exercises
 * - Save as draft or publish
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
  ActivityIndicator,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import ExerciseLibraryModal from "./ExerciseLibraryModal"
import ExerciseConfigModal from "./ExerciseConfigModal"
import TemplateExerciseCard from "./TemplateExerciseCard"
import { createWorkoutTemplate, updateWorkoutTemplate } from "../../lib/workout-templates"
import { supabase } from "../../lib/supabase"
import { getCurrentUserId } from "../../lib/auth"
import type {
  ExerciseLibraryItem,
  TemplateExercise,
  ExerciseConfig,
  WorkoutTemplate,
} from "../../types/workout"

interface EnhancedWorkoutBuilderModalProps {
  visible: boolean
  onClose: () => void
  onSave: (template: WorkoutTemplate) => void
  templateId?: string
  mode: "create" | "edit"
}

export default function EnhancedWorkoutBuilderModal({
  visible,
  onClose,
  onSave,
  templateId,
  mode,
}: EnhancedWorkoutBuilderModalProps) {
  // Template info
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [exercises, setExercises] = useState<TemplateExercise[]>([])

  // Modal states
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false)
  const [editingExercise, setEditingExercise] = useState<TemplateExercise | null>(null)
  const [configuringExercises, setConfiguringExercises] = useState<TemplateExercise[]>([])
  const [currentConfigIndex, setCurrentConfigIndex] = useState(0)
  
  // Loading states
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)

  // Load existing template if in edit mode
  useEffect(() => {
    if (visible && mode === "edit" && templateId) {
      loadTemplate()
    } else if (visible && mode === "create") {
      // Reset for new template
      setName("")
      setDescription("")
      setExercises([])
    }
  }, [visible, mode, templateId])

  const loadTemplate = async () => {
    if (!templateId) return

    setInitialLoading(true)
    try {
      const { data, error } = await supabase
        .from("training_plans")
        .select(`
          *,
          exercises:plan_exercises!inner(
            *,
            library:exercise_library(*)
          )
        `)
        .eq("id", templateId)
        .is("exercises.block_id", null) // Only simplified templates
        .order("exercises.position", { ascending: true })
        .single()

      if (error) throw error

      if (data) {
        setName(data.name || "")
        setDescription(data.description || "")
        
        // Transform exercises data with proper types
        const transformedExercises = (data.exercises || []).map((ex: any) => ({
          ...ex,
          sets: parseInt(ex.sets) || 0,
          reps: ex.reps ? parseInt(ex.reps) : null,
          weight: ex.weight ? parseFloat(ex.weight) : null,
          rest_seconds: parseInt(ex.rest) || 0,
          time_seconds: ex.time ? parseInt(ex.time) : null,
          distance_m: ex.distance ? parseInt(ex.distance) : null,
          pace_sec_per_km: ex.pace ? parseInt(ex.pace) : null,
          time_cap_seconds: ex.time_cap ? parseInt(ex.time_cap) : null,
          target_score: ex.target || null,
          set_details: ex.set_details || null, // Keep as-is (already JSONB)
        }))
        
        setExercises(transformedExercises)
      }
    } catch (err: any) {
      console.error("Failed to load template:", err)
      Alert.alert("Error", "Failed to load template")
    } finally {
      setInitialLoading(false)
    }
  }

  const handleAddExercises = (selectedExercises: ExerciseLibraryItem[]) => {
    // Convert library exercises to template exercises
    const newExercises: TemplateExercise[] = selectedExercises.map((ex, index) => ({
      id: `temp-${Date.now()}-${index}`, // Temporary ID
      plan_id: templateId || "",
      exercise_library_id: ex.id,
      block_id: null, // Simplified mode
      name: ex.name,
      type: ex.exercise_type,
      sets: ex.default_sets,
      reps: ex.default_reps,
      weight: ex.exercise_type === "Lifting" ? 0 : null,
      rest_seconds: ex.default_rest_seconds,
      time_seconds: null,
      distance_m: null,
      pace_sec_per_km: null,
      time_cap_seconds: null,
      score_type: null,
      target_score: null,
      notes: null,
      position: exercises.length + index + 1,
      created_at: new Date().toISOString(),
    }))

    // Close library and start configuring exercises
    setShowExerciseLibrary(false)
    setConfiguringExercises(newExercises)
    setCurrentConfigIndex(0)
    
    // Open config modal for first exercise
    if (newExercises.length > 0) {
      setEditingExercise(newExercises[0])
    }
  }

  const handleEditExercise = (exercise: TemplateExercise) => {
    // Clear any configuring state to ensure we're in edit mode
    setConfiguringExercises([])
    setCurrentConfigIndex(0)
    setEditingExercise(exercise)
  }

  const handleSaveExerciseConfig = (config: ExerciseConfig) => {
    if (!editingExercise) return

    // Check if we're in the middle of configuring new exercises
    if (configuringExercises.length > 0) {
      const updatedExercise = { ...editingExercise, ...config }
      
      // Add the configured exercise to the main list
      setExercises([...exercises, updatedExercise])
      
      // Move to next exercise in the queue
      const nextIndex = currentConfigIndex + 1
      if (nextIndex < configuringExercises.length) {
        setCurrentConfigIndex(nextIndex)
        setEditingExercise(configuringExercises[nextIndex])
        // Modal stays open for next exercise
      } else {
        // Done configuring all exercises - close modal
        setConfiguringExercises([])
        setCurrentConfigIndex(0)
        setEditingExercise(null)
      }
    } else {
      // Normal edit mode - update existing exercise and close modal
      setExercises(
        exercises.map((ex) =>
          ex.id === editingExercise.id
            ? { ...ex, ...config }
            : ex
        )
      )
      setEditingExercise(null)
    }
  }

  const handleRemoveExercise = (exerciseId: string) => {
    Alert.alert(
      "Remove Exercise",
      "Are you sure you want to remove this exercise?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setExercises(exercises.filter((ex) => ex.id !== exerciseId))
          },
        },
      ]
    )
  }

  const handleSave = async () => {
    // Validate
    if (!name.trim()) {
      Alert.alert("Template Name Required", "Please enter a template name")
      return
    }

    if (exercises.length === 0) {
      Alert.alert("No Exercises", "Please add at least one exercise")
      return
    }

    setSaving(true)
    try {
      const uid = await getCurrentUserId()
      if (!uid) throw new Error("Not authenticated")

      let planId = templateId

      // Create or update template
      if (mode === "create") {
        const { data, error } = await supabase
          .from("training_plans")
          .insert([{
            user_id: uid,
            name: name.trim(),
            description: description.trim() || null,
            status: "draft",
            is_active: false,
            start_date: new Date().toISOString().slice(0, 10),
          }])
          .select()
          .single()

        if (error || !data) throw error
        planId = data.id
      } else {
        await supabase
          .from("training_plans")
          .update({
            name: name.trim(),
            description: description.trim() || null,
          })
          .eq("id", planId!)

        // Delete existing exercises (we'll recreate them)
        await supabase
          .from("plan_exercises")
          .delete()
          .eq("plan_id", planId!)
          .is("block_id", null)
      }

      // Insert exercises
      const exerciseRows = exercises.map((ex, index) => ({
        plan_id: planId,
        exercise_library_id: ex.exercise_library_id,
        block_id: null, // Simplified mode
        user_id: uid,
        name: ex.name,
        type: ex.type,
        sets: ex.sets.toString(),
        reps: ex.reps?.toString() || null,
        weight: ex.weight?.toString() || null,
        rest: ex.rest_seconds.toString(),
        set_details: ex.set_details || null, // Per-set configurations
        time: ex.time_seconds?.toString() || null,
        distance: ex.distance_m?.toString() || null,
        pace: ex.pace_sec_per_km?.toString() || null,
        time_cap: ex.time_cap_seconds?.toString() || null,
        score_type: ex.score_type || null,
        target: ex.target_score || null,
        notes: ex.notes || null,
        position: index + 1,
      }))

      const { error: exerciseError } = await supabase
        .from("plan_exercises")
        .insert(exerciseRows)

      if (exerciseError) throw exerciseError

      // Fetch complete template
      const { data: completeTemplate } = await supabase
        .from("training_plans")
        .select("*")
        .eq("id", planId!)
        .single()

      if (completeTemplate) {
        onSave({ ...completeTemplate, exercises })
      }

      // Show success message
      Alert.alert(
        "Success",
        mode === "create" ? "Template created successfully!" : "Template updated successfully!",
        [{ text: "OK", onPress: onClose }]
      )
    } catch (err: any) {
      console.error("Failed to save template:", err)
      Alert.alert("Error", err.message || "Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (exercises.length > 0 && !templateId) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: onClose },
        ]
      )
    } else {
      onClose()
    }
  }

  if (initialLoading) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading template...</Text>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={saving}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {mode === "create" ? "New Template" : "Edit Template"}
          </Text>

          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Template Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Template Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Upper Body Strength"
              placeholderTextColor="#999"
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add notes about this workout..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Exercises List */}
          <View style={styles.section}>
            <Text style={styles.label}>Exercises ({exercises.length})</Text>

            {exercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="barbell-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No exercises yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap "Add Exercises" below to get started
                </Text>
              </View>
            ) : (
              <View style={styles.exercisesList}>
                {exercises.map((exercise) => (
                  <TemplateExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onEdit={() => handleEditExercise(exercise)}
                    onRemove={() => handleRemoveExercise(exercise.id)}
                  />
                ))}
              </View>
            )}

            {/* Add Exercises Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowExerciseLibrary(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
              <Text style={styles.addButtonText}>Add Exercises</Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          {exercises.length > 0 && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
              <Text style={styles.infoText}>
                This template will be saved as a draft. You can publish it later to make it available for assignment to users.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Exercise Library Modal */}
      <ExerciseLibraryModal
        visible={showExerciseLibrary}
        onClose={() => setShowExerciseLibrary(false)}
        onSelectExercises={handleAddExercises}
        allowMultiSelect={true}
      />

      {/* Exercise Config Modal */}
      {editingExercise && (
        <ExerciseConfigModal
          visible={!!editingExercise}
          exercise={editingExercise}
          onSave={handleSaveExerciseConfig}
          onClose={() => {
            // If configuring new exercises, cancel the flow
            if (configuringExercises.length > 0) {
              setConfiguringExercises([])
              setCurrentConfigIndex(0)
            }
            setEditingExercise(null)
          }}
          currentExerciseNumber={
            configuringExercises.length > 0 ? currentConfigIndex + 1 : undefined
          }
          totalExercises={
            configuringExercises.length > 0 ? configuringExercises.length : undefined
          }
        />
      )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A90E2",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },

  // Inputs
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },

  // Exercises List
  exercisesList: {
    marginBottom: 12,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },

  // Add Button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderStyle: "dashed",
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A90E2",
  },

  // Info Box
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EBF5FF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
})

