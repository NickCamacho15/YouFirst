import type React from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Image } from "react-native"
import TopHeader from "../components/TopHeader"
import { Ionicons } from "@expo/vector-icons"
import { Target, Plus, Trophy } from "lucide-react-native"

interface ScreenProps { onLogout?: () => void }

const GoalsScreen: React.FC<ScreenProps> = ({ onLogout }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <TopHeader onLogout={onLogout} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Active Goals Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Target width={22} height={22} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Active Goals</Text>
          </View>
          <TouchableOpacity style={styles.setClearGoalButton}>
            <Plus width={18} height={18} color="#fff" />
            <Text style={styles.setClearGoalButtonText}>Set a Clear Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Empty State Card */}
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyStateIcon}>
            <View style={styles.iconBackground}>
              <Target width={40} height={40} color="#4A90E2" />
            </View>
          </View>

          <Text style={styles.emptyStateTitle}>No Active Goals</Text>
          <Text style={styles.emptyStateDescription}>Set your first goal to start tracking your progress and achievements.</Text>

          <TouchableOpacity style={styles.setFirstGoalButton}>
            <Plus width={18} height={18} color="#fff" />
            <Text style={styles.setFirstGoalButtonText}>Set Your First Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Achievement History Section */}
        <View style={styles.achievementSection}>
          <View style={styles.achievementHeader}>
            <Trophy width={22} height={22} color="#FFB800" />
            <Text style={styles.achievementTitle}>Your Achievement History</Text>
          </View>

          {/* Empty achievement history area */}
          <View style={styles.achievementEmpty}>
            {/* This would be populated with achievement items when available */}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: 10,
    backgroundColor: "#f8f9fa",
  },
  headerLeft: {
    flex: 1,
  },
  headerLogo: {
    width: 60,
    height: 24,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  setClearGoalButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  setClearGoalButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  emptyStateCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  setFirstGoalButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  setFirstGoalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 4,
  },
  achievementSection: {
    marginBottom: 100,
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  achievementTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  achievementEmpty: {
    minHeight: 200,
    // This area would contain achievement items when available
  },
})

export default GoalsScreen
