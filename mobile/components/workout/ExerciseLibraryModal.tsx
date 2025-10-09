/**
 * Exercise Library Modal
 * 
 * Hevy/Strong-style exercise picker with search, filters, and multi-select.
 * Displays exercises from the exercise_library database table.
 * 
 * Features:
 * - Search by name
 * - Filter by category
 * - Alphabetical section list
 * - Multi-select support
 * - Quick scroll index (A-Z)
 * 
 * @packageDocumentation
 */

import React, { useState, useEffect, useMemo } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  SectionList,
  ActivityIndicator,
  ScrollView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { listExercises } from "../../lib/exercise-library"
import type {
  ExerciseLibraryModalProps,
  ExerciseLibraryItem,
  ExerciseCategory,
} from "../../types/workout"

const CATEGORIES: Array<ExerciseCategory | "all"> = [
  "all",
  "Chest",
  "Back",
  "Legs",
  "Shoulders",
  "Arms",
  "Core",
  "Cardio",
  "Full Body",
]

export default function ExerciseLibraryModal({
  visible,
  onClose,
  onSelectExercises,
  allowMultiSelect = true,
  preSelectedIds = [],
}: ExerciseLibraryModalProps) {
  // State
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(preSelectedIds)
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchText, setSearchText] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<
    ExerciseCategory | "all"
  >("all")

  // Load exercises on mount
  useEffect(() => {
    if (visible) {
      loadExercises()
      setSelectedIds(new Set(preSelectedIds))
    }
  }, [visible])

  const loadExercises = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listExercises()
      setExercises(data)
    } catch (err: any) {
      console.error("Failed to load exercises:", err)
      setError(err.message || "Failed to load exercises")
    } finally {
      setLoading(false)
    }
  }

  // Filter and group exercises into alphabetical sections
  const sections = useMemo(() => {
    // Apply filters
    let filtered = exercises

    // Search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase()
      filtered = filtered.filter((e) =>
        e.name.toLowerCase().includes(search)
      )
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((e) => e.category === categoryFilter)
    }

    // Group by first letter
    const grouped = new Map<string, ExerciseLibraryItem[]>()
    filtered.forEach((exercise) => {
      const letter = exercise.name[0].toUpperCase()
      if (!grouped.has(letter)) {
        grouped.set(letter, [])
      }
      grouped.get(letter)!.push(exercise)
    })

    // Convert to section list format
    return Array.from(grouped.entries())
      .map(([letter, data]) => ({ title: letter, data }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [exercises, searchText, categoryFilter])

  // Get all section letters for quick scroll
  const sectionLetters = useMemo(() => {
    return sections.map((s) => s.title)
  }, [sections])

  const toggleExercise = (exerciseId: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(exerciseId)) {
      newSet.delete(exerciseId)
    } else {
      if (!allowMultiSelect) {
        newSet.clear()
      }
      newSet.add(exerciseId)
    }
    setSelectedIds(newSet)
  }

  const handleAdd = () => {
    const selected = exercises.filter((e) => selectedIds.has(e.id))
    onSelectExercises(selected)
    
    // Reset state
    setSearchText("")
    setCategoryFilter("all")
    setSelectedIds(new Set())
    
    onClose()
  }

  const handleClose = () => {
    // Reset state
    setSearchText("")
    setCategoryFilter("all")
    setSelectedIds(new Set())
    
    onClose()
  }

  const renderExerciseCard = ({ item }: { item: ExerciseLibraryItem }) => {
    const isSelected = selectedIds.has(item.id)

    return (
      <TouchableOpacity
        style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
        onPress={() => toggleExercise(item.id)}
        activeOpacity={0.7}
      >
        {/* Thumbnail/Icon */}
        <View style={styles.exerciseThumbnail}>
          <Ionicons
            name={
              item.exercise_type === "Cardio"
                ? "fitness"
                : item.exercise_type === "Bodyweight"
                ? "body"
                : "barbell"
            }
            size={24}
            color="#4A90E2"
          />
        </View>

        {/* Info */}
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.exerciseCategory}>{item.category}</Text>
        </View>

        {/* Selection indicator */}
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Select Exercises</Text>

          <TouchableOpacity
            onPress={handleAdd}
            disabled={selectedIds.size === 0}
            style={styles.headerButton}
          >
            <Text
              style={[
                styles.addButton,
                selectedIds.size === 0 && styles.addButtonDisabled,
              ]}
            >
              Add {selectedIds.size > 0 && `(${selectedIds.size})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                categoryFilter === cat && styles.filterChipActive,
              ]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  categoryFilter === cat && styles.filterChipTextActive,
                ]}
              >
                {cat === "all" ? "All" : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Exercise List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading exercises...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadExercises} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No exercises found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={renderExerciseCard}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{section.title}</Text>
                </View>
              )}
              stickySectionHeadersEnabled
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />

            {/* Quick scroll index (A-Z) */}
            {sectionLetters.length > 0 && (
              <View style={styles.quickIndex}>
                {sectionLetters.map((letter) => (
                  <Text key={letter} style={styles.quickIndexLetter}>
                    {letter}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
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
  headerButton: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  addButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A90E2",
  },
  addButtonDisabled: {
    color: "#ccc",
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },

  // Filters
  filterContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    maxHeight: 56,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipActive: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  filterChipTextActive: {
    color: "#fff",
  },

  // List
  listContainer: {
    flex: 1,
    position: "relative",
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Exercise card
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  exerciseCardSelected: {
    backgroundColor: "#EBF5FF",
  },
  exerciseThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  exerciseCategory: {
    fontSize: 14,
    color: "#666",
  },

  // Quick index
  quickIndex: {
    position: "absolute",
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  quickIndexLetter: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4A90E2",
    paddingVertical: 1,
  },

  // States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#4A90E2",
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
})

