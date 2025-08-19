"use client"

import { useMemo, useState } from "react"
import type React from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Image, Dimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Shield, CalendarDays, Plus } from "lucide-react-native"
import TopHeader from "../components/TopHeader"

interface ScreenProps { onLogout?: () => void }

const DisciplinesScreen: React.FC<ScreenProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState("challenge")

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header */}
      <TopHeader onLogout={onLogout} />

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
            <Shield width={20} height={20} color={activeTab === "rules" ? "#333" : "#999"} />
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
          <RulesTab />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const RulesTab = () => {
  const today = new Date()
  const last30Days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (29 - i))
      return d
    })
  }, [today])

  const screenWidth = Dimensions.get("window").width
  const horizontalGutters = 40 /* screen padding */ + 32 /* card padding */ + 6 * 8 /* gaps between 7 cols */
  const cellSize = Math.max(36, Math.floor((screenWidth - horizontalGutters) / 7))

  return (
    <>
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <CalendarDays color="#4A90E2" width={20} height={20} />
            <Text style={styles.cardTitle}>Rules Adherence</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={styles.metricGroup}>
              <Text style={styles.metricPrimary}>0%</Text>
              <Text style={styles.metricLabel}>TODAY</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricGroup}>
              <Text style={styles.metricPrimary}>0</Text>
              <Text style={styles.metricLabel}>AVG STREAK</Text>
            </View>
          </View>
        </View>

        {/* Legend Row */}
        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>LAST 30 DAYS</Text>
          <View style={styles.legendScale}>
            <Text style={styles.legendPercent}>0%</Text>
            <View style={styles.legendDots}>
              {[
                "#e57373",
                "#ffb74d",
                "#fff176",
                "#aed581",
                "#81c784",
              ].map((c, idx) => (
                <View key={idx} style={[styles.legendDot, { backgroundColor: c }]} />
              ))}
            </View>
            <Text style={styles.legendPercent}>100%</Text>
          </View>
        </View>

        {/* 30-Day Grid */}
        <View style={styles.gridContainer}>
          {last30Days.map((date, idx) => {
            const isToday = date.toDateString() === today.toDateString()
            return (
              <View
                key={idx}
                style={[
                  styles.gridCell,
                  { width: cellSize, height: cellSize },
                  isToday && styles.gridCellToday,
                ]}
              >
                <Text style={styles.gridCellText}>{date.getDate()}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* Add Rule Button */}
      <TouchableOpacity style={styles.primaryButton}>
        <Plus color="#fff" width={18} height={18} />
        <Text style={styles.primaryButtonText}>Add New Rule</Text>
      </TouchableOpacity>

      {/* Empty State Card */}
      <View style={styles.emptyCard}>
        <Shield color="#A0AEC0" width={56} height={56} />
        <Text style={styles.emptyTitle}>No Rules Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first rule to start building personal discipline.
        </Text>
      </View>
    </>
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
  // Rules tab styles
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 8,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricGroup: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
  metricPrimary: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563eb",
  },
  metricLabel: {
    fontSize: 10,
    color: "#6b7280",
    letterSpacing: 0.5,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  legendLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
  },
  legendScale: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDots: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 2,
  },
  legendPercent: {
    color: "#9ca3af",
    fontSize: 10,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridCell: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCellToday: {
    borderWidth: 2,
    borderColor: "#4A90E2",
  },
  gridCellText: {
    color: "#374151",
    fontWeight: "600",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A90E2",
    height: 48,
    borderRadius: 12,
    marginBottom: 20,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 10,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
})

export default DisciplinesScreen
