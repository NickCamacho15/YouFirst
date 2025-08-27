import { View, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from 'react'
import { getPersonalMasteryMetrics, subscribePersonalMastery, type PersonalMastery } from '../lib/dashboard'
import { Target } from "lucide-react-native"

const PersonalMasteryDashboard = () => {
  const [data, setData] = useState<PersonalMastery | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try { setLoading(true); const d = await getPersonalMasteryMetrics(); setData(d) } finally { setLoading(false) }
    }
    load()
    const unsub = subscribePersonalMastery(() => { load() })
    return () => { unsub() }
  }, [])

  const metrics = [
    { value: loading ? '…' : String(data?.tasksCompleted ?? 0), label: 'Tasks Completed', sublabel: 'this week', icon: 'checkmark-circle-outline', backgroundColor: '#BFDBFE', valueColor: '#4A90E2' },
    { value: loading ? '…' : String(data?.bestStreak ?? 0), label: 'Best Streak', sublabel: 'days', icon: 'flame-outline', backgroundColor: '#BBF7D0', valueColor: '#10B981' },
    { value: loading ? '…' : `${data?.consistencyPercent ?? 0}%`, label: 'Consistency', sublabel: 'this month', icon: 'star-outline', backgroundColor: '#E3D0FF', valueColor: '#8B5CF6' },
    { value: loading ? '…' : String(data?.activeGoals ?? 0), label: 'Active Goals', sublabel: 'in progress', icon: 'radio-button-off-outline', backgroundColor: '#FEF3C7', valueColor: '#F59E0B' },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Target color="#fff" width={22} height={22} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Personal Mastery Dashboard</Text>
          <Text style={styles.subtitle}>Your excellence metrics at a glance</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <View key={index} style={[styles.metricCard, { backgroundColor: metric.backgroundColor }]}>
            <Text style={[styles.metricValue, { color: metric.valueColor }]}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <View style={styles.metricFooter}>
              {metric.label === "Active Goals" ? (
                <Target color="#666" width={16} height={16} />
              ) : (
                <Ionicons name={metric.icon as any} size={16} color="#666" />
              )}
              <Text style={styles.metricSublabel}>{metric.sublabel}</Text>
            </View>
          </View>
        ))}
      </View>
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCard: {
    width: "48%",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00000010",
  },
  metricValue: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  metricFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricSublabel: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
})

export default PersonalMasteryDashboard
