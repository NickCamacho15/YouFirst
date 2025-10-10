import React from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { WorkoutTemplateWithDetails } from "../../lib/workout-templates"

interface WorkoutTemplateCardProps {
  template: WorkoutTemplateWithDetails
  onEdit: () => void
  onPublish: () => void
  onUnpublish?: () => void
  onAssign: () => void
  onDelete: () => void
}

export default function WorkoutTemplateCard({
  template,
  onEdit,
  onPublish,
  onUnpublish,
  onAssign,
  onDelete,
}: WorkoutTemplateCardProps) {
  const isDraft = template.status === 'draft'
  const isPublished = template.status === 'published'
  const isArchived = template.status === 'archived'

  const handleDelete = () => {
    Alert.alert(
      "Delete Workout",
      `Are you sure you want to delete "${template.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    )
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {template.name}
          </Text>
          {isDraft && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>DRAFT</Text>
            </View>
          )}
          {isPublished && (
            <View style={[styles.badge, styles.badgePublished]}>
              <Text style={[styles.badgeText, styles.badgeTextPublished]}>PUBLISHED</Text>
            </View>
          )}
          {isArchived && (
            <View style={[styles.badge, styles.badgeArchived]}>
              <Text style={[styles.badgeText, styles.badgeTextArchived]}>ARCHIVED</Text>
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      {template.description && (
        <Text style={styles.description} numberOfLines={2}>
          {template.description}
        </Text>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Ionicons name="barbell-outline" size={16} color="#666" />
          <Text style={styles.statText}>
            {template.exercise_count || 0} exercises
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.statText}>
            {template.assignment_count || 0} assigned
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={20} color="#4A90E2" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>

        {isDraft && (
          <TouchableOpacity style={styles.actionButton} onPress={onPublish}>
            <Ionicons name="cloud-upload-outline" size={20} color="#10B981" />
            <Text style={[styles.actionText, { color: "#10B981" }]}>Publish</Text>
          </TouchableOpacity>
        )}

        {isPublished && onUnpublish && (
          <TouchableOpacity style={styles.actionButton} onPress={onUnpublish}>
            <Ionicons name="cloud-offline-outline" size={20} color="#F59E0B" />
            <Text style={[styles.actionText, { color: "#F59E0B" }]}>Unpublish</Text>
          </TouchableOpacity>
        )}

        {isPublished && (
          <TouchableOpacity style={styles.actionButton} onPress={onAssign}>
            <Ionicons name="person-add-outline" size={20} color="#4A90E2" />
            <Text style={[styles.actionText, { color: "#4A90E2" }]}>Assign</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.actionText, { color: "#EF4444" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  badge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgePublished: {
    backgroundColor: "#10B981",
  },
  badgeArchived: {
    backgroundColor: "#6B7280",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  badgeTextPublished: {
    color: "#fff",
  },
  badgeTextArchived: {
    color: "#fff",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  stats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: "#666",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4A90E2",
  },
})

