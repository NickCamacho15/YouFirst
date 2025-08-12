import { View, Text, StyleSheet, TouchableOpacity } from "react-native"

const WinTodaySection = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Win Today</Text>
        <Text style={styles.subtitle}>Morning & Evening • Tasks • Workout • Reading • Rules</Text>
      </View>
      <TouchableOpacity style={styles.winButton}>
        <Text style={styles.winButtonText}>I Won Today</Text>
      </TouchableOpacity>
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
})

export default WinTodaySection
