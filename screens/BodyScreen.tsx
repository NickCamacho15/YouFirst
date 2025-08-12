"use client"

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
  Dimensions,
  TextInput,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LineChart } from "react-native-chart-kit"

const BodyScreen = () => {
  const [activeTab, setActiveTab] = useState("profile")

  const screenWidth = Dimensions.get("window").width

  // Sample data for the chart
  const chartData = {
    labels: ["", "", "", "", "", "", ""],
    datasets: [
      {
        data: [1, 1, 1, 1, 1, 1, 1],
        color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  }

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#4A90E2",
    },
  }

  const PersonalRecordCard = ({ exercise, weight }: { exercise: string; weight: string }) => (
    <View style={styles.recordCard}>
      <Text style={styles.recordExercise}>{exercise}</Text>
      <Text style={styles.recordWeight}>{weight}</Text>
      <View style={styles.recordPercentage}>
        <Ionicons name="calculator-outline" size={16} color="#666" />
        <Text style={styles.recordPercentageText}>%</Text>
      </View>
    </View>
  )

  const StatRow = ({
    label,
    value,
    valueColor = "#333",
  }: {
    label: string
    value: string
    valueColor?: string
  }) => (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
    </View>
  )

  const [selectedDay, setSelectedDay] = useState(11)
  const [workoutTime, setWorkoutTime] = useState(0)
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [completedBlocks, setCompletedBlocks] = useState<boolean[]>([false, false, false])

  // Timer effect for workout
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isWorkoutActive) {
      interval = setInterval(() => {
        setWorkoutTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isWorkoutActive])

  const formatWorkoutTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const weekDays = [
    { day: "Sun", date: 10, label: "Rest" },
    { day: "Mon", date: 11, label: "" },
    { day: "Tue", date: 12, label: "" },
    { day: "Wed", date: 13, label: "" },
    { day: "Thu", date: 14, label: "" },
    { day: "Fri", date: 15, label: "" },
    { day: "Sat", date: 16, label: "" },
  ]

  const workoutBlocks = [
    { id: "A", name: "Bench Press", exercises: 1 },
    { id: "B", name: "Incline DB Press", exercises: 2 },
    { id: "C", name: "Plank Variations", exercises: 2 },
  ]

  const toggleBlockCompletion = (index: number) => {
    const newCompletedBlocks = [...completedBlocks]
    newCompletedBlocks[index] = !newCompletedBlocks[index]
    setCompletedBlocks(newCompletedBlocks)
  }

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
        {/* Body Section */}
        <View style={styles.bodySection}>
          <View style={styles.bodySectionHeader}>
            <Ionicons name="fitness-outline" size={24} color="#4A90E2" />
            <Text style={styles.bodySectionTitle}>Body</Text>
          </View>
          <Text style={styles.bodySectionSubtitle}>Elite Training Program</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "profile" && styles.activeTab]}
            onPress={() => setActiveTab("profile")}
          >
            <Ionicons name="person-outline" size={20} color={activeTab === "profile" ? "#333" : "#999"} />
            <Text style={[styles.tabText, activeTab === "profile" && styles.activeTabText]}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "workout" && styles.activeTab]}
            onPress={() => setActiveTab("workout")}
          >
            <Ionicons name="barbell-outline" size={20} color={activeTab === "workout" ? "#333" : "#999"} />
            <Text style={[styles.tabText, activeTab === "workout" && styles.activeTabText]}>Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "plan" && styles.activeTab]}
            onPress={() => setActiveTab("plan")}
          >
            <Ionicons name="calendar-outline" size={20} color={activeTab === "plan" ? "#333" : "#999"} />
            <Text style={[styles.tabText, activeTab === "plan" && styles.activeTabText]}>Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === "profile" ? (
          <>
            {/* Personal Records */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="trophy-outline" size={20} color="#4A90E2" />
                  <Text style={styles.sectionTitle}>Personal Records (1RM)</Text>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="pencil-outline" size={16} color="#666" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recordsGrid}>
                <PersonalRecordCard exercise="Bench Press" weight="0 lbs" />
                <PersonalRecordCard exercise="Squat" weight="0 lbs" />
                <PersonalRecordCard exercise="Deadlift" weight="0 lbs" />
                <PersonalRecordCard exercise="Overhead Press" weight="0 lbs" />
              </View>
            </View>

            {/* Training Stats */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="stats-chart-outline" size={20} color="#4A90E2" />
                  <Text style={styles.sectionTitle}>Training Stats</Text>
                </View>
              </View>

              <View style={styles.statsContainer}>
                <StatRow label="Total Workouts" value="0" />
                <StatRow label="Avg. Workout Duration" value="0 mins" />
                <StatRow label="Current Streak" value="0 days" valueColor="#10B981" />
                <StatRow label="Total Volume This Week" value="0 lbs" />
              </View>
            </View>

            {/* Body Metrics */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="body-outline" size={20} color="#4A90E2" />
                  <Text style={styles.sectionTitle}>Body Metrics</Text>
                </View>
              </View>

              <View style={styles.metricsContainer}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Weight</Text>
                  <Text style={styles.metricValue}>0 lbs</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Body Fat</Text>
                  <Text style={styles.metricValue}>0%</Text>
                </View>
              </View>
            </View>

            {/* Weekly Volume Summary */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="bar-chart-outline" size={20} color="#4A90E2" />
                  <Text style={styles.sectionTitle}>Weekly Volume Summary</Text>
                </View>
                <View style={styles.timePeriodSelector}>
                  <TouchableOpacity style={styles.timePeriodButton}>
                    <Text style={styles.timePeriodButtonText}>1 Month</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.timePeriodButton, styles.activePeriodButton]}>
                    <Text style={[styles.timePeriodButtonText, styles.activePeriodButtonText]}>6 Months</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.timePeriodButton}>
                    <Text style={styles.timePeriodButtonText}>1 Year</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.chartContainer}>
                <LineChart
                  data={chartData}
                  width={screenWidth - 80}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withHorizontalLabels={true}
                  withVerticalLabels={false}
                  withDots={true}
                  withShadow={false}
                  withInnerLines={false}
                  withOuterLines={false}
                />
              </View>
            </View>

            {/* Exercise Progress */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="trending-up-outline" size={20} color="#4A90E2" />
                  <Text style={styles.sectionTitle}>Exercise Progress</Text>
                </View>
              </View>

              <View style={styles.exerciseLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#4A90E2" }]} />
                  <Text style={styles.legendText}>Bench Press</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
                  <Text style={styles.legendText}>Squat</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                  <Text style={styles.legendText}>Clean</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
                  <Text style={styles.legendText}>Overhead Press</Text>
                </View>
              </View>

              <View style={styles.chartContainer}>
                <LineChart
                  data={chartData}
                  width={screenWidth - 80}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withHorizontalLabels={true}
                  withVerticalLabels={false}
                  withDots={true}
                  withShadow={false}
                  withInnerLines={false}
                  withOuterLines={false}
                />
              </View>
            </View>

            {/* Individual Exercise Progress Charts */}
            {["Bench Press", "Squat", "Clean", "Overhead Press"].map((exercise, index) => {
              const colors = ["#4A90E2", "#10B981", "#F59E0B", "#EF4444"]
              return (
                <View key={exercise} style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                      <Ionicons name="trending-up-outline" size={20} color={colors[index]} />
                      <Text style={styles.sectionTitle}>{exercise} Progress</Text>
                    </View>
                  </View>

                  <View style={styles.chartContainer}>
                    <LineChart
                      data={{
                        labels: ["Mar 3", "Mar 24", "Apr 14", "May 5", "May 26", "Jun 23", "Jul 14", "Aug 11"],
                        datasets: [
                          {
                            data: [1, 1, 1, 1, 1, 1, 1, 1],
                            color: (opacity = 1) =>
                              `rgba(${
                                colors[index] === "#4A90E2"
                                  ? "74, 144, 226"
                                  : colors[index] === "#10B981"
                                    ? "16, 185, 129"
                                    : colors[index] === "#F59E0B"
                                      ? "245, 158, 11"
                                      : "239, 68, 68"
                              }, ${opacity})`,
                            strokeWidth: 2,
                          },
                        ],
                      }}
                      width={screenWidth - 80}
                      height={180}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) =>
                          `rgba(${
                            colors[index] === "#4A90E2"
                              ? "74, 144, 226"
                              : colors[index] === "#10B981"
                                ? "16, 185, 129"
                                : colors[index] === "#F59E0B"
                                  ? "245, 158, 11"
                                  : "239, 68, 68"
                          }, ${opacity})`,
                      }}
                      bezier
                      style={styles.chart}
                      withHorizontalLabels={true}
                      withVerticalLabels={true}
                      withDots={true}
                      withShadow={false}
                      withInnerLines={false}
                      withOuterLines={false}
                    />
                  </View>

                  <Text style={styles.chartSubtitle}>Tracking sets × reps progression</Text>
                </View>
              )
            })}
          </>
        ) : activeTab === "workout" ? (
          <>
            {/* Weekly Calendar */}
            <View style={styles.sectionCard}>
              <View style={styles.weekCalendarContainer}>
                <TouchableOpacity style={styles.calendarArrow}>
                  <Ionicons name="chevron-back" size={24} color="#666" />
                </TouchableOpacity>

                <View style={styles.weekDaysContainer}>
                  {weekDays.map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.weekDayButton, selectedDay === day.date && styles.selectedWeekDayButton]}
                      onPress={() => setSelectedDay(day.date)}
                    >
                      <Text style={[styles.weekDayName, selectedDay === day.date && styles.selectedWeekDayName]}>
                        {day.day}
                      </Text>
                      <Text style={[styles.weekDayDate, selectedDay === day.date && styles.selectedWeekDayDate]}>
                        {day.date}
                      </Text>
                      {day.label && <Text style={styles.weekDayLabel}>{day.label}</Text>}
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.calendarArrow}>
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Workout Timer */}
            <View style={styles.sectionCard}>
              <Text style={styles.workoutTimerTitle}>Workout Timer</Text>
              <Text style={styles.workoutTimerDisplay}>{formatWorkoutTime(workoutTime)}</Text>
              <Text style={styles.workoutType}>Upper Power</Text>

              <TouchableOpacity
                style={styles.startWorkoutButton}
                onPress={() => {
                  if (isWorkoutActive) {
                    setIsWorkoutActive(false)
                  } else {
                    setIsWorkoutActive(true)
                    setWorkoutTime(0)
                  }
                }}
              >
                <Ionicons name={isWorkoutActive ? "pause" : "play"} size={20} color="#fff" />
                <Text style={styles.startWorkoutButtonText}>{isWorkoutActive ? "Pause Workout" : "Start Workout"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.endSessionButton}>
                <Ionicons name="square-outline" size={20} color="#EF4444" />
                <Text style={styles.endSessionButtonText}>End Session</Text>
              </TouchableOpacity>
            </View>

            {/* Workout Blocks */}
            {workoutBlocks.map((block, index) => (
              <View key={block.id} style={styles.sectionCard}>
                <View style={styles.workoutBlockHeader}>
                  <TouchableOpacity style={styles.blockCheckbox} onPress={() => toggleBlockCompletion(index)}>
                    <View style={[styles.checkbox, completedBlocks[index] && styles.checkedCheckbox]}>
                      {completedBlocks[index] && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.blockLabel}>
                    <Text style={styles.blockId}>Block {block.id}</Text>
                  </View>

                  <View style={styles.blockInfo}>
                    <Text style={styles.blockName}>{block.name}</Text>
                    <Text style={styles.blockExercises}>
                      {block.exercises} exercise{block.exercises > 1 ? "s" : ""}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.blockDropdown}>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        ) : (
          // Plan tab content
          <>
            {/* Training Plan Builder */}
            <View style={styles.sectionCard}>
              <View style={styles.planBuilderHeader}>
                <View style={styles.planBuilderInfo}>
                  <View style={styles.planBuilderTitleContainer}>
                    <Ionicons name="radio-button-off-outline" size={24} color="#4A90E2" />
                    <Text style={styles.planBuilderTitle}>Training Plan Builder</Text>
                  </View>
                  <Text style={styles.planBuilderDescription}>Create custom workout programs from scratch</Text>
                </View>
                <TouchableOpacity style={styles.buildPlanButton}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.buildPlanButtonText}>Build Plan</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* My Plans */}
            <View style={styles.sectionCard}>
              <Text style={styles.myPlansTitle}>My Plans</Text>

              <View style={styles.emptyPlansContainer}>
                <View style={styles.emptyPlansIcon}>
                  <Ionicons name="radio-button-off-outline" size={60} color="#ccc" />
                </View>
                <Text style={styles.emptyPlansTitle}>No plans created yet</Text>
                <Text style={styles.emptyPlansDescription}>
                  Click "Build Plan" to create your first workout program
                </Text>
              </View>
            </View>

            {/* 1RM Percentage Calculator */}
            <View style={styles.sectionCard}>
              <View style={styles.calculatorHeader}>
                <Ionicons name="calculator-outline" size={20} color="#4A90E2" />
                <Text style={styles.calculatorTitle}>1RM Percentage Calculator</Text>
              </View>

              <View style={styles.calculatorInputContainer}>
                <TextInput style={styles.calculatorInput} placeholder="Max Weight" placeholderTextColor="#999" />
              </View>
            </View>
          </>
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
  bodySection: {
    marginTop: 20,
    marginBottom: 20,
  },
  bodySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  bodySectionTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  bodySectionSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#f8f9fa",
  },
  tabText: {
    fontSize: 14,
    color: "#999",
    marginLeft: 6,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#333",
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  recordsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  recordCard: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  recordExercise: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  recordWeight: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4A90E2",
    marginBottom: 8,
  },
  recordPercentage: {
    flexDirection: "row",
    alignItems: "center",
  },
  recordPercentageText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  statsContainer: {
    gap: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 16,
    color: "#666",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  metricItem: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
  },
  chartContainer: {
    alignItems: "center",
  },
  chart: {
    borderRadius: 16,
  },
  timePeriodSelector: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 2,
  },
  timePeriodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activePeriodButton: {
    backgroundColor: "#333",
  },
  timePeriodButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activePeriodButtonText: {
    color: "#fff",
  },
  exerciseLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  chartSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  weekCalendarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarArrow: {
    padding: 8,
  },
  weekDaysContainer: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  weekDayButton: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    minWidth: 40,
  },
  selectedWeekDayButton: {
    backgroundColor: "#4A90E2",
  },
  weekDayName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  selectedWeekDayName: {
    color: "#fff",
  },
  weekDayDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  selectedWeekDayDate: {
    color: "#fff",
  },
  weekDayLabel: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  workoutTimerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  workoutTimerDisplay: {
    fontSize: 48,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  workoutType: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  startWorkoutButton: {
    backgroundColor: "#4A90E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  startWorkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  endSessionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  endSessionButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  workoutBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  blockCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  checkedCheckbox: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  blockLabel: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 16,
  },
  blockId: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  blockInfo: {
    flex: 1,
  },
  blockName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  blockExercises: {
    fontSize: 14,
    color: "#666",
  },
  blockDropdown: {
    padding: 8,
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
  planBuilderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planBuilderInfo: {
    flex: 1,
  },
  planBuilderTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  planBuilderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  planBuilderDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  buildPlanButton: {
    backgroundColor: "#333",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buildPlanButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  myPlansTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 32,
  },
  emptyPlansContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyPlansIcon: {
    marginBottom: 24,
  },
  emptyPlansTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
  },
  emptyPlansDescription: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  calculatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  calculatorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  calculatorInputContainer: {
    marginBottom: 16,
  },
  calculatorInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f8f9fa",
  },
})

export default BodyScreen
