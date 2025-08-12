"use client"

import { useState } from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const DisciplinesScreen = () => {
  const [activeTab, setActiveTab] = useState("challenge")

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require("../assets/logo-text.png")} style={styles.headerLogo} resizeMode="contain" />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "challenge" && styles.activeTab]}
            onPress={() => setActiveTab("challenge")}
          >
            <Ionicons name="trophy-outline" size={20} color={activeTab === "challenge" ? "#333" : "#999"} />
            <Text style={[styles.tabText, activeTab === "challenge" && styles.activeTabText]}>Challenge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "rules" && styles.activeTab]}
            onPress={() => setActiveTab("rules")}
          >
            <Ionicons name="radio-button-off-outline" size={20} color={activeTab === "rules" ? "#333" : "#999"} />
            <Text style={[styles.tabText, activeTab === "rules" && styles.activeTabText]}>Rules</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "challenge" ? (
          <>
            {/* Challenge Card */}
            <View style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <View style={styles.challengeIconContainer}>
                  <Ionicons name="trophy" size={24} color="#4A90E2" />
                </View>
                <View style={styles.challengeContent}>
                  <Text style={styles.challengeTitle}>40-100 Day Challenge</Text>
                  <Text style={styles.challengeSubtitle}>Transform through extended commitment</Text>
                </View>
                <TouchableOpacity style={styles.closeButton}>
                  <Ionicons name="close" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Start New Challenge Button */}
            <TouchableOpacity style={styles.startChallengeButton}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.startChallengeButtonText}>Start New Challenge</Text>
            </TouchableOpacity>

            {/* Empty State */}
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="trophy-outline" size={60} color="#ccc" />
              </View>

              <Text style={styles.emptyStateTitle}>No Active Challenges</Text>
              <Text style={styles.emptyStateDescription}>
                Start a 40, 70, or 100-day challenge to push{"\n"}your limits and build unbreakable discipline.
              </Text>
            </View>
          </>
        ) : (
          // Rules Tab Content (placeholder)
          <View style={styles.rulesContainer}>
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="document-text-outline" size={60} color="#ccc" />
              </View>

              <Text style={styles.emptyStateTitle}>No Rules Set</Text>
              <Text style={styles.emptyStateDescription}>
                Create personal rules to guide your{"\n"}daily habits and decisions.
              </Text>
            </View>
          </View>
        )}
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
  tabContainer: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 20,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 20,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#333",
  },
  tabText: {
    fontSize: 16,
    color: "#999",
    marginLeft: 6,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#333",
    fontWeight: "600",
  },
  challengeCard: {
    backgroundColor: "#E8F2FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  challengeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  challengeSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  closeButton: {
    padding: 4,
  },
  startChallengeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  startChallengeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateIcon: {
    marginBottom: 24,
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
  },
  rulesContainer: {
    flex: 1,
  },
})

export default DisciplinesScreen
