import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const DailyRoutines = () => {
  const routineItems = [
    {
      title: "Morning Priming",
      icon: "checkmark-circle-outline",
      iconColor: "#4A90E2",
    },
    {
      title: "Today's Tasks",
      icon: "checkmark-circle-outline",
      iconColor: "#4A90E2",
      subtitle: "Monday's priorities",
      status: "0 total tasks completed",
    },
    {
      title: "Evening Reflection",
      icon: "checkmark-circle-outline",
      iconColor: "#8B5CF6",
    },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.navArrow}>
          <Ionicons name="chevron-back" size={20} color="#4A90E2" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.dayTitle}>Monday</Text>
          <Text style={styles.subtitle}>Daily Routines</Text>
        </View>
        <TouchableOpacity style={styles.navArrow}>
          <Ionicons name="chevron-forward" size={20} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {routineItems.map((item, index) => (
        <View key={index} style={styles.routineCard}>
          <View style={styles.routineHeader}>
            <View style={styles.routineInfo}>
              <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
              <Text style={styles.routineTitle}>{item.title}</Text>
            </View>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>
          {item.subtitle && (
            <View style={styles.routineDetails}>
              <Text style={styles.routineSubtitle}>{item.subtitle}</Text>
              <Text style={styles.routineStatus}>{item.status}</Text>
            </View>
          )}
        </View>
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
    justifyContent: "space-between",
    backgroundColor: "#F0F4FF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: -20,
  },
  navArrow: {
    padding: 4,
  },
  headerContent: {
    alignItems: "center",
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  routineCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  routineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routineInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  routineTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
  },
  addButton: {
    padding: 4,
  },
  routineDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginLeft: 36,
  },
  routineSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  routineStatus: {
    fontSize: 14,
    color: "#4A90E2",
    fontWeight: "500",
  },
})

export default DailyRoutines
