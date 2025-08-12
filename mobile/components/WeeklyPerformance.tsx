import { View, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const WeeklyPerformance = () => {
  const performanceItems = [
    {
      title: "Reading",
      current: "0h",
      frequency: "0h daily",
      percentage: "0%",
      goal: "of 15h goal",
      backgroundColor: "#E8F2FF",
      percentageColor: "#4A90E2",
    },
    {
      title: "Meditation",
      current: "0h",
      frequency: "0m daily",
      percentage: "0%",
      goal: "of 3.5h goal",
      backgroundColor: "#E6F7F1",
      percentageColor: "#10B981",
    },
    {
      title: "Screen Time",
      current: "0h",
      frequency: "0h daily",
      percentage: "0%",
      goal: "of limit",
      backgroundColor: "#FEF2F2",
      percentageColor: "#EF4444",
    },
    {
      title: "Workouts",
      current: "0h",
      frequency: "0m daily",
      percentage: "0%",
      goal: "of 7h goal",
      backgroundColor: "#FFF7ED",
      percentageColor: "#F59E0B",
    },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle-outline" size={24} color="#4A90E2" />
        <Text style={styles.title}>Weekly Performance</Text>
      </View>
      <View style={styles.performanceGrid}>
        {performanceItems.map((item, index) => (
          <View key={index} style={[styles.performanceCard, { backgroundColor: item.backgroundColor }]}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.currentValue}>{item.current}</Text>
              <Text style={styles.frequency}>{item.frequency}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={[styles.percentage, { color: item.percentageColor }]}>{item.percentage}</Text>
              <Text style={styles.goal}>{item.goal}</Text>
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
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  performanceGrid: {
    gap: 12,
  },
  performanceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  currentValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#333",
    marginRight: 8,
  },
  frequency: {
    fontSize: 14,
    color: "#666",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  percentage: {
    fontSize: 20,
    fontWeight: "700",
  },
  goal: {
    fontSize: 14,
    color: "#666",
  },
})

export default WeeklyPerformance
