import React, { useState } from "react"
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

interface WorkoutBuilderModalProps {
  visible: boolean
  onClose: () => void
  onSave: (name: string, description: string) => Promise<void>
  initialName?: string
  initialDescription?: string
  mode: 'create' | 'edit'
}

export default function WorkoutBuilderModal({
  visible,
  onClose,
  onSave,
  initialName = "",
  initialDescription = "",
  mode,
}: WorkoutBuilderModalProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a workout name")
      return
    }

    setSaving(true)
    try {
      await onSave(name.trim(), description.trim())
      setName("")
      setDescription("")
      onClose()
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save workout")
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setName(initialName)
    setDescription(initialDescription)
    onClose()
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
          <TouchableOpacity onPress={handleClose} disabled={saving}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'create' ? 'Create Workout' : 'Edit Workout'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Workout Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Workout Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Upper Body Strength"
              placeholderTextColor="#999"
              autoFocus
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
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
            <Text style={styles.infoText}>
              After creating this workout, you can add exercises by editing it from the workout library.
            </Text>
          </View>

          {/* Coming Soon Features */}
          <View style={styles.comingSoonBox}>
            <Text style={styles.comingSoonTitle}>🚀 Coming Soon</Text>
            <Text style={styles.comingSoonText}>
              • Add exercises directly{"\n"}
              • Set sets, reps, and weight{"\n"}
              • Organize into blocks (supersets){"\n"}
              • Reorder with drag & drop
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
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    color: "#8B5CF6",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
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
    minHeight: 100,
    paddingTop: 14,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EBF5FF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
  },
  comingSoonBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
})

