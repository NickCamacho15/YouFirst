"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  TextInput,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import TopHeader from "../components/TopHeader"
import { Brain } from "lucide-react-native"

interface ScreenProps { onLogout?: () => void }

const MindScreen: React.FC<ScreenProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState("reading")
  const [activeSubTab, setActiveSubTab] = useState("list")
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [bookTitle, setBookTitle] = useState("")

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSessionActive])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    iconColor,
  }: {
    title: string
    value: string
    subtitle: string
    icon: string
    iconColor: string
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  )

  const ReadingContent = () => (
    <>
      {/* Statistics Grid */}
      <View style={styles.statsGrid}>
        <StatCard title="Total Time" value="0h 0m" subtitle="All sessions" icon="time-outline" iconColor="#4A90E2" />
        <StatCard title="Sessions" value="0" subtitle="Completed" icon="book-outline" iconColor="#10B981" />
        <StatCard
          title="Average Time"
          value="0m"
          subtitle="Per session"
          icon="trending-up-outline"
          iconColor="#8B5CF6"
        />
        <StatCard
          title="Books Completed"
          value="0"
          subtitle="Finished"
          icon="checkmark-circle-outline"
          iconColor="#F59E0B"
        />
      </View>

      {/* Reading Session */}
      <View style={styles.sessionSection}>
        <Text style={styles.sessionTitle}>Reading Session</Text>

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
          <Text style={styles.timerSubtitle}>Current session</Text>
        </View>

        <TextInput
          style={styles.bookTitleInput}
          placeholder="Book title (optional)..."
          placeholderTextColor="#999"
          value={bookTitle}
          onChangeText={setBookTitle}
        />

        <TouchableOpacity
          style={[styles.sessionButton, isSessionActive ? styles.endSessionButton : styles.startSessionButton]}
          onPress={() => {
            if (isSessionActive) {
              setIsSessionActive(false)
            } else {
              setIsSessionActive(true)
              setSessionTime(0)
            }
          }}
        >
          <Ionicons name={isSessionActive ? "stop" : "play"} size={20} color="#fff" />
          <Text style={styles.sessionButtonText}>{isSessionActive ? "End Session" : "Start Reading"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reflectButton} disabled={!isSessionActive}>
          <Ionicons name="square-outline" size={20} color="#FF6B35" />
          <Text style={styles.reflectButtonText}>End & Reflect</Text>
        </TouchableOpacity>
      </View>

      {/* Sub Tab Navigation */}
      <View style={styles.subTabContainer}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === "list" && styles.activeSubTab]}
          onPress={() => setActiveSubTab("list")}
        >
          <Ionicons name="book-outline" size={20} color={activeSubTab === "list" ? "#333" : "#999"} />
          <Text style={[styles.subTabText, activeSubTab === "list" && styles.activeSubTabText]}>List</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubTab === "history" && styles.activeSubTab]}
          onPress={() => setActiveSubTab("history")}
        >
          <Ionicons name="time-outline" size={20} color={activeSubTab === "history" ? "#333" : "#999"} />
          <Text style={[styles.subTabText, activeSubTab === "history" && styles.activeSubTabText]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubTab === "insights" && styles.activeSubTab]}
          onPress={() => setActiveSubTab("insights")}
        >
          <Ionicons name="bulb-outline" size={20} color={activeSubTab === "insights" ? "#333" : "#999"} />
          <Text style={[styles.subTabText, activeSubTab === "insights" && styles.activeSubTabText]}>Insights</Text>
        </TouchableOpacity>
      </View>
      {/* Sub Tab Content */}
      {activeSubTab === "list" ? (
        <>
          {/* Reading Stats */}
          <View style={styles.readingStatsContainer}>
            <View style={styles.readingStatCard}>
              <Ionicons name="reader-outline" size={20} color="#4A90E2" />
              <Text style={styles.readingStatValue}>0</Text>
              <Text style={styles.readingStatLabel}>Reading</Text>
            </View>
            <View style={styles.readingStatCard}>
              <Ionicons name="trophy-outline" size={20} color="#10B981" />
              <Text style={styles.readingStatValue}>0</Text>
              <Text style={styles.readingStatLabel}>Completed</Text>
            </View>
          </View>

          {/* Add Book Button */}
          <TouchableOpacity style={styles.addBookButton}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBookButtonText}>Add Book to List</Text>
          </TouchableOpacity>

          {/* Empty State */}
          <View style={styles.emptyStateContainer}>
            <View style={styles.bookIconContainer}>
              <Ionicons name="book-outline" size={48} color="#10B981" />
            </View>
            <Text style={styles.emptyStateTitle}>No books in your list yet</Text>
            <Text style={styles.emptyStateDescription}>Add your first book to get started!</Text>
          </View>
        </>
      ) : activeSubTab === "history" ? (
        <>
          <Text style={styles.sectionTitleCaps}>Completed Books</Text>
          <View style={styles.cardContainer}>
            <Text style={styles.cardBodyText}>No completed books yet. Check off books from your list as you finish them!</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.insightsHeader}>
            <Text style={styles.sectionTitle}>Reading Insights</Text>
            <TouchableOpacity style={styles.addInsightButton}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addInsightButtonText}>Add Insight</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cardContainer}>
            <Text style={styles.cardBodyText}>No insights yet. Add your first insight from your reading!</Text>
          </View>
        </>
      )}
    </>
  )

  const MeditationContent = () => {
    const [preparationTime, setPreparationTime] = useState(30)
    const [intervalTime, setIntervalTime] = useState(5)
    const [meditationTime, setMeditationTime] = useState(15)

    const formatSliderTime = (seconds: number, isMinutes = false) => {
      if (isMinutes) {
        return `${seconds}m`
      }
      return `${seconds}s`
    }

    const milestones = [
      {
        title: "First Session",
        description: "Complete your first meditation",
        icon: "star-outline",
        achieved: false,
      },
      {
        title: "Week Warrior",
        description: "7 day streak",
        icon: "flame-outline",
        achieved: false,
      },
      {
        title: "Mindful Month",
        description: "30 day streak",
        icon: "trophy-outline",
        achieved: false,
      },
      {
        title: "Sacred 40",
        description: "40 day streak",
        icon: "ribbon-outline",
        achieved: false,
      },
      {
        title: "Quarter Master",
        description: "4 month streak",
        icon: "diamond-outline",
        achieved: false,
      },
      {
        title: "10 Hour Club",
        description: "10 hours total",
        icon: "medal-outline",
        achieved: false,
      },
      {
        title: "50 Sessions",
        description: "Complete 50 sessions",
        icon: "ribbon-outline",
        achieved: false,
      },
      {
        title: "100 Sessions",
        description: "Complete 100 sessions",
        icon: "flash-outline",
        achieved: false,
      },
    ]

    return (
      <>
        {/* Total Time Card */}
        <View style={styles.totalTimeCard}>
          <View style={styles.totalTimeHeader}>
            <Ionicons name="calendar-outline" size={24} color="#8B5CF6" />
            <View style={styles.totalTimeContent}>
              <Text style={styles.totalTimeValue}>0h</Text>
              <Text style={styles.totalTimeLabel}>Total Time</Text>
            </View>
          </View>
        </View>

        {/* Session Stats */}
        <View style={styles.sessionStatsContainer}>
          <View style={styles.sessionStatCard}>
            <Ionicons name="pulse-outline" size={24} color="#4A90E2" />
            <Text style={styles.sessionStatValue}>0</Text>
            <Text style={styles.sessionStatLabel}>Sessions</Text>
          </View>
          <View style={styles.sessionStatCard}>
            <Ionicons name="flame-outline" size={24} color="#FF6B35" />
            <Text style={styles.sessionStatValue}>0</Text>
            <Text style={styles.sessionStatLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Meditation Timer */}
        <View style={styles.meditationTimerCard}>
          <Text style={styles.meditationTimerTitle}>Meditation Timer</Text>

          {/* Preparation Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: "#4A90E2" }]}>Preparation</Text>
              <Text style={styles.sliderValue}>{formatSliderTime(preparationTime)}</Text>
            </View>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderProgress,
                  { width: `${(preparationTime / 60) * 100}%`, backgroundColor: "#4A90E2" },
                ]}
              />
              <View
                style={[styles.sliderThumb, { left: `${(preparationTime / 60) * 100}%`, backgroundColor: "#4A90E2" }]}
              />
            </View>
          </View>

          {/* Interval Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: "#10B981" }]}>Interval</Text>
              <Text style={styles.sliderValue}>{formatSliderTime(intervalTime, true)}</Text>
            </View>
            <View style={styles.sliderTrack}>
              <View
                style={[styles.sliderProgress, { width: `${(intervalTime / 30) * 100}%`, backgroundColor: "#10B981" }]}
              />
              <View
                style={[styles.sliderThumb, { left: `${(intervalTime / 30) * 100}%`, backgroundColor: "#10B981" }]}
              />
            </View>
          </View>

          {/* Meditation Time Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: "#FF6B35" }]}>Meditation Time</Text>
              <Text style={styles.sliderValue}>{formatSliderTime(meditationTime, true)}</Text>
            </View>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderProgress,
                  { width: `${(meditationTime / 60) * 100}%`, backgroundColor: "#FF6B35" },
                ]}
              />
              <View
                style={[styles.sliderThumb, { left: `${(meditationTime / 60) * 100}%`, backgroundColor: "#FF6B35" }]}
              />
            </View>
          </View>

          {/* Start Session Button */}
          <TouchableOpacity style={styles.startMeditationButton}>
            <Text style={styles.startMeditationButtonText}>Start Session</Text>
          </TouchableOpacity>
        </View>

        {/* Milestones */}
        <View style={styles.milestonesSection}>
          <View style={styles.milestonesHeader}>
            <Ionicons name="trophy-outline" size={24} color="#FFB800" />
            <Text style={styles.milestonesTitle}>Milestones</Text>
          </View>

          <View style={styles.milestonesGrid}>
            {milestones.map((milestone, index) => (
              <View key={index} style={styles.milestoneCard}>
                <Ionicons name={milestone.icon as any} size={32} color={milestone.achieved ? "#4A90E2" : "#ccc"} />
                <Text style={[styles.milestoneTitle, { color: milestone.achieved ? "#333" : "#ccc" }]}>
                  {milestone.title}
                </Text>
                <Text style={[styles.milestoneDescription, { color: milestone.achieved ? "#666" : "#ccc" }]}>
                  {milestone.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </>
    )
  }

  const DistractionContent = () => {
    const [selectedWeek, setSelectedWeek] = useState("Aug 10 - Aug 16")
    const [socialMediaApps, setSocialMediaApps] = useState([
      { name: "Instagram", icon: "logo-instagram", color: "#E4405F", hours: 0, minutes: 0 },
      { name: "TikTok", icon: "musical-notes", color: "#000", hours: 0, minutes: 0 },
      { name: "Snapchat", icon: "camera", color: "#FFFC00", hours: 0, minutes: 0 },
      { name: "X", icon: "logo-twitter", color: "#1DA1F2", hours: 0, minutes: 0 },
    ])

    const weekDays = [
      { day: "Sun", date: 10 },
      { day: "Mon", date: 11, selected: true },
      { day: "Tue", date: 12 },
      { day: "Wed", date: 13 },
      { day: "Thu", date: 14 },
      { day: "Fri", date: 15 },
      { day: "Sat", date: 16 },
    ]

    const monthDays = Array.from({ length: 31 }, (_, i) => i + 1)

    const removeApp = (index: number) => {
      setSocialMediaApps((apps) => apps.filter((_, i) => i !== index))
    }

    return (
      <>
        {/* Stats Cards */}
        <View style={styles.distractionStatsContainer}>
          <View style={styles.distractionStatCard}>
            <Ionicons name="time-outline" size={24} color="#4A90E2" />
            <View style={styles.distractionStatContent}>
              <Text style={styles.distractionStatLabel}>Total Time</Text>
              <Text style={styles.distractionStatValue}>0m</Text>
            </View>
          </View>
          <View style={styles.distractionStatCard}>
            <Ionicons name="trending-up-outline" size={24} color="#10B981" />
            <View style={styles.distractionStatContent}>
              <Text style={styles.distractionStatLabel}>Daily Average</Text>
              <Text style={styles.distractionStatValue}>0m</Text>
            </View>
          </View>
        </View>

        {/* Track Social Media Time */}
        <View style={styles.trackingSection}>
          <View style={styles.trackingHeader}>
            <View style={styles.trackingTitleContainer}>
              <Ionicons name="phone-portrait-outline" size={20} color="#4A90E2" />
              <Text style={styles.trackingTitle}>Track Your Social Media Time</Text>
            </View>
            <View style={styles.weekSelector}>
              <TouchableOpacity>
                <Ionicons name="chevron-back" size={20} color="#666" />
              </TouchableOpacity>
              <Text style={styles.weekText}>{selectedWeek}</Text>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Week Calendar */}
          <View style={styles.weekCalendar}>
            {weekDays.map((day, index) => (
              <View key={index} style={styles.weekDay}>
                <Text style={styles.weekDayName}>{day.day}</Text>
                <Text style={[styles.weekDayDate, day.selected && styles.selectedWeekDay]}>{day.date}</Text>
              </View>
            ))}
          </View>

          {/* Social Media Apps */}
          <View style={styles.socialMediaApps}>
            {socialMediaApps.map((app, index) => (
              <View
                key={index}
                style={[
                  styles.socialMediaApp,
                  { backgroundColor: app.color === "#000" ? "#f0f0f0" : `${app.color}20` },
                ]}
              >
                <View style={styles.appInfo}>
                  <View style={[styles.appIcon, { backgroundColor: app.color }]}>
                    <Ionicons name={app.icon as any} size={24} color="#fff" />
                  </View>
                  <Text style={styles.appName}>{app.name}</Text>
                </View>
                <View style={styles.timeInputs}>
                  <View style={styles.timeInputContainer}>
                    <Text style={styles.timeInputLabel}>Hr</Text>
                    <TextInput style={styles.timeInput} value={app.hours.toString()} />
                  </View>
                  <View style={styles.timeInputContainer}>
                    <Text style={styles.timeInputLabel}>Min</Text>
                    <TextInput style={styles.timeInput} value={app.minutes.toString()} />
                  </View>
                  <TouchableOpacity onPress={() => removeApp(index)} style={styles.removeButton}>
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Monthly Calendar */}
        <View style={styles.monthlySection}>
          <View style={styles.monthlySectionHeader}>
            <Ionicons name="calendar-outline" size={20} color="#EF4444" />
            <Text style={styles.monthlySectionTitle}>Social Media Time This Month</Text>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0" }]} />
              <Text style={styles.legendText}>No usage</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#D1FAE5" }]} />
              <Text style={styles.legendText}>{"<1hr"}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#FEF3C7" }]} />
              <Text style={styles.legendText}>1-2hrs</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#FED7AA" }]} />
              <Text style={styles.legendText}>2-3hrs</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#FECACA" }]} />
              <Text style={styles.legendText}>3hrs+</Text>
            </View>
          </View>

          {/* Monthly Calendar Grid */}
          <View style={styles.monthlyCalendar}>
            {monthDays.map((day) => (
              <View key={day} style={[styles.monthDay, day === 11 && styles.selectedMonthDay]}>
                <Text style={[styles.monthDayText, day === 11 && styles.selectedMonthDayText]}>{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* True Cost Section */}
        <View style={styles.trueCostSection}>
          <View style={styles.trueCostHeader}>
            <Ionicons name="warning-outline" size={20} color="#EF4444" />
            <Text style={styles.trueCostTitle}>The True Cost of Your Digital Distraction</Text>
          </View>

          {/* Work Time Lost */}
          <View style={styles.costCard}>
            <View style={styles.costCardHeader}>
              <Ionicons name="briefcase-outline" size={20} color="#EF4444" />
              <Text style={styles.costCardTitle}>Work Time Lost</Text>
            </View>
            <Text style={styles.costCardValue}>Less than a work day</Text>
          </View>

          {/* Income Opportunity Lost */}
          <View style={styles.costCard}>
            <View style={styles.costCardHeader}>
              <Ionicons name="cash-outline" size={20} color="#EF4444" />
              <Text style={styles.costCardTitle}>Income Opportunity Lost</Text>
            </View>
            <View style={styles.incomeGrid}>
              <View style={styles.incomeItem}>
                <Text style={styles.incomeRate}>$20/hour</Text>
                <Text style={styles.incomeLost}>$0</Text>
              </View>
              <View style={styles.incomeItem}>
                <Text style={styles.incomeRate}>$50/hour</Text>
                <Text style={styles.incomeLost}>$0</Text>
              </View>
              <View style={styles.incomeItem}>
                <Text style={styles.incomeRate}>$100/hour</Text>
                <Text style={styles.incomeLost}>$0</Text>
              </View>
            </View>
          </View>

          {/* Quality Time Lost */}
          <View style={styles.costCard}>
            <View style={styles.costCardHeader}>
              <Ionicons name="people-outline" size={20} color="#EF4444" />
              <Text style={styles.costCardTitle}>Quality Time Lost</Text>
            </View>
            <Text style={styles.qualityTimeDescription}>Instead of scrolling, you could have had:</Text>
            <View style={styles.qualityTimeList}>
              <Text style={styles.qualityTimeItem}>• 0 meaningful conversations</Text>
              <Text style={styles.qualityTimeItem}>• 0 family dinners</Text>
              <Text style={styles.qualityTimeItem}>• 0 workout sessions</Text>
              <Text style={styles.qualityTimeItem}>• 0 full nights of sleep</Text>
            </View>
          </View>

          {/* Total Time */}
          <View style={styles.totalTimeFooter}>
            <Text style={styles.totalTimeText}>
              Total time on social media: <Text style={styles.totalTimeValue}>0m</Text>
            </Text>
          </View>
        </View>
      </>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <TopHeader onLogout={onLogout} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Mind Training Section */}
        <View style={styles.mindTrainingSection}>
          <View style={styles.mindTrainingHeader}>
            <Brain stroke="#4A90E2" width={24} height={24} />
            <Text style={styles.mindTrainingTitle}>Mind Training</Text>
          </View>
          <Text style={styles.mindTrainingSubtitle}>
            Optimize your mental well-being through reading,{"\n"}meditation, and mindful technology use
          </Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "reading" && styles.activeTab]}
            onPress={() => setActiveTab("reading")}
          >
            <Ionicons name="book-outline" size={20} color={activeTab === "reading" ? "#333" : "#999"} />
            <Text style={[styles.tabText, activeTab === "reading" && styles.activeTabText]}>Reading</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "meditation" && styles.activeTab]}
            onPress={() => setActiveTab("meditation")}
          >
            <Brain stroke={activeTab === "meditation" ? "#333" : "#999"} width={20} height={20} />
            <Text style={[styles.tabText, activeTab === "meditation" && styles.activeTabText]}>Meditation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "distraction" && styles.activeTab]}
            onPress={() => setActiveTab("distraction")}
          >
            <Ionicons name="phone-portrait-outline" size={20} color={activeTab === "distraction" ? "#333" : "#999"} />
            <Text style={[styles.tabText, activeTab === "distraction" && styles.activeTabText]}>Distraction</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === "reading" ? (
          <ReadingContent />
        ) : activeTab === "meditation" ? (
          <MeditationContent />
        ) : (
          <DistractionContent />
        )}

        {/* Add some bottom padding for navigation */}
        <View style={{ height: 100 }} />
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
  mindTrainingSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  mindTrainingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  mindTrainingTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  mindTrainingSubtitle: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 30,
    paddingRight: 0,
    justifyContent: "space-evenly",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "48%",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  sessionSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 24,
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#333",
    fontFamily: "monospace",
  },
  timerSubtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
  bookTitleInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    marginBottom: 24,
    backgroundColor: "#f8f9fa",
  },
  startSessionButton: {
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
  },
  endSessionButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
  },
  sessionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
  },
  sessionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  reflectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  reflectButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  subTabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeSubTab: {
    backgroundColor: "#f8f9fa",
  },
  subTabText: {
    fontSize: 14,
    color: "#999",
    marginLeft: 6,
    fontWeight: "500",
  },
  activeSubTabText: {
    color: "#333",
    fontWeight: "600",
  },
  readingStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  readingStatCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    width: "48%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  readingStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginVertical: 4,
  },
  readingStatLabel: {
    fontSize: 12,
    color: "#666",
  },
  addBookButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  addBookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 40,
    marginBottom: 40,
  },
  bookIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E6F7F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#666",
  },
  sectionTitleCaps: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  addInsightButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addInsightButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBodyText: {
    fontSize: 16,
    color: "#666",
  },
  comingSoonContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  comingSoonText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
  },
  totalTimeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  totalTimeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  totalTimeContent: {
    marginLeft: 16,
  },
  totalTimeValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  totalTimeLabel: {
    fontSize: 16,
    color: "#666",
  },
  sessionStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  sessionStatCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "48%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginVertical: 8,
  },
  sessionStatLabel: {
    fontSize: 14,
    color: "#666",
  },
  meditationTimerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  meditationTimerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 24,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  sliderValue: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  sliderTrack: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    position: "relative",
  },
  sliderProgress: {
    height: 6,
    borderRadius: 3,
    position: "absolute",
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    top: -7,
    marginLeft: -10,
  },
  startMeditationButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  startMeditationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  milestonesSection: {
    marginBottom: 40,
  },
  milestonesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  milestonesTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  milestonesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  milestoneCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "48%",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  milestoneDescription: {
    fontSize: 12,
    textAlign: "center",
  },
  distractionStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  distractionStatCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  distractionStatContent: {
    marginLeft: 12,
  },
  distractionStatLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  distractionStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  trackingSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  trackingHeader: {
    marginBottom: 20,
  },
  trackingTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  weekSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  weekText: {
    fontSize: 16,
    color: "#333",
    marginHorizontal: 16,
  },
  weekCalendar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  weekDay: {
    alignItems: "center",
  },
  weekDayName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  weekDayDate: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  selectedWeekDay: {
    color: "#4A90E2",
    fontWeight: "700",
  },
  socialMediaApps: {
    gap: 12,
  },
  socialMediaApp: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
  },
  appInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  timeInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeInputContainer: {
    alignItems: "center",
  },
  timeInputLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  timeInput: {
    width: 40,
    height: 32,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    textAlign: "center",
    fontSize: 14,
    color: "#333",
  },
  removeButton: {
    padding: 4,
  },
  monthlySection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  monthlySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  monthlySectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  monthlyCalendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  monthDay: {
    width: "13.5%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderRadius: 6,
  },
  selectedMonthDay: {
    backgroundColor: "#4A90E2",
  },
  monthDayText: {
    fontSize: 14,
    color: "#333",
  },
  selectedMonthDayText: {
    color: "#fff",
    fontWeight: "600",
  },
  trueCostSection: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  trueCostHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  trueCostTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#EF4444",
    marginLeft: 8,
  },
  costCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  costCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  costCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  costCardValue: {
    fontSize: 16,
    color: "#666",
  },
  incomeGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  incomeItem: {
    alignItems: "center",
  },
  incomeRate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  incomeLost: {
    fontSize: 18,
    fontWeight: "700",
    color: "#EF4444",
  },
  qualityTimeDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  qualityTimeList: {
    gap: 4,
  },
  qualityTimeItem: {
    fontSize: 14,
    color: "#666",
  },
  totalTimeFooter: {
    alignItems: "center",
    marginTop: 8,
  },
  totalTimeText: {
    fontSize: 16,
    color: "#666",
  },
  totalTimeValue: {
    fontWeight: "700",
    color: "#EF4444",
  },
})

export default MindScreen
