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
  Dimensions,
  TextInput,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import TopHeader from "../components/TopHeader"
import { LineChart } from "react-native-chart-kit"
import { getPersonalRecords, upsertPersonalRecords } from "../lib/prs"
import { createPlanInDb, listPlans, listPlanTree, createWeek as dbCreateWeek, createDay as dbCreateDay, createBlock as dbCreateBlock, createExercise as dbCreateExercise } from "../lib/plans"

interface ScreenProps { onLogout?: () => void }

const BodyScreen: React.FC<ScreenProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState("profile")
  const [prs, setPrs] = useState({ bench: 0, squat: 0, deadlift: 0, ohp: 0 })
  const [editOpen, setEditOpen] = useState(false)
  const [formBench, setFormBench] = useState<string>("")
  const [formSquat, setFormSquat] = useState<string>("")
  const [formDeadlift, setFormDeadlift] = useState<string>("")
  const [formOhp, setFormOhp] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [myPlans, setMyPlans] = useState<{ id: string; name: string; description?: string | null }[]>([])

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

  useEffect(() => {
    ;(async () => {
      const data = await getPersonalRecords()
      if (data) {
        setPrs({
          bench: data.bench_press_1rm || 0,
          squat: data.squat_1rm || 0,
          deadlift: data.deadlift_1rm || 0,
          ohp: data.overhead_press_1rm || 0,
        })
      }
      // Load existing plans
      try {
        const plans = await listPlans()
        setMyPlans(plans.map(p => ({ id: p.id, name: p.name, description: p.description })))
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to load plans", (e as any)?.message)
      }
    })()
  }, [])

  const openEdit = () => {
    setFormBench(prs.bench ? String(prs.bench) : "")
    setFormSquat(prs.squat ? String(prs.squat) : "")
    setFormDeadlift(prs.deadlift ? String(prs.deadlift) : "")
    setFormOhp(prs.ohp ? String(prs.ohp) : "")
    setEditOpen(true)
  }

  const savePrs = async () => {
    try {
      setSaving(true)
      await upsertPersonalRecords({
        bench_press_1rm: formBench ? Number(formBench) : null,
        squat_1rm: formSquat ? Number(formSquat) : null,
        deadlift_1rm: formDeadlift ? Number(formDeadlift) : null,
        overhead_press_1rm: formOhp ? Number(formOhp) : null,
      })
      setPrs({
        bench: formBench ? Number(formBench) : 0,
        squat: formSquat ? Number(formSquat) : 0,
        deadlift: formDeadlift ? Number(formDeadlift) : 0,
        ohp: formOhp ? Number(formOhp) : 0,
      })
      setEditOpen(false)
    } finally {
      setSaving(false)
    }
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

  // Build the current week dynamically (Sun-Sat) and preselect today
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay()) // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return {
      day: weekdayNames[d.getDay()],
      date: d.getDate(),
      label: i === 0 ? "Rest" : "",
    }
  })
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(today.getDay())
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

  // weekDays computed above

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

  // -------- Plan Builder State --------
  type Exercise = { id: string; name: string; type: "Lifting" | "Cardio" | "Mobility"; sets?: string; reps?: string; weight?: string; rest?: string }
  type Block = { id: string; name: string; letter: string; exercises: Exercise[] }
  type Day = { id: string; name: string; blocks: Block[] }
  type Week = { id: string; name: string; days: Day[] }
  type TrainingPlan = { id: string; name: string; description?: string; weeks: Week[] }

  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [weekModalOpen, setWeekModalOpen] = useState<{ open: boolean; weekIndex?: number }>({ open: false })
  const [dayModalOpen, setDayModalOpen] = useState<{ open: boolean; weekIndex?: number }>({ open: false })
  const [blockModalOpen, setBlockModalOpen] = useState<{ open: boolean; weekIndex?: number; dayIndex?: number }>({ open: false })
  const [exerciseModalOpen, setExerciseModalOpen] = useState<{ open: boolean; weekIndex?: number; dayIndex?: number; blockIndex?: number }>({ open: false })

  // Temp form fields
  const [planName, setPlanName] = useState("")
  const [planDescription, setPlanDescription] = useState("")
  const [weekName, setWeekName] = useState("")
  const [dayNames, setDayNames] = useState<string[]>([""])
  const [blockNames, setBlockNames] = useState<string[]>([""])
  const [exerciseNames, setExerciseNames] = useState<string[]>([""])

  const createPlan = () => {
    ;(async () => {
      try {
        const name = planName || "Untitled Plan"
        const desc = planDescription || undefined
        const dbPlan = await createPlanInDb(name, desc)
        setPlan({ id: dbPlan.id, name: dbPlan.name, description: dbPlan.description || undefined, weeks: [] })
        setMyPlans((prev) => [{ id: dbPlan.id, name: dbPlan.name, description: dbPlan.description }, ...prev])
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to create plan", (e as any)?.message)
      } finally {
        setPlanModalOpen(false)
        setPlanName("")
        setPlanDescription("")
      }
    })()
  }

  const addWeek = async () => {
    if (!plan) return
    const position = plan.weeks.length + 1
    const name = weekName || `Week ${position}`
    try {
      const row = await dbCreateWeek(plan.id, name, position)
      const newWeek: Week = { id: row.id, name: row.name, days: [] }
      setPlan({ ...plan, weeks: [...plan.weeks, newWeek] })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to save week", (e as any)?.message)
    } finally {
      setWeekModalOpen({ open: false })
      setWeekName("")
    }
  }

  const addDay = async () => {
    if (!plan || dayModalOpen.weekIndex === undefined) return
    const weeksCopy = [...plan.weeks]
    const week = weeksCopy[dayModalOpen.weekIndex]
    const names = dayNames.filter((n) => n.trim().length > 0)
    const toCreate = names.length > 0 ? names : [""]
    for (let i = 0; i < Math.min(7, toCreate.length); i += 1) {
      const n = toCreate[i]
      const position = week.days.length + 1
      try {
        const row = await dbCreateDay(plan.id, week.id, n || `Day ${position}`, position)
        week.days.push({ id: row.id, name: row.name, blocks: [] })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to save day", (e as any)?.message)
      }
    }
    setPlan({ ...plan, weeks: weeksCopy })
    setDayModalOpen({ open: false })
    setDayNames([""])
  }

  const addBlock = async () => {
    if (!plan || blockModalOpen.weekIndex === undefined || blockModalOpen.dayIndex === undefined) return
    const weeksCopy = [...plan.weeks]
    const day = weeksCopy[blockModalOpen.weekIndex].days[blockModalOpen.dayIndex]
    const names = blockNames.filter((n) => n.trim().length > 0)
    const toCreate = names.length > 0 ? names : [""]
    for (let i = 0; i < toCreate.length; i += 1) {
      const n = toCreate[i]
      const letter = String.fromCharCode(65 + day.blocks.length)
      const position = day.blocks.length + 1
      try {
        const row = await dbCreateBlock(plan.id, day.id, n || `Block ${letter}`, letter, position)
        day.blocks.push({ id: row.id, name: row.name, letter: row.letter || letter, exercises: [] })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to save block", (e as any)?.message)
      }
    }
    setPlan({ ...plan, weeks: weeksCopy })
    setBlockModalOpen({ open: false })
    setBlockNames([""])
  }

  const addExercise = async () => {
    if (!plan || exerciseModalOpen.weekIndex === undefined || exerciseModalOpen.dayIndex === undefined || exerciseModalOpen.blockIndex === undefined) return
    const weeksCopy = [...plan.weeks]
    const block = weeksCopy[exerciseModalOpen.weekIndex].days[exerciseModalOpen.dayIndex].blocks[exerciseModalOpen.blockIndex]
    const names = exerciseNames.filter((n) => n.trim().length > 0)
    const toCreate = names.length > 0 ? names : [""]
    for (let i = 0; i < toCreate.length; i += 1) {
      const n = toCreate[i]
      const position = block.exercises.length + 1
      try {
        const row = await dbCreateExercise(plan.id, block.id, { name: n || `Exercise ${position}`, type: "Lifting", position })
        block.exercises.push({ id: row.id, name: row.name, type: "Lifting" })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to save exercise", (e as any)?.message)
      }
    }
    setPlan({ ...plan, weeks: weeksCopy })
    setExerciseModalOpen({ open: false })
    setExerciseNames([""])
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <TopHeader onLogout={onLogout} />

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
                <TouchableOpacity style={styles.editButton} onPress={openEdit}>
                  <Ionicons name="pencil-outline" size={16} color="#666" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recordsGrid}>
                <PersonalRecordCard exercise="Bench Press" weight={`${prs.bench} lbs`} />
                <PersonalRecordCard exercise="Squat" weight={`${prs.squat} lbs`} />
                <PersonalRecordCard exercise="Deadlift" weight={`${prs.deadlift} lbs`} />
                <PersonalRecordCard exercise="Overhead Press" weight={`${prs.ohp} lbs`} />
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
                      style={[styles.weekDayButton, selectedDayIndex === index && styles.selectedWeekDayButton]}
                      onPress={() => setSelectedDayIndex(index)}
                    >
                      <Text style={[styles.weekDayName, selectedDayIndex === index && styles.selectedWeekDayName]}>
                        {day.day}
                      </Text>
                      <Text style={[styles.weekDayDate, selectedDayIndex === index && styles.selectedWeekDayDate]}>
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
            {plan === null ? (
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
                    <TouchableOpacity style={styles.buildPlanButton} onPress={() => setPlanModalOpen(true)}>
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.buildPlanButtonText}>Build Plan</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* My Plans */}
                <View style={styles.sectionCard}>
                  <Text style={styles.myPlansTitle}>My Plans</Text>

                  {myPlans.length === 0 ? (
                    <View style={styles.emptyPlansContainer}>
                      <View style={styles.emptyPlansIcon}>
                        <Ionicons name="radio-button-off-outline" size={60} color="#ccc" />
                      </View>
                      <Text style={styles.emptyPlansTitle}>No plans created yet</Text>
                      <Text style={styles.emptyPlansDescription}>
                        Click "Build Plan" to create your first workout program
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      {myPlans.map((p) => (
                        <TouchableOpacity key={p.id} style={styles.planListItem} onPress={async () => {
                          const weeks = await listPlanTree(p.id)
                          const mapped = weeks.map((w) => ({ id: w.id, name: w.name, days: (w as any).days.map((d: any) => ({ id: d.id, name: d.name, blocks: d.blocks.map((b: any) => ({ id: b.id, name: b.name, letter: b.letter || "A", exercises: (b.exercises || []).map((e: any) => ({ id: e.id, name: e.name, type: e.type })) })) })) }))
                          setPlan({ id: p.id, name: p.name, description: p.description || undefined, weeks: mapped })
                        }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.planListName}>{p.name}</Text>
                            {!!p.description && <Text style={styles.planListDesc}>{p.description}</Text>}
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#666" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
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
            ) : (
              <>
                {/* Plan Detail View */}
                <View style={styles.planDetailHeader}>
                  <TouchableOpacity style={styles.backButton} onPress={() => setPlan(null)}>
                    <Ionicons name="chevron-back" size={22} color="#666" />
                  </TouchableOpacity>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={styles.planDetailTitle}>{plan.name}</Text>
                    {!!plan.description && <Text style={styles.planDetailDescription}>{plan.description}</Text>}
                  </View>
                  <View style={{ width: 22 }} />
                </View>

                <TouchableOpacity style={[styles.timePeriodButton, { alignSelf: "flex-start", marginBottom: 12 }]} onPress={() => setWeekModalOpen({ open: true })}>
                  <Text style={styles.timePeriodButtonText}>+ Add Week</Text>
                </TouchableOpacity>

                {plan.weeks.map((w, wi) => (
                  <View key={w.id} style={[styles.sectionCard, { marginTop: 12 }]}> 
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleContainer}>
                        <Ionicons name="calendar-outline" size={20} color="#4A90E2" />
                        <Text style={styles.sectionTitle}>{w.name}</Text>
                      </View>
                      <TouchableOpacity style={styles.editButton} onPress={() => setDayModalOpen({ open: true, weekIndex: wi })}>
                        <Ionicons name="add" size={16} color="#666" />
                        <Text style={styles.editButtonText}>Add Day</Text>
                      </TouchableOpacity>
                    </View>

                    {w.days.map((d, di) => (
                      <View key={d.id} style={{ marginBottom: 12 }}>
                        <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
                          <View style={styles.sectionTitleContainer}>
                            <Ionicons name="today-outline" size={18} color="#10B981" />
                            <Text style={[styles.sectionTitle, { fontSize: 16 }]}>{d.name}</Text>
                          </View>
                          <TouchableOpacity style={styles.editButton} onPress={() => setBlockModalOpen({ open: true, weekIndex: wi, dayIndex: di })}>
                            <Ionicons name="add" size={16} color="#666" />
                            <Text style={styles.editButtonText}>Add Block</Text>
                          </TouchableOpacity>
                        </View>

                        {d.blocks.map((b, bi) => (
                          <View key={b.id} style={styles.blockContainer}>
                            <View style={styles.workoutBlockHeader}>
                              <View style={styles.blockLabel}><Text style={styles.blockId}>{b.letter}</Text></View>
                              <View style={styles.blockInfo}><Text style={styles.blockName}>{b.name}</Text></View>
                              <TouchableOpacity style={styles.blockDropdown} onPress={() => setExerciseModalOpen({ open: true, weekIndex: wi, dayIndex: di, blockIndex: bi })}>
                                <Ionicons name="add" size={20} color="#666" />
                              </TouchableOpacity>
                            </View>
                            {b.exercises.map((e) => (
                              <View key={e.id} style={styles.exerciseRow}>
                                <Text style={styles.exerciseName}>{e.name}</Text>
                                <Text style={styles.exerciseMeta}>{e.type}</Text>
                                <Text style={styles.exerciseMeta}>{e.sets}×{e.reps}</Text>
                                {!!e.weight && <Text style={styles.exerciseMeta}>{e.weight}</Text>}
                                {!!e.rest && <Text style={styles.exerciseMeta}>{e.rest} rest</Text>}
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* Add some bottom padding for navigation */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit PRs Modal */}
      {editOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Personal Records</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>Bench Press (lbs)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formBench}
                onChangeText={setFormBench}
              />
            </View>

            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>Squat (lbs)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formSquat}
                onChangeText={setFormSquat}
              />
            </View>

            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>Deadlift (lbs)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formDeadlift}
                onChangeText={setFormDeadlift}
              />
            </View>

            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>Overhead Press (lbs)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formOhp}
                onChangeText={setFormOhp}
              />
            </View>

            <TouchableOpacity style={styles.modalSaveButton} onPress={savePrs} disabled={saving}>
              <Text style={styles.modalSaveButtonText}>{saving ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Build Plan Modal */}
      {planModalOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Plan</Text>
              <TouchableOpacity onPress={() => setPlanModalOpen(false)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>Plan name</Text>
              <TextInput style={styles.modalInput} placeholder="Plan name" placeholderTextColor="#999" value={planName} onChangeText={setPlanName} />
            </View>
            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>Description</Text>
              <TextInput style={styles.modalInput} placeholder="Description" placeholderTextColor="#999" value={planDescription} onChangeText={setPlanDescription} />
            </View>
            <TouchableOpacity style={styles.modalSaveButton} onPress={createPlan}>
              <Text style={styles.modalSaveButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Week Modal */}
      {weekModalOpen.open && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Week</Text>
              <TouchableOpacity onPress={() => setWeekModalOpen({ open: false })}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>Week name</Text>
              <TextInput style={styles.modalInput} placeholder="Week 1" placeholderTextColor="#999" value={weekName} onChangeText={setWeekName} />
            </View>
            <TouchableOpacity style={styles.modalSaveButton} onPress={addWeek}>
              <Text style={styles.modalSaveButtonText}>Add Week</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Day Modal */}
      {dayModalOpen.open && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Day</Text>
              <TouchableOpacity onPress={() => setDayModalOpen({ open: false })}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            {dayNames.map((name, idx) => (
              <View key={idx} style={styles.modalFieldRow}>
                <Text style={styles.modalLabel}>Day name</Text>
                <TextInput style={styles.modalInput} placeholder={`Day ${idx + 1}`} placeholderTextColor="#999" value={name} onChangeText={(t) => {
                  const copy = [...dayNames]; copy[idx] = t; setDayNames(copy)
                }} />
              </View>
            ))}
            {dayNames.length < 7 && (
              <TouchableOpacity style={styles.inlineAddButton} onPress={() => setDayNames([...dayNames, ""]) }>
                <Ionicons name="add" size={16} color="#4A90E2" />
                <Text style={styles.inlineAddText}>Add another day</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalSaveButton} onPress={addDay}>
              <Text style={styles.modalSaveButtonText}>Add Day</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Block Modal */}
      {blockModalOpen.open && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Block</Text>
              <TouchableOpacity onPress={() => setBlockModalOpen({ open: false })}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            {blockNames.map((name, idx) => (
              <View key={idx} style={styles.modalFieldRow}>
                <Text style={styles.modalLabel}>Block name</Text>
                <TextInput style={styles.modalInput} placeholder={`Block ${String.fromCharCode(65 + idx)}`} placeholderTextColor="#999" value={name} onChangeText={(t) => {
                  const copy = [...blockNames]; copy[idx] = t; setBlockNames(copy)
                }} />
              </View>
            ))}
            <TouchableOpacity style={styles.inlineAddButton} onPress={() => setBlockNames([...blockNames, ""]) }>
              <Ionicons name="add" size={16} color="#4A90E2" />
              <Text style={styles.inlineAddText}>Add another block</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={addBlock}>
              <Text style={styles.modalSaveButtonText}>Add Block</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Exercise Modal */}
      {exerciseModalOpen.open && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setExerciseModalOpen({ open: false })}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            {exerciseNames.map((name, idx) => (
              <View key={idx} style={styles.modalFieldRow}>
                <Text style={styles.modalLabel}>Exercise name</Text>
                <TextInput style={styles.modalInput} placeholder={`Exercise ${idx + 1}`} placeholderTextColor="#999" value={name} onChangeText={(t) => {
                  const copy = [...exerciseNames]; copy[idx] = t; setExerciseNames(copy)
                }} />
              </View>
            ))}
            <TouchableOpacity style={styles.inlineAddButton} onPress={() => setExerciseNames([...exerciseNames, ""]) }>
              <Ionicons name="add" size={16} color="#4A90E2" />
              <Text style={styles.inlineAddText}>Add another exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={addExercise}>
              <Text style={styles.modalSaveButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  blockContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  exerciseName: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  exerciseMeta: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
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
  planDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  planDetailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  planDetailDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  planName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  planDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
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
  planListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
  },
  planListName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  planListDesc: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
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
  modalOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalFieldRow: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f8f9fa",
  },
  modalSaveButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  modalSaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  inlineAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  inlineAddText: {
    color: "#4A90E2",
    fontSize: 14,
    fontWeight: "600",
  },
})

export default BodyScreen
