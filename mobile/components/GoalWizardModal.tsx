import React, { useMemo, useState } from "react"
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { format } from "date-fns"

export type GoalWizardData = {
  title: string
  description?: string
  targetDate?: string
  color?: string
  benefits: string[]
  consequences: string[]
  whoItHelps: string[]
  actionSteps: string[]
}

interface GoalWizardModalProps {
  visible: boolean
  onClose: () => void
  onCreate?: (goal: GoalWizardData) => void
}

const ACCENT_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F97316",
  "#06B6D4",
  "#F43F5E",
  "#F59E0B",
  "#7C3AED",
]

const GoalWizardModal: React.FC<GoalWizardModalProps> = ({ visible, onClose, onCreate }) => {
  const [stepIndex, setStepIndex] = useState(0)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [targetDate, setTargetDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0])

  const [benefits, setBenefits] = useState<string[]>(["", "", ""])
  const [consequences, setConsequences] = useState<string[]>(["", "", ""])
  const [whoItHelps, setWhoItHelps] = useState<string[]>(["", "", ""])
  const [actionSteps, setActionSteps] = useState<string[]>(Array.from({ length: 7 }, () => ""))

  const steps = useMemo(
    () => [
      "Set Your Goal",
      "List Benefits",
      "Consequences",
      "Who It Helps",
      "Break It Down",
      "Review & Create",
    ],
    []
  )

  const progress = (stepIndex + 1) / steps.length

  const handleNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1)
  }

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  const handleAddRow = (setter: (v: string[]) => void, values: string[]) => {
    setter([...values, ""]) 
  }

  const handleCreate = () => {
    const payload: GoalWizardData = {
      title,
      description,
      targetDate: targetDate ? format(targetDate, "MM/dd/yyyy") : undefined,
      color: accentColor,
      benefits: benefits.filter(Boolean),
      consequences: consequences.filter(Boolean),
      whoItHelps: whoItHelps.filter(Boolean),
      actionSteps: actionSteps.filter(Boolean),
    }
    onCreate?.(payload)
    onClose()
    setStepIndex(0)
  }

  const renderSetGoal = () => (
    <View>
      <Text style={styles.label}>What's your goal?</Text>
      <TextInput
        placeholder="e.g., Launch my online business"
        placeholderTextColor="#9CA3AF"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <Text style={[styles.label, { marginTop: 14 }]}>Add more details (optional)</Text>
      <TextInput
        placeholder="Describe your goal in more detail..."
        placeholderTextColor="#9CA3AF"
        value={description}
        onChangeText={setDescription}
        multiline
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
      />
      <Text style={[styles.label, { marginTop: 14 }]}>Target date (optional)</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7} style={styles.inputButton}>
        <Text style={{ color: targetDate ? "#111827" : "#9CA3AF" }}>
          {targetDate ? format(targetDate, "MM/dd/yyyy") : "mm/dd/yyyy"}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={targetDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            if (Platform.OS === "android") setShowDatePicker(false)
            if (date) setTargetDate(date)
          }}
        />
      )}
      <Text style={[styles.label, { marginTop: 14 }]}>Choose Accent Color</Text>
      <View style={styles.colorRow}>
        {ACCENT_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setAccentColor(c)}
            style={[styles.colorSwatch, { backgroundColor: c }, accentColor === c && styles.colorSwatchActive]}
          />
        ))}
      </View>
    </View>
  )

  const renderList = (
    titleText: string,
    values: string[],
    setter: (v: string[]) => void,
    addLabel: string
  ) => (
    <View>
      <Text style={styles.helperText}>{titleText}</Text>
      {values.map((v, i) => (
        <TextInput
          key={i}
          placeholder={`${addLabel} ${i + 1}`}
          placeholderTextColor="#9CA3AF"
          value={v}
          onChangeText={(t) => {
            const next = [...values]
            next[i] = t
            setter(next)
          }}
          style={styles.input}
        />
      ))}
      <TouchableOpacity onPress={() => handleAddRow(setter, values)} style={styles.addRowBtn}>
        <Text style={styles.addRowBtnText}>+ Add another</Text>
      </TouchableOpacity>
    </View>
  )

  const renderBreakdown = () => (
    <View>
      <Text style={styles.helperText}>Break it down into actionable steps</Text>
      {actionSteps.map((v, i) => (
        <TextInput
          key={i}
          placeholder={`Step ${i + 1}`}
          placeholderTextColor="#9CA3AF"
          value={v}
          onChangeText={(t) => {
            const next = [...actionSteps]
            next[i] = t
            setActionSteps(next)
          }}
          style={styles.input}
        />
      ))}
    </View>
  )

  const renderReview = () => (
    <View>
      <Text style={styles.reviewTitle}>{title || "goal name"}</Text>
      <Text style={styles.reviewSubtitle}>{description || "goal description"}</Text>
      <View style={styles.reviewCard}>
        <Text style={[styles.sectionHdr, { color: "#2563EB" }]}>Benefits:</Text>
        {benefits.filter(Boolean).map((b, i) => (
          <Text key={`b-${i}`} style={styles.bulleted}>• {b}</Text>
        ))}
        <Text style={[styles.sectionHdr, { color: "#DC2626", marginTop: 12 }]}>Consequences of not achieving:</Text>
        {consequences.filter(Boolean).map((c, i) => (
          <Text key={`c-${i}`} style={styles.bulleted}>• {c}</Text>
        ))}
        <Text style={[styles.sectionHdr, { color: "#059669", marginTop: 12 }]}>Who it helps:</Text>
        {whoItHelps.filter(Boolean).map((w, i) => (
          <Text key={`w-${i}`} style={styles.bulleted}>• {w}</Text>
        ))}
        <Text style={[styles.sectionHdr, { color: "#7C3AED", marginTop: 12 }]}>Action steps:</Text>
        {actionSteps.filter(Boolean).map((s, i) => (
          <Text key={`s-${i}`} style={styles.numbered}>{i + 1}. {s}</Text>
        ))}
      </View>
    </View>
  )

  const contentByStep = [
    renderSetGoal(),
    renderList("List 3-5 benefits you'll gain", benefits, setBenefits, "Benefit"),
    renderList("What happens if you don't achieve this goal?", consequences, setConsequences, "Consequence"),
    renderList("Who will benefit from this goal?", whoItHelps, setWhoItHelps, "Person/Group"),
    renderBreakdown(),
    renderReview(),
  ]

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={[styles.progressTrack]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accentColor }]} />
          </View>

          <Text style={styles.title}>Create New Goal</Text>

          <View style={styles.stepperRow}>
            {steps.map((_, i) => (
              <View key={i} style={styles.stepDotWrap}>
                <View style={[styles.stepDot, i <= stepIndex ? { backgroundColor: accentColor } : null]} />
              </View>
            ))}
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {contentByStep[stepIndex]}
          </ScrollView>
          </KeyboardAvoidingView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={stepIndex === 0 ? onClose : handleBack} style={[styles.footerBtn, styles.secondaryBtn]}>
              <Text style={[styles.footerBtnText, { color: "#111827" }]}>{stepIndex === 0 ? "Cancel" : "Back"}</Text>
            </TouchableOpacity>
            {stepIndex < steps.length - 1 ? (
              <TouchableOpacity onPress={handleNext} style={[styles.footerBtn, { backgroundColor: accentColor }]}>
                <Text style={styles.footerBtnText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleCreate} style={[styles.footerBtn, { backgroundColor: accentColor }]}>
                <Text style={styles.footerBtnText}>Create Goal</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 9999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 14,
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  stepDotWrap: {
    flex: 1,
    alignItems: "center",
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    marginBottom: 10,
  },
  inputButton: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    width: 40,
    height: 32,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  colorSwatchActive: {
    borderWidth: 2,
    borderColor: "#111827",
  },
  addRowBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
  },
  addRowBtnText: {
    color: "#3730A3",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  reviewSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionHdr: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  bulleted: {
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
  },
  numbered: {
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 8,
  },
  secondaryBtn: {
    backgroundColor: "#F3F4F6",
    marginLeft: 0,
    marginRight: 6,
  },
  footerBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
})

export default GoalWizardModal


