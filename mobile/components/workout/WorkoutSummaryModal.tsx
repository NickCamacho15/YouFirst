/**
 * Workout Summary Modal
 * 
 * Displays workout completion summary with:
 * - Celebration message
 * - Total duration
 * - Exercises completed
 * - Total volume (weight × reps)
 * - Personal records (if any)
 * - Done button
 */

import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { WorkoutSession } from "../../lib/workout-session"

interface WorkoutSummaryModalProps {
  visible: boolean
  session: WorkoutSession | null
  onClose: () => void
}

export default function WorkoutSummaryModal({
  visible,
  session,
  onClose,
}: WorkoutSummaryModalProps) {
  if (!session) return null

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatVolume = (volume: number | null): string => {
    if (!volume) return "0"
    return volume.toLocaleString()
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
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Workout Complete!</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Celebration */}
          <View style={styles.celebration}>
            <View style={styles.celebrationIcon}>
              <Ionicons name="trophy" size={64} color="#FFD700" />
            </View>
            <Text style={styles.celebrationTitle}>Great Work!</Text>
            <Text style={styles.celebrationSubtitle}>
              You've completed your workout
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {/* Duration */}
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={32} color="#4A90E2" />
              <Text style={styles.statValue}>
                {formatDuration(session.total_seconds)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>

            {/* Exercises */}
            <View style={styles.statCard}>
              <Ionicons name="fitness-outline" size={32} color="#10B981" />
              <Text style={styles.statValue}>{session.exercises_completed}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>

            {/* Volume */}
            <View style={styles.statCard}>
              <Ionicons name="barbell-outline" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>
                {formatVolume(session.total_volume)}
              </Text>
              <Text style={styles.statLabel}>Total lbs</Text>
            </View>
          </View>

          {/* Additional Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
            <Text style={styles.infoText}>
              Your workout has been saved to your history. Keep up the great work!
            </Text>
          </View>
        </ScrollView>

        {/* Done Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  content: {
    flex: 1,
  },
  celebration: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  celebrationIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF7E6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  celebrationSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  statsGrid: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EBF5FF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
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
  doneButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
})

