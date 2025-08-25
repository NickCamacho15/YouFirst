import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"

const WonTodayButton: React.FC = () => {
  return (
    <View style={styles.container}>
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontWeight: "700",
  },
})

export default WonTodayButton


