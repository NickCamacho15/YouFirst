import React, { useState, useMemo, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

const routinesByDay: Record<string, { morning: string[]; evening: string[]; tasks: { title: string; time?: string }[] }> = {
  Monday: {
    morning: ["Morning Prayer & Meditation", "Exercise & Movement", "Healthy Breakfast", "Review Daily Priorities"],
    evening: ["Daily Reflection Journal", "Reading (30 min)", "Prepare Tomorrow", "Gratitude Practice"],
    tasks: [
      { title: "Team meeting preparation" },
      { title: "Work on strategic project", time: "10:00 AM" },
      { title: "Gym - Upper body workout", time: "6:00 PM" },
      { title: "Call Mom", time: "7:30 PM" },
    ],
  },
  Tuesday: {
    morning: ["Gratitude List", "Mobility & Stretching", "Protein-rich Breakfast", "Plan Day"],
    evening: ["Journal", "Read 20 min", "Prep Lunch", "Mindfulness"],
    tasks: [
      { title: "Sprint planning" },
      { title: "Code review", time: "2:00 PM" },
      { title: "Run 3 miles", time: "6:30 PM" },
      { title: "Family call", time: "8:00 PM" },
    ],
  },
  Wednesday: {
    morning: ["Breathwork", "Yoga session", "Smoothie Breakfast", "Top 3 Priorities"],
    evening: ["Journal", "Read 30 min", "Prep Tomorrow", "Stretching"],
    tasks: [
      { title: "Design sync" },
      { title: "Deep work block", time: "9:00 AM" },
      { title: "Push workout", time: "6:00 PM" },
      { title: "Errands" },
    ],
  },
  Thursday: {
    morning: ["Prayer & Reflection", "Walk Outside", "Egg Breakfast", "Review Calendar"],
    evening: ["Journal", "Audiobook 20 min", "Tidy Workspace", "Gratitude"],
    tasks: [
      { title: "One-on-ones" },
      { title: "Project planning", time: "11:00 AM" },
      { title: "Leg workout", time: "6:00 PM" },
      { title: "Read finance news" },
    ],
  },
  Friday: {
    morning: ["Meditation", "Run/Walk", "Light Breakfast", "End-of-week Review"],
    evening: ["Journal", "Read 15 min", "Plan Weekend", "Reflect"],
    tasks: [
      { title: "Demo prep" },
      { title: "Team demo", time: "3:00 PM" },
      { title: "Pull workout", time: "6:00 PM" },
      { title: "Call friend", time: "8:00 PM" },
    ],
  },
  Saturday: {
    morning: ["Slow Morning", "Outdoor Time", "Brunch", "Plan Day"],
    evening: ["Light Reading", "Plan Sunday", "Prep Clothes", "Gratitude"],
    tasks: [
      { title: "House chores" },
      { title: "Groceries" },
      { title: "Yoga", time: "10:00 AM" },
      { title: "Family time" },
    ],
  },
  Sunday: {
    morning: ["Prayer", "Stretch", "Healthy Breakfast", "Plan Week"],
    evening: ["Weekly Review", "Prep Monday", "Stretching", "Mindfulness"],
    tasks: [
      { title: "Meal prep" },
      { title: "Laundry" },
      { title: "Call parents", time: "5:00 PM" },
      { title: "Read book", time: "8:00 PM" },
    ],
  },
}

const DailyRoutines = () => {
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const currentDay = daysOfWeek[currentDayIndex]
  const currentData = useMemo(() => routinesByDay[currentDay], [currentDay])

  const [eveningChecks, setEveningChecks] = useState<boolean[]>([])
  const [morningChecks, setMorningChecks] = useState<boolean[]>([])
  const [tasksChecks, setTasksChecks] = useState<boolean[]>([])

  useEffect(() => {
    setMorningChecks(Array(currentData.morning.length).fill(false))
    setEveningChecks(Array(currentData.evening.length).fill(false))
    setTasksChecks(Array(currentData.tasks.length).fill(false))
  }, [currentData])

  const prevDay = () => setCurrentDayIndex((i) => (i - 1 + daysOfWeek.length) % daysOfWeek.length)
  const nextDay = () => setCurrentDayIndex((i) => (i + 1) % daysOfWeek.length)

  const toggleCheck = (index: number) => {
    setEveningChecks((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }
  const toggleMorning = (index: number) => {
    setMorningChecks((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }
  const toggleTask = (index: number) => {
    setTasksChecks((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }
  return (
    <View style={styles.container}>
      {/* Day header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navArrow} onPress={prevDay}>
          <Ionicons name="chevron-back" size={20} color="#4A90E2" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.dayTitle}>{currentDay}</Text>
          <Text style={styles.subtitle}>Daily Routines</Text>
        </View>
        <TouchableOpacity style={styles.navArrow} onPress={nextDay}>
          <Ionicons name="chevron-forward" size={20} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Morning Priming */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Morning Priming</Text>
          <TouchableOpacity>
            <Ionicons name="add" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        {currentData.morning.map((label, idx) => (
          <LinearGradient
            key={label + idx}
            colors={["#E6F0FF", "#F7FAFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCardMorning}
          >
            <View style={styles.habitTopRow}>
              <TouchableOpacity style={styles.checkboxTouchable} onPress={() => toggleMorning(idx)}>
                <View style={[styles.checkboxBoxBlue, morningChecks[idx] && styles.checkboxBoxBlueChecked]}>
                  {morningChecks[idx] && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              <Text style={styles.habitLabel}>{label}</Text>
              <View style={[styles.streakBadge, { backgroundColor: "#E6F7F1" }]}>
                <Text style={[styles.streakText, { color: "#10B981" }]}>0 day streak</Text>
              </View>
            </View>
            <Text style={styles.progressLabel}>Weekly Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrackBlue}>
                <View style={[styles.progressFillBlue, { width: "0%" }]} />
              </View>
              <Text style={styles.progressPercentageBlue}>0%</Text>
            </View>
          </LinearGradient>
        ))}
      </View>

      {/* Today's Tasks */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          <TouchableOpacity>
            <Ionicons name="add" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>
        <View style={styles.subHeaderRow}>
          <Text style={styles.subHeaderLeft}>{currentDay}'s priorities</Text>
          <Text style={styles.subHeaderRight}>0 total tasks completed</Text>
        </View>

        {currentData.tasks.map((task, idx) => (
          <LinearGradient
            key={task.title + idx}
            colors={["#EAFBF1", "#F9FFFB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientTaskCard}
          >
            <View style={styles.taskTopRow}>
              <TouchableOpacity style={styles.checkboxTouchable} onPress={() => toggleTask(idx)}>
                <View style={[styles.checkboxBoxGreen, tasksChecks[idx] && styles.checkboxBoxGreenChecked]}>
                  {tasksChecks[idx] && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskTime}>{task.time ?? ""}</Text>
              </View>
            </View>
          </LinearGradient>
        ))}
      </View>

      {/* Evening Reflection */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Evening Reflection</Text>
          <TouchableOpacity>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        </View>

        {currentData.evening.map((label, idx) => (
          <LinearGradient
            key={label + idx}
            colors={["#F3EEFF", "#FBF8FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCardEvening}
          >
            <View style={styles.habitTopRow}>
              <TouchableOpacity style={styles.checkboxTouchable} onPress={() => toggleCheck(idx)}>
                <View style={[styles.checkboxBox, eveningChecks[idx] && styles.checkboxBoxChecked]}> 
                  {eveningChecks[idx] && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              <Text style={styles.habitLabel}>{label}</Text>
              <View style={[styles.streakBadge, { backgroundColor: "#EAF7EE" }]}>
                <Text style={[styles.streakText, { color: "#16A34A" }]}>0 day streak</Text>
              </View>
            </View>
            <Text style={styles.progressLabel}>Weekly Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrackAlt}>
                <View style={[styles.progressFillAlt, { width: "100%", transform: [{ scaleX: 0 }] }]} />
              </View>
              <Text style={styles.progressPercentage}>0%</Text>
            </View>
          </LinearGradient>
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
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  habitRow: { marginBottom: 16 },
  gradientCardMorning: {
    borderWidth: 2,
    borderColor: "#C7DBFF",
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
  },
  habitGradient: {
    padding: 16,
    borderRadius: 12,
  },
  habitCard: {
    backgroundColor: "#F8F6FF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 2,
    borderColor: "#CFC3FF",
  },
  gradientCardEvening: {
    borderWidth: 2,
    borderColor: "#CFC3FF",
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
  },
  habitTopRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CFC3FF",
    marginRight: 10,
    backgroundColor: "#fff",
  },
  checkboxTouchable: { marginRight: 10 },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CFC3FF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxBoxChecked: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  checkboxBoxBlue: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9DBBFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxBoxBlueChecked: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  checkboxBoxGreen: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#A7E3BF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxBoxGreenChecked: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  habitLabel: { flex: 1, fontSize: 16, color: "#111827", fontWeight: "600" },
  streakBadge: {
    backgroundColor: "#E6F7F1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  streakText: { color: "#10B981", fontSize: 12, fontWeight: "700" },
  progressLabel: { fontSize: 12, color: "#6b7280", marginTop: 8 },
  progressTrack: {
    height: 8,
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 6,
  },
  progressFill: { height: 8, backgroundColor: "#3b82f6" },
  progressTrackBlue: {
    height: 8,
    backgroundColor: "#EAF1FF",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 6,
    flex: 1,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#C9D8FF",
  },
  progressFillBlue: {
    height: 8,
    backgroundColor: "#3B82F6",
  },
  progressTrackAlt: {
    height: 8,
    backgroundColor: "#EFEAFC",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 6,
    flex: 1,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#D8CCFF",
  },
  progressFillAlt: {
    height: 8,
    backgroundColor: "#8B5CF6",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "500",
    color: "#8B5CF6",
  },
  progressPercentageBlue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3B82F6",
  },
  addIcon: {
    fontSize: 24,
    color: "#8B5CF6",
    fontWeight: "500",
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F0EAFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginLeft: 4,
  },
  subHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  subHeaderLeft: { color: "#6b7280" },
  subHeaderRight: { color: "#6b7280" },
  gradientTaskCard: {
    borderWidth: 2,
    borderColor: "#CFEBD6",
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
  },
  taskGradient: {
    padding: 16,
    borderRadius: 12,
  },
  taskTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  checkboxSmall: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    marginRight: 12,
  },
  taskTitle: { fontSize: 16, color: "#111827" },
  taskTime: { fontSize: 12, color: "#6b7280", marginTop: 4 },
})

export default DailyRoutines
