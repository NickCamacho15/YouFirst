import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { LinearGradient } from "expo-linear-gradient"

const rows = [
  { key: "Reading", colors: ["#EAF2FF", "#F7FAFF"], color: "#4A90E2", goalText: "of 15h goal" },
  { key: "Meditation", colors: ["#EAF7F1", "#F9FFFC"], color: "#10B981", goalText: "of 3.5h goal" },
  { key: "Screen Time", colors: ["#FEECEC", "#FFF7F7"], color: "#EF4444", goalText: "limit exceeded" },
  { key: "Workouts", colors: ["#FFF3E6", "#FFF9F2"], color: "#F59E0B", goalText: "of 7h goal" },
]

const WeeklyPerformance = () => {
  return (
    <View style={styles.container}>
      {rows.map((r) => (
        <LinearGradient key={r.key} colors={r.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.cardRow}> 
            <View style={styles.leftCol}>
              <Text style={styles.label}>{r.key.toUpperCase()}</Text>
              <View style={styles.valuesWrap}>
                <Text style={styles.value}>0h</Text>
                <Text style={styles.subValue}>0h daily</Text>
              </View>
            </View>
            <View style={styles.rightCol}>
              <Text style={[styles.percent, { color: r.color }]}>0%</Text>
              <Text style={styles.goal}>{r.goalText}</Text>
            </View>
          </View>
        </LinearGradient>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftCol: { flex: 1 },
  rightCol: { alignItems: "flex-end", minWidth: 90 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
    marginBottom: 6,
  },
  valuesWrap: { flexDirection: "row", alignItems: "baseline" },
  value: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginRight: 6,
  },
  subValue: { fontSize: 12, color: "#6b7280" },
  percent: { fontSize: 20, fontWeight: "800" },
  goal: { fontSize: 12, color: "#6b7280", marginTop: 2 },
})

export default WeeklyPerformance
