import React, { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native"
import { getTodaySummary, getActivityGoals, updateActivityGoals, type TodaySummary } from "../lib/dashboard"

type ActivityKey = "reading" | "meditation" | "screen_time" | "workouts"

const formatHM = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

const WinTodaySection = () => {
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [goalModal, setGoalModal] = useState<{ open: boolean; activity?: ActivityKey }>({ open: false })
  const [minutesInput, setMinutesInput] = useState<string>("")
  const refresh = async () => {
    try {
      setLoading(true)
      const data = await getTodaySummary()
      setSummary(data)
    } finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  const openEdit = async (activity: ActivityKey) => {
    try {
      const goals = await getActivityGoals()
      setMinutesInput(String(goals[activity] || 0))
    } catch {}
    setGoalModal({ open: true, activity })
  }

  const saveGoal = async () => {
    if (!goalModal.activity) { setGoalModal({ open: false }); return }
    const n = parseInt(minutesInput.replace(/[^0-9]/g, ""), 10)
    try {
      await updateActivityGoals({ [goalModal.activity]: Number.isFinite(n) ? n : 0 } as any)
      await refresh()
    } finally {
      setGoalModal({ open: false })
    }
  }

  const Card = ({ title, value, targetMinutes, percent, onEdit, accent }: { title: string; value: number; targetMinutes: number; percent: number; onEdit: () => void; accent: string }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        <TouchableOpacity onPress={onEdit} style={[styles.editPill, { backgroundColor: accent }]}>
          <Text style={styles.editPillText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.metricRow}>
        <Text style={styles.metricBig}>{loading ? "…" : formatHM(value)}</Text>
        <Text style={styles.metricPercent}>{Math.min(999, percent)}%</Text>
      </View>
      <Text style={styles.metricSub}>{targetMinutes} min daily {title === "Screen Time" ? "limit" : "goal"}</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Win Today</Text>
        <Text style={styles.subtitle}>Morning & Evening • Tasks • Workout • Reading • Rules</Text>
      </View>
      <TouchableOpacity style={styles.winButton}>
        <Text style={styles.winButtonText}>I Won Today</Text>
      </TouchableOpacity>

      {/* Metrics */}
      <View style={{ marginTop: 16 }} />
      <Card title="Reading" accent="#e5f0ff" onEdit={() => openEdit("reading")} value={summary?.reading.seconds || 0} targetMinutes={summary?.reading.targetMinutes || 0} percent={summary?.reading.percent || 0} />
      <Card title="Meditation" accent="#e8f7f0" onEdit={() => openEdit("meditation")} value={summary?.meditation.seconds || 0} targetMinutes={summary?.meditation.targetMinutes || 0} percent={summary?.meditation.percent || 0} />
      <Card title="Screen Time" accent="#fdecec" onEdit={() => openEdit("screen_time")} value={summary?.screen_time.seconds || 0} targetMinutes={summary?.screen_time.targetMinutes || 0} percent={summary?.screen_time.percent || 0} />
      <Card title="Workouts" accent="#fff3e0" onEdit={() => openEdit("workouts")} value={summary?.workouts.seconds || 0} targetMinutes={summary?.workouts.targetMinutes || 0} percent={summary?.workouts.percent || 0} />

      {/* Edit Goal Modal */}
      {goalModal.open && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {goalModal.activity === 'screen_time' ? 'Screen Time Limit' : 'Daily Goal'}</Text>
              <TouchableOpacity onPress={() => setGoalModal({ open: false })}><Text style={{ fontWeight: '700', color: '#666' }}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Minutes</Text>
            <TextInput style={styles.modalInput} keyboardType="number-pad" value={minutesInput} onChangeText={setMinutesInput} placeholder="0" placeholderTextColor="#999" />
            <TouchableOpacity style={styles.modalSaveButton} onPress={saveGoal}><Text style={styles.modalSaveButtonText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  winButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  winButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  metricCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  metricTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  editPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  editPillText: { color: '#111', fontWeight: '700' },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  metricBig: { fontSize: 28, fontWeight: '800', color: '#111' },
  metricPercent: { fontSize: 16, fontWeight: '700', color: '#4A90E2' },
  metricSub: { marginTop: 6, color: '#666' },
  modalOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', maxWidth: 420 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  modalLabel: { color: '#666', marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#f8f9fa' },
  modalSaveButton: { backgroundColor: '#4A90E2', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  modalSaveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

export default WinTodaySection
