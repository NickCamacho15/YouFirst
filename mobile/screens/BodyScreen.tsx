"use client"

import React from "react"
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
  Animated,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Loader2, Check } from "lucide-react-native"
import ConfettiCannon from 'react-native-confetti-cannon'
import Svg, { Circle } from "react-native-svg"
import TopHeader from "../components/TopHeader"
import { LineChart } from "react-native-chart-kit"
import { getPersonalRecords, upsertPersonalRecords, addPrEntry, getPrSeries } from "../lib/prs"
import { createPlanInDb, listPlans, listPlanTree, createWeek as dbCreateWeek, createDay as dbCreateDay, createBlock as dbCreateBlock, createExercise as dbCreateExercise, updateExercise as dbUpdateExercise, deleteExercises as dbDeleteExercises } from "../lib/plans"
import { buildSnapshotFromPlanDay, createSessionFromSnapshot, getActiveSessionForToday, endSession, completeSet, markExercisesCompleted, getWorkoutStats, type SessionExerciseRow } from "../lib/workout"

interface ScreenProps { onLogout?: () => void; onOpenProfile?: () => void }

const BodyScreen: React.FC<ScreenProps> = ({ onLogout, onOpenProfile }) => {
  const [activeTab, setActiveTab] = useState("profile")
  const [prs, setPrs] = useState({ bench: 0, squat: 0, deadlift: 0, ohp: 0 })
  const [editOpen, setEditOpen] = useState(false)
  const [prUpdateOpen, setPrUpdateOpen] = useState(false)
  const [prLift, setPrLift] = useState<'Bench Press' | 'Squat' | 'Deadlift' | 'Overhead Press'>('Bench Press')
  const [prValue, setPrValue] = useState<string>("")
  const [prSaving, setPrSaving] = useState(false)
  const [prSuccessOpen, setPrSuccessOpen] = useState(false)
  const [formBench, setFormBench] = useState<string>("")
  const [formSquat, setFormSquat] = useState<string>("")
  const [formDeadlift, setFormDeadlift] = useState<string>("")
  const [formOhp, setFormOhp] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [myPlans, setMyPlans] = useState<{ id: string; name: string; description?: string | null }[]>([])
  const [trainingStats, setTrainingStats] = useState<{ total: number; avg: number; streak: number; volume: number }>({ total: 0, avg: 0, streak: 0, volume: 0 })

  const screenWidth = Dimensions.get("window").width

  // Dynamic chart data populated from PR history
  const [benchSeries, setBenchSeries] = useState<Array<{ x: string; y: number }>>([])
  const [squatSeries, setSquatSeries] = useState<Array<{ x: string; y: number }>>([])
  const [deadliftSeries, setDeadliftSeries] = useState<Array<{ x: string; y: number }>>([])
  const [ohpSeries, setOhpSeries] = useState<Array<{ x: string; y: number }>>([])
  const chartData = {
    labels: (benchSeries.length ? benchSeries : squatSeries.length ? squatSeries : deadliftSeries.length ? deadliftSeries : ohpSeries).map(p => p.x),
    datasets: [
      { data: benchSeries.map(p => p.y), color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`, strokeWidth: 2 },
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
    formatYLabel: (value: string) => {
      const n = Number(value)
      if (!Number.isFinite(n)) return ""
      const nearest = Math.round(n / 5) * 5
      // Only show labels that are close to multiples of 5
      return Math.abs(n - nearest) < 1 ? String(nearest) : ""
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
        const active = plans.find(p => (p as any).is_active)
        if (active) {
          const weeks = await listPlanTree(active.id)
          const mapped = weeks.map((w) => ({
            id: w.id,
            name: w.name,
            days: (w as any).days.map((d: any) => ({
              id: d.id,
              name: d.name,
              blocks: d.blocks.map((b: any) => ({
                id: b.id,
                name: b.name,
                letter: b.letter || "A",
                exercises: (b.exercises || []).map((e: any) => ({
                  id: e.id,
                  name: e.name,
                  type: e.type,
                  sets: e.sets,
                  reps: e.reps,
                  weight: e.weight,
                  rest: e.rest,
                  time: e.time,
                  distance: e.distance,
                  pace: e.pace,
                  time_cap: e.time_cap,
                  score_type: e.score_type,
                  target: e.target,
                })),
              })),
            })),
          }))
          setPlan({ id: active.id, name: active.name, description: active.description || undefined, weeks: mapped })
          const start = (active as any).start_date || null
          setActivePlanStart(start)
          const info = computePlanForDate({ id: active.id, name: active.name, description: active.description || undefined, weeks: mapped }, start, new Date())
          setTodayPlanLabel(info?.label || null)
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to load plans", (e as any)?.message)
      }
      // Load training stats
      try {
        const stats = await getWorkoutStats()
        setTrainingStats({ total: stats.totalWorkouts, avg: stats.avgDurationMins, streak: stats.currentStreakDays, volume: stats.totalVolumeThisWeek })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load workout stats', (e as any)?.message)
      }
      // Load PR history series for charts
      try {
        const [b, s, d, o] = await Promise.all([
          getPrSeries('bench'),
          getPrSeries('squat'),
          getPrSeries('deadlift'),
          getPrSeries('ohp'),
        ])
        const fmt = (rows: Array<{ recorded_at: string; value: number }>) => rows.map(r => ({ x: new Date(r.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), y: Number(r.value) }))
        setBenchSeries(fmt(b))
        setSquatSeries(fmt(s))
        setDeadliftSeries(fmt(d))
        setOhpSeries(fmt(o))
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load PR history', (e as any)?.message)
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
  const initialWeekStart = new Date(today)
  initialWeekStart.setDate(today.getDate() - today.getDay()) // Sunday
  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return {
      day: weekdayNames[d.getDay()],
      date: d.getDate(),
      label: i === 0 ? "Rest" : "",
    }
  })
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(today.getDay())
  const [workoutTime, setWorkoutTime] = useState(0)
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [isWorkoutPaused, setIsWorkoutPaused] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [completedBlocks, setCompletedBlocks] = useState<boolean[]>([false, false, false])
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseRow[]>([])
  const [setCounts, setSetCounts] = useState<Record<string, number>>({})
  const [restRemaining, setRestRemaining] = useState<Record<string, number>>({})
  const restTimers = React.useRef<Record<string, NodeJS.Timeout | null>>({}).current
  // Guided completion flow
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([])
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState<number>(0)
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({})
  const [planToSessionMap, setPlanToSessionMap] = useState<Record<string, string>>({})
  // Animated card highlights per exercise id
  const cardAnimValues = React.useRef<Record<string, Animated.Value>>({})
  const prevDoneCountsRef = React.useRef<Record<string, number>>({})

  // Timer effect for workout
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isWorkoutActive && !isWorkoutPaused) {
      interval = setInterval(() => {
        setWorkoutTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isWorkoutActive, isWorkoutPaused])

  const formatWorkoutTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Map today's date to plan day based on start_date
  const isoDate = (d: Date) => {
    // Use device local date (no UTC shift) to match user's expectation
    const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
  }
  const computePlanForDate = (p: TrainingPlan, startDateISO: string | null, targetDate: Date) => {
    if (!startDateISO) return null
    const targetISO = isoDate(targetDate)
    const diff = Math.floor((Date.parse(targetISO) - Date.parse(startDateISO)) / 86400000)
    if (diff < 0) return null
    const numWeeks = p.weeks.length
    if (numWeeks === 0) return null
    const horizon = numWeeks * 7
    if (diff >= horizon) {
      return { weekIndex: -1, dayIndex: -1, label: "No plan scheduled for this week", subLabel: null, showPlanName: false }
    }
    const wi = Math.floor(diff / 7)
    const di = diff % 7
    const week = p.weeks[wi]
    const weekName = week.name || `Week ${wi + 1}`
    const dayObj = week.days[di]
    if (dayObj) {
      const dayName = dayObj.name || `Day ${di + 1}`
      return { weekIndex: wi, dayIndex: di, label: `${weekName} • ${dayName}`, subLabel: null, showPlanName: true }
    }
    // Placeholder for missing day inside an existing week
    return { weekIndex: wi, dayIndex: di, label: "No plan made for today", subLabel: null, showPlanName: true }
  }

  // Will recompute after plan state is declared below

  // weekDays computed above

  const workoutBlocks: any[] = []

  const toggleBlockCompletion = (index: number) => {
    const newCompletedBlocks = [...completedBlocks]
    newCompletedBlocks[index] = !newCompletedBlocks[index]
    setCompletedBlocks(newCompletedBlocks)
  }

  // -------- Plan Builder State --------
  type Exercise = { id: string; name: string; type: "Lifting" | "Cardio" | "METCON"; sets?: string; reps?: string; weight?: string; rest?: string; time?: string; distance?: string; pace?: string; time_cap?: string; score_type?: string; target?: string }
  type Block = { id: string; name: string; letter: string; exercises: Exercise[] }
  type Day = { id: string; name: string; blocks: Block[] }
  type Week = { id: string; name: string; days: Day[] }
  type TrainingPlan = { id: string; name: string; description?: string; weeks: Week[] }

  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [activePlanStart, setActivePlanStart] = useState<string | null>(null)
  const [todayPlanLabel, setTodayPlanLabel] = useState<string | null>(null)
  const [todayPlanSubLabel, setTodayPlanSubLabel] = useState<string | null>(null)
  const [showPlanName, setShowPlanName] = useState<boolean>(true)
  useEffect(() => {
    if (plan && activePlanStart) {
      // Map based on currently selected calendar day
      const target = new Date(weekStart)
      target.setDate(weekStart.getDate() + selectedDayIndex)
      const info = computePlanForDate(plan, activePlanStart, target)
      setTodayPlanLabel(info?.label || null)
      setTodayPlanSubLabel(info?.subLabel || null)
      setShowPlanName(!!info?.showPlanName)
    }
  }, [plan, activePlanStart, selectedDayIndex, weekStart])
  const [showSummary, setShowSummary] = useState(false)
  const [summarySeconds, setSummarySeconds] = useState(0)
  const [workoutStartedAt, setWorkoutStartedAt] = useState<Date | null>(null)
  const [endConfirmOpen, setEndConfirmOpen] = useState(false)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [weekModalOpen, setWeekModalOpen] = useState<{ open: boolean; weekIndex?: number }>({ open: false })
  const [dayModalOpen, setDayModalOpen] = useState<{ open: boolean; weekIndex?: number }>({ open: false })
  const [blockModalOpen, setBlockModalOpen] = useState<{ open: boolean; weekIndex?: number; dayIndex?: number }>({ open: false })
  const [exerciseModalOpen, setExerciseModalOpen] = useState<{ open: boolean; weekIndex?: number; dayIndex?: number; blockIndex?: number }>({ open: false })

  // Temp form fields
  const [planName, setPlanName] = useState("")
  const [planDescription, setPlanDescription] = useState("")
  const localDateYYYYMMDD = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const [planStartDate, setPlanStartDate] = useState<string>(localDateYYYYMMDD())
  const [planIsActive, setPlanIsActive] = useState<boolean>(true)
  const [weekName, setWeekName] = useState("")
  const [dayNames, setDayNames] = useState<string[]>([""])
  const [blockNames, setBlockNames] = useState<string[]>([""])
  type ExerciseForm = { name: string; type: "Lifting" | "Cardio" | "METCON"; sets?: string; reps?: string; weight?: string; rest?: string; time?: string; distance?: string; pace?: string; time_cap?: string; score_type?: string; target?: string }
  const [exerciseForms, setExerciseForms] = useState<ExerciseForm[]>([{ name: "", type: "Lifting", sets: "", reps: "", weight: "", rest: "" }])
  const [openTypePicker, setOpenTypePicker] = useState<number | null>(null)
  const [exerciseFormError, setExerciseFormError] = useState<string>("")
  const [editingExercise, setEditingExercise] = useState<{ id: string; wi: number; di: number; bi: number } | null>(null)

  const createPlan = () => {
    ;(async () => {
      try {
        const name = planName || "Untitled Plan"
        const desc = planDescription || undefined
        const dbPlan = await createPlanInDb(name, desc, planStartDate, planIsActive)
        setPlan({ id: dbPlan.id, name: dbPlan.name, description: dbPlan.description || undefined, weeks: [] })
        setMyPlans((prev) => [{ id: dbPlan.id, name: dbPlan.name, description: dbPlan.description }, ...prev])
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to create plan", (e as any)?.message)
      } finally {
        setPlanModalOpen(false)
        setPlanName("")
        setPlanDescription("")
        setPlanStartDate(localDateYYYYMMDD())
        setPlanIsActive(true)
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
    const forms: ExerciseForm[] = exerciseForms.length > 0 ? exerciseForms : [{ name: "", type: "Lifting", sets: "", reps: "", weight: "", rest: "" }]

    // Basic validation for required fields by type
    const formsToValidate = editingExercise ? [forms[0]] : forms
    for (const f of formsToValidate) {
      if (!f.name?.trim()) { setExerciseFormError("Exercise name is required"); return }
      if (f.type === "Lifting" && (!f.sets || !f.reps || !f.weight)) { setExerciseFormError("Lifting requires sets, reps and weight"); return }
      if (f.type === "Cardio" && (!f.time || !f.distance || !f.pace)) { setExerciseFormError("Cardio requires time, distance and pace"); return }
    }
    setExerciseFormError("")
    if (editingExercise) {
      const f = forms[0]
      try {
        await dbUpdateExercise(editingExercise.id, { name: f.name, type: f.type, sets: f.sets ?? null, reps: f.reps ?? null, weight: f.weight ?? null, rest: f.rest ?? null, time: f.time ?? null, distance: f.distance ?? null, pace: f.pace ?? null, time_cap: f.time_cap ?? null, score_type: f.score_type ?? null, target: f.target ?? null })
        const exs = weeksCopy[editingExercise.wi].days[editingExercise.di].blocks[editingExercise.bi].exercises
        const idx = exs.findIndex((x) => x.id === editingExercise.id)
        if (idx !== -1) {
          exs[idx] = { ...exs[idx], name: f.name, type: f.type, sets: f.sets, reps: f.reps, weight: f.weight, rest: f.rest, time: f.time, distance: f.distance, pace: f.pace, time_cap: f.time_cap, score_type: f.score_type, target: f.target }
        }
      } catch (e) {
        console.warn("Failed to update exercise", (e as any)?.message)
      }
    } else {
      for (let i = 0; i < forms.length; i += 1) {
        const f = forms[i]
        const position = block.exercises.length + 1
        try {
          const row = await dbCreateExercise(plan.id, block.id, { name: f.name || `Exercise ${position}`, type: f.type, sets: f.sets, reps: f.reps, weight: f.weight, rest: f.rest, time: f.time, distance: f.distance, pace: f.pace, time_cap: f.time_cap, score_type: f.score_type, target: f.target, position })
          block.exercises.push({ id: row.id, name: row.name, type: f.type, sets: f.sets, reps: f.reps, weight: f.weight, rest: f.rest, time: f.time, distance: f.distance, pace: f.pace, time_cap: f.time_cap, score_type: f.score_type, target: f.target })
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("Failed to save exercise", (e as any)?.message)
        }
      }
    }
    setPlan({ ...plan, weeks: weeksCopy })
    setExerciseModalOpen({ open: false })
    setExerciseForms([{ name: "", type: "Lifting", sets: "", reps: "", weight: "", rest: "" }])
    setEditingExercise(null)
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header rendered persistently in App */}

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
                  <Ionicons name="trophy-outline" size={20} color="#4A90E2"/>
                  <Text style={styles.sectionTitle}>Personal Records (1RM) </Text>
                </View>
                <TouchableOpacity style={styles.prActionButton} onPress={() => setPrUpdateOpen(true)}>
                  <Ionicons name="trophy-outline" size={16} color="#fff" />
                  <Text style={styles.prActionText}>Update a PR</Text>
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
                <StatRow label="Total Workouts" value={`${trainingStats.total}`} />
                <StatRow label="Avg. Workout Duration" value={`${trainingStats.avg} mins`} />
                <StatRow label="Current Streak" value={`${trainingStats.streak} days`} valueColor="#10B981" />
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

            {/* Weekly Volume Summary removed per request */}

            {/* Exercise Progress summary removed per request */}

            {/* Individual Exercise Progress Charts (driven by PR history). Use a default single point if empty. */}
            {([
              { name: 'Bench Press', color: '#4A90E2', series: benchSeries },
              { name: 'Squat', color: '#10B981', series: squatSeries },
              { name: 'Clean', color: '#F59E0B', series: deadliftSeries },
              { name: 'Overhead Press', color: '#EF4444', series: ohpSeries },
            ] as Array<{ name: string; color: string; series: Array<{ x: string; y: number }> }>).map(({ name, color, series }) => {
              const seriesOrFallback = (series.length ? series : [{ x: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), y: 0 }])
              // To prevent X-axis label overlap, only show roughly 4–6 evenly spaced labels and hide the rest.
              const targetTicks = 6
              const tickEvery = Math.max(1, Math.ceil(seriesOrFallback.length / targetTicks))
              const labels = seriesOrFallback.map((p, idx) => (idx % tickEvery === 0 ? p.x : ''))
              const dataPoints = seriesOrFallback.map(p => p.y)
              return (
                <View key={name} style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                      <Ionicons name="trending-up-outline" size={20} color={color} />
                      <Text style={styles.sectionTitle}>{name} Progress</Text>
                    </View>
                  </View>
                  <View style={styles.chartContainer}>
                    <LineChart
                      data={{ labels, datasets: [{ data: dataPoints, color: () => color, strokeWidth: 2 }] }}
                      width={screenWidth - 80}
                      height={180}
                      chartConfig={chartConfig}
                      bezier
                      style={styles.chart}
                      withHorizontalLabels={true}
                      withVerticalLabels={true}
                      withDots={true}
                      withShadow={false}
                      withInnerLines={false}
                      withOuterLines={false}
                      verticalLabelRotation={0}
                    />
                  </View>
                  <Text style={styles.chartSubtitle}>Tracking PR history</Text>
                </View>
              )
            })}
          </>
        ) : activeTab === "workout" ? (
          <>
            {/* Weekly Calendar */}
            <View style={styles.sectionCard}>
              <View style={styles.weekCalendarContainer}>
                <TouchableOpacity style={styles.calendarArrowBox} onPress={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}>
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

                <TouchableOpacity style={styles.calendarArrowBox} onPress={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}>
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Workout Timer / Summary (conditional) */}
            {showSummary ? (
              <View style={styles.sectionCard}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#333", textAlign: "center", marginBottom: 8 }}>Workout Complete</Text>
                <Text style={{ fontSize: 32, fontWeight: "800", color: "#111827", textAlign: "center", fontFamily: "monospace", marginBottom: 12 }}>{formatWorkoutTime(summarySeconds)}</Text>
                <TouchableOpacity style={styles.startWorkoutButton} onPress={() => setShowSummary(false)}>
                  <Text style={styles.startWorkoutButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.sectionCard}>
                <Text style={styles.workoutTimerTitle}>Workout Timer</Text>
                <Text style={styles.workoutTimerDisplay}>{formatWorkoutTime(workoutTime)}</Text>
                {plan ? (
                  <>
                    {showPlanName && <Text style={styles.planNameUnderTimer}>{plan.name}</Text>}
                    <Text style={styles.workoutType}>{todayPlanLabel ? todayPlanLabel : 'No plan scheduled today'}</Text>
                  </>
                ) : (
                  <Text style={styles.workoutType}>No plan scheduled today</Text>
                )}

                <TouchableOpacity
                  style={styles.startWorkoutButton}
                  onPress={async () => {
                    // Toggle pause/resume if active
                    if (isWorkoutActive) {
                      setIsWorkoutPaused((p)=> !p)
                      return
                    }
                    // start new workout without resetting if already counting
                    setIsWorkoutActive(true)
                    setIsWorkoutPaused(false)
                    if (!workoutStartedAt) setWorkoutStartedAt(new Date())
                    // Attempt resume
                    try {
                      const resumed = await getActiveSessionForToday()
                      if (resumed) {
                        setActiveSessionId(resumed.session.id)
                        setSessionExercises(resumed.exercises)
                        const counts: Record<string, number> = {}
                        for (const s of (resumed.sets || [])) {
                          counts[s.session_exercise_id] = Math.max(counts[s.session_exercise_id] || 0, s.set_index)
                        }
                        setSetCounts(counts)
                        // Build order and mapping for guided completion
                        const order = (resumed.exercises || [])
                          .map((sx: any) => sx.plan_exercise_id as string | null)
                          .filter((id: any): id is string => !!id)
                        setExerciseOrder(order)
                        const map: Record<string, string> = {}
                        ;(resumed.exercises || []).forEach((sx: any) => {
                          if (sx.plan_exercise_id) map[sx.plan_exercise_id as string] = sx.id
                        })
                        setPlanToSessionMap(map)
                        // Mark already completed exercises
                        const completed: Record<string, boolean> = {}
                        ;(resumed.exercises || []).forEach((sx: any) => {
                          const target = sx.target_sets || 0
                          const doneBySets = target > 0 && (counts[sx.id] || 0) >= target
                          const done = !!sx.completed_at || doneBySets
                          if (sx.plan_exercise_id && done) completed[sx.plan_exercise_id as string] = true
                        })
                        setCompletedExercises(completed)
                        // Pointer to first incomplete
                        let ptr = 0
                        for (let i = 0; i < order.length; i += 1) {
                          if (!completed[order[i]]) { ptr = i; break }
                          if (i === order.length - 1) ptr = i
                        }
                        setCurrentExerciseIdx(ptr)
                        return
                      }
                    } catch {}
                    // Start from selected plan day if available
                    if (plan && plan.weeks.length) {
                      // map from selected calendar day
                      const target = new Date(weekStart); target.setDate(weekStart.getDate() + selectedDayIndex)
                      const info = computePlanForDate(plan, activePlanStart, target)
                      const day = info && info.weekIndex >= 0 ? plan.weeks[info.weekIndex]?.days[info.dayIndex] : undefined
                      if (day) {
                        // Optimistically set guided order so first checkbox is active immediately
                        try {
                          const orderFromPlan: string[] = ([] as string[]).concat(
                            ...((day.blocks || []).map((b: any) => (b.exercises || []).map((e: any) => e.id)))
                          )
                          if (orderFromPlan.length) {
                            setExerciseOrder(orderFromPlan)
                            setCurrentExerciseIdx(0)
                            setCompletedExercises({})
                          }
                        } catch {}
                        const snapshot = buildSnapshotFromPlanDay(day as any)
                        try {
                          const created = await createSessionFromSnapshot({ planId: plan.id, planDayId: day.id, exercises: snapshot })
                          setActiveSessionId(created.session.id)
                          setSessionExercises(created.exercises)
                          setSetCounts({})
                          // Build order and mapping for guided completion
                          const order = snapshot.map((s) => s.plan_exercise_id as string).filter(Boolean)
                          setExerciseOrder(order)
                          setCurrentExerciseIdx(0)
                          const map: Record<string, string> = {}
                          created.exercises.forEach((sx) => {
                            if ((sx as any).plan_exercise_id) map[(sx as any).plan_exercise_id as string] = sx.id
                          })
                          setPlanToSessionMap(map)
                          setCompletedExercises({})
                        } catch {}
                        return
                      }
                    }
                    // Fallback: free session
                    try {
                      const created = await createSessionFromSnapshot({ exercises: [] })
                      setActiveSessionId(created.session.id)
                      setSessionExercises(created.exercises)
                      setSetCounts({})
                      setExerciseOrder([])
                      setCurrentExerciseIdx(0)
                      setCompletedExercises({})
                    } catch {}
                  }}
                >
                  <Ionicons name={isWorkoutActive && !isWorkoutPaused ? "pause" : "play"} size={20} color="#fff" />
                  <Text style={styles.startWorkoutButtonText}>{isWorkoutActive ? (isWorkoutPaused ? "Resume Workout" : "Pause Workout") : "Start Workout"}</Text>
                </TouchableOpacity>

                {isWorkoutActive && (
                <TouchableOpacity style={styles.endSessionButton} onPress={() => setEndConfirmOpen(true)}>
                  <Ionicons name="square-outline" size={20} color="#EF4444" />
                  <Text style={styles.endSessionButtonText}>End Session</Text>
                </TouchableOpacity>
                )}
              </View>
            )}

            {/* Block-grouped workout view with progress ring (shown before start; actions hidden until started) */}
            {plan && activePlanStart && (
              (() => {
                const target = new Date(weekStart); target.setDate(weekStart.getDate() + selectedDayIndex)
                const info = computePlanForDate(plan, activePlanStart, target)
                if (!info || info.weekIndex < 0) return null
                const day = plan.weeks[info.weekIndex]?.days[info.dayIndex]
                if (!day) return null
                return (
                  <View style={styles.sectionCard}>
                    {day.blocks.map((b) => {
                      const hasSession = isWorkoutActive && sessionExercises.length > 0
                      const sxRows = (b.exercises || []).map((e) => {
                        if (hasSession) {
                          const sid = planToSessionMap[e.id]
                          return sessionExercises.find((x) => x.id === sid) as any
                        }
                        // Fallback pre-start pseudo row using plan exercise targets
                        const ts = e.sets ? parseInt(String(e.sets), 10) : 0
                        const tr = e.reps ? parseInt(String(e.reps), 10) : null
                        const tw: any = e.weight ?? null
                        const rest = e.rest ? parseInt(String(e.rest), 10) : null
                        return { id: e.id, name: e.name, target_sets: ts || 0, target_reps: tr, target_weight: tw, target_rest_seconds: rest }
                      }).filter(Boolean) as any[]
                      const total = sxRows.length || 1
                      const completedCount = sxRows.filter((sx) => {
                        const tgt = sx.target_sets || 0
                        const done = Math.min(tgt, setCounts[sx.id] || 0)
                        return tgt > 0 ? done >= tgt : (setCounts[sx.id] || 0) > 0
                      }).length
                      const pct = Math.min(1, Math.max(0, completedCount / total))
                      const radius = 9
                      const circumference = 2 * Math.PI * radius
                      const offset = circumference * (1 - pct)
                      return (
                        <View key={b.id} style={{ marginBottom: 16 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            {completedCount === total ? (
                              <Check size={20} color="#10B981" />
                            ) : (
                              <Svg width={22} height={22}>
                                <Circle cx={11} cy={11} r={radius} stroke={'#eee'} strokeWidth={2} fill="none" />
                                <Circle cx={11} cy={11} r={radius} stroke={'#4A90E2'} strokeWidth={2} strokeDasharray={`${circumference}`} strokeDashoffset={offset} strokeLinecap="round" fill="none" transform="rotate(-90 11 11)" />
                              </Svg>
                            )}
                            <Text style={{ marginLeft: 8, fontWeight: '700', color: '#333' }}>{b.name}</Text>
                          </View>
                          {sxRows.map((ex) => {
                            const tgtSets = ex.target_sets || 0
                            const done = Math.min(tgtSets, setCounts[ex.id] || 0)
                            const restLeft = restRemaining[ex.id] || 0
                            const atMax = tgtSets > 0 && done >= tgtSets
                            if (!cardAnimValues.current[ex.id]) cardAnimValues.current[ex.id] = new Animated.Value(0)
                            const anim = cardAnimValues.current[ex.id]
                            const prevDone = prevDoneCountsRef.current[ex.id] || 0
                            if (atMax && prevDone < tgtSets) {
                              Animated.sequence([
                                Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: false }),
                                Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: false }),
                              ]).start()
                            }
                            prevDoneCountsRef.current[ex.id] = done
                            const isActiveCard = isWorkoutActive && sessionExercises.length > 0 && ex.id === sessionExercises[currentExerciseIdx]?.id
                            const baseBg = atMax ? '#DCFCE7' : (isActiveCard ? '#E0ECFF' : '#FFFFFF')
                            const bgColor = anim.interpolate({ inputRange: [0,1], outputRange: [baseBg, '#BBF7D0'] })
                            return (
                              <Animated.View key={ex.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 8, backgroundColor: bgColor, borderRadius: 8, padding: 8 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{ex.name}</Text>
                                <Text style={{ color: '#666', marginTop: 4 }}>Sets: {tgtSets || '-'}  {ex.target_reps ? `• ${ex.target_reps} reps` : ''} {ex.target_weight ? `• ${ex.target_weight}` : ''}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                  <Text style={{ color: '#10B981', fontWeight: '700' }}>{done}/{tgtSets} completed</Text>
                                  {isWorkoutActive && (
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                      <TouchableOpacity
                                        onPress={async () => {
                                          if (atMax) return
                                          const next = Math.min(tgtSets || 9999, (setCounts[ex.id] || 0) + 1)
                                          try {
                                            await completeSet({ sessionExerciseId: ex.id, setIndex: next })
                                            setSetCounts({ ...setCounts, [ex.id]: next })
                                          } catch {}
                                        }}
                                        disabled={atMax}
                                        style={{ backgroundColor: atMax ? '#9CA3AF' : '#4A90E2', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
                                      >
                                        <Text style={{ color: '#fff', fontWeight: '700' }}>{atMax ? 'All Sets Done' : 'Complete Set'}</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() => {
                                          const duration = ex.target_rest_seconds || 60
                                          if (restTimers[ex.id]) { clearInterval(restTimers[ex.id]!); restTimers[ex.id] = null }
                                          setRestRemaining((prev)=> ({ ...prev, [ex.id]: duration }))
                                          restTimers[ex.id] = setInterval(() => {
                                            setRestRemaining((prev) => {
                                              const v = Math.max(0, (prev[ex.id] || 0) - 1)
                                              if (v === 0 && restTimers[ex.id]) { clearInterval(restTimers[ex.id]!); restTimers[ex.id] = null }
                                              return { ...prev, [ex.id]: v }
                                            })
                                          }, 1000)
                                        }}
                                        style={{ borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
                                      >
                                        <Text style={{ fontWeight: '700', color: '#333' }}>{restLeft > 0 ? `Rest ${restLeft}s` : 'Start Rest'}</Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              </Animated.View>
                            )
                          })}
                        </View>
                      )
                    })}
                  </View>
                )
              })()
            )}

            {/* Guided checkbox preview removed */}

            {/* Summary now shown inline above when showSummary === true */}
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
                        <Ionicons name="list-outline" size={24} color="#4A90E2" />
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
                          const mapped = weeks.map((w) => ({
                            id: w.id,
                            name: w.name,
                            days: (w as any).days.map((d: any) => ({
                              id: d.id,
                              name: d.name,
                              blocks: d.blocks.map((b: any) => ({
                                id: b.id,
                                name: b.name,
                                letter: b.letter || "A",
                                exercises: (b.exercises || []).map((e: any) => ({
                                  id: e.id,
                                  name: e.name,
                                  type: e.type,
                                  sets: e.sets,
                                  reps: e.reps,
                                  weight: e.weight,
                                  rest: e.rest,
                                  time: e.time,
                                  distance: e.distance,
                                  pace: e.pace,
                                  time_cap: e.time_cap,
                                  score_type: e.score_type,
                                  target: e.target,
                                })),
                              })),
                            })),
                          }))
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
                              <TouchableOpacity
                                style={styles.blockDropdown}
                                onPress={() => {
                                  setOpenTypePicker(null)
                                  setExerciseFormError("")
                                  setExerciseForms([
                                    { name: "", type: "Lifting", sets: "", reps: "", weight: "", rest: "", time: "", distance: "", pace: "", time_cap: "", score_type: "", target: "" },
                                  ])
                                  setExerciseModalOpen({ open: true, weekIndex: wi, dayIndex: di, blockIndex: bi })
                                }}
                              >
                                <Ionicons name="add" size={20} color="#666" />
                              </TouchableOpacity>
                            </View>
                            {b.exercises.map((e) => (
                              <View key={e.id} style={[styles.exerciseRow, { justifyContent: "space-between", paddingVertical: 12 }]}> 
                                <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                  <Text style={styles.exerciseName}>{e.name}</Text>
                                  {e.type === "Lifting" && (<>
                                    {!!(e.sets || e.reps) && <Text style={styles.exerciseMeta}>{e.sets}×{e.reps}</Text>}
                                    {!!e.weight && <Text style={styles.exerciseMeta}>{e.weight}</Text>}
                                  </>)}
                                  {e.type === "Cardio" && (<>
                                    {!!e.time && <Text style={styles.exerciseMeta}>{e.time}</Text>}
                                    {!!e.distance && <Text style={styles.exerciseMeta}>{e.distance}</Text>}
                                    {!!e.pace && <Text style={styles.exerciseMeta}>{e.pace}</Text>}
                                  </>)}
                                  {e.type === "METCON" && (<>
                                    {!!e.time_cap && <Text style={styles.exerciseMeta}>{e.time_cap}</Text>}
                                    {!!(e.sets || e.reps) && <Text style={styles.exerciseMeta}>{e.sets}×{e.reps}</Text>}
                                  </>)}
                                  {!!e.rest && <Text style={styles.exerciseMeta}>{e.rest} rest</Text>}
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 8 }}>
                                  <TouchableOpacity onPress={async () => {
                                    setEditingExercise({ id: e.id, wi, di, bi })
                                    setExerciseForms([{ name: e.name, type: e.type as any, sets: e.sets || "", reps: e.reps || "", weight: e.weight || "", rest: e.rest || "", time: e.time || "", distance: e.distance || "", pace: e.pace || "", time_cap: e.time_cap || "", score_type: e.score_type || "", target: e.target || "" }])
                                    setExerciseModalOpen({ open: true, weekIndex: wi, dayIndex: di, blockIndex: bi })
                                  }}>
                                    <Ionicons name="create-outline" size={20} color="#666" />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={async () => {
                                    try {
                                      await dbDeleteExercises([e.id])
                                      const weeksCopy = [...plan!.weeks]
                                      weeksCopy[wi].days[di].blocks[bi].exercises = weeksCopy[wi].days[di].blocks[bi].exercises.filter((x) => x.id !== e.id)
                                      setPlan({ ...plan!, weeks: weeksCopy })
                                    } catch (err) {
                                      // eslint-disable-next-line no-console
                                      console.warn("Delete exercise failed", (err as any)?.message)
                                    }
                                  }}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                  </TouchableOpacity>
                                </View>
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

      {/* New Update PR Modal */}
      {prUpdateOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update a Personal Record</Text>
              <TouchableOpacity onPress={() => setPrUpdateOpen(false)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>Select lift</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['Bench Press','Squat','Deadlift','Overhead Press'] as const).map((opt)=> (
                  <TouchableOpacity key={opt} onPress={()=> setPrLift(opt)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: prLift===opt? '#4A90E2':'#e0e0e0', backgroundColor: prLift===opt? '#E6F0FF':'#f8f9fa' }}>
                    <Text style={{ color: prLift===opt? '#1E40AF':'#333', fontWeight: '600' }}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>New PR (lbs)</Text>
              <TextInput style={styles.modalInput} placeholder="0" placeholderTextColor="#999" keyboardType="numeric" value={prValue} onChangeText={setPrValue} />
            </View>
            <TouchableOpacity style={styles.modalSaveButton} disabled={prSaving} onPress={async ()=>{
              try {
                setPrSaving(true)
                const val = prValue ? Number(prValue) : null
                await upsertPersonalRecords({
                  bench_press_1rm: prLift==='Bench Press'? val : prs.bench || null,
                  squat_1rm: prLift==='Squat'? val : prs.squat || null,
                  deadlift_1rm: prLift==='Deadlift'? val : prs.deadlift || null,
                  overhead_press_1rm: prLift==='Overhead Press'? val : prs.ohp || null,
                })
                if (val !== null) {
                  const mapLift: Record<string, 'bench'|'squat'|'deadlift'|'ohp'> = {
                    'Bench Press': 'bench',
                    'Squat': 'squat',
                    'Deadlift': 'deadlift',
                    'Overhead Press': 'ohp',
                  }
                  await addPrEntry(mapLift[prLift], val)
                  // Silent refresh of chart series
                  try {
                    const [b, s, d, o] = await Promise.all([
                      getPrSeries('bench'),
                      getPrSeries('squat'),
                      getPrSeries('deadlift'),
                      getPrSeries('ohp'),
                    ])
                    const fmt = (rows: Array<{ recorded_at: string; value: number }>) => rows.map(r => ({ x: new Date(r.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), y: Number(r.value) }))
                    setBenchSeries(fmt(b))
                    setSquatSeries(fmt(s))
                    setDeadliftSeries(fmt(d))
                    setOhpSeries(fmt(o))
                  } catch {}
                }
                setPrs({
                  bench: prLift==='Bench Press'? (val||0) : prs.bench,
                  squat: prLift==='Squat'? (val||0) : prs.squat,
                  deadlift: prLift==='Deadlift'? (val||0) : prs.deadlift,
                  ohp: prLift==='Overhead Press'? (val||0) : prs.ohp,
                })
                setPrUpdateOpen(false)
                setPrValue("")
                setPrSuccessOpen(true)
              } finally { setPrSaving(false) }
            }}>
              <Text style={styles.modalSaveButtonText}>{prSaving? 'Saving...':'Save PR'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PR Success Modal */}
      {prSuccessOpen && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <Ionicons name="trophy-outline" size={40} color="#F59E0B" />
            <Text style={[styles.modalTitle, { marginTop: 8 }]}>Congratulations!</Text>
            <Text style={{ color: '#555', textAlign: 'center', marginTop: 6 }}>
              {[
                'New heights unlocked. Keep pushing the limits!',
                'Strength is built one rep at a time. Amazing work!',
                'You showed up and showed out. On to the next PR!',
                'Momentum is yours. This is how greatness compounds.',
              ][Math.floor(Math.random()*4)]}
            </Text>
            <TouchableOpacity style={[styles.modalSaveButton, { marginTop: 12, alignSelf: 'stretch' }]} onPress={()=> setPrSuccessOpen(false)}>
              <Text style={styles.modalSaveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ConfettiCannon count={120} origin={{ x: 0, y: 0 }} fadeOut autoStart={true} explosionSpeed={350} fallSpeed={2400} />
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
            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>Start date</Text>
              <TextInput style={styles.modalInput} placeholder="YYYY-MM-DD" placeholderTextColor="#999" value={planStartDate} onChangeText={setPlanStartDate} />
            </View>
            {/* Plans default to active; toggle removed for simplicity */}
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
              <Text style={styles.modalTitle}>{editingExercise ? "Edit Exercise" : "Add Exercise"}</Text>
              <TouchableOpacity
                onPress={() => {
                  setExerciseModalOpen({ open: false })
                  setOpenTypePicker(null)
                  setExerciseFormError("")
                  setExerciseForms([
                    { name: "", type: "Lifting", sets: "", reps: "", weight: "", rest: "", time: "", distance: "", pace: "", time_cap: "", score_type: "", target: "" },
                  ])
                  setEditingExercise(null)
                }}
              >
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 8 }}>
              {!!exerciseFormError && (
                <Text style={{ color: "#EF4444", marginBottom: 8, fontWeight: "600" }}>{exerciseFormError}</Text>
              )}
              {exerciseForms.map((f, idx) => (
                <View key={idx} style={[{ marginBottom: 12, position: "relative" }, openTypePicker === idx ? { zIndex: 1000 } : null]}>
                  <View style={[styles.modalFieldRow, { flexDirection: "row", gap: 8, alignItems: "center" }]}>
                    <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder={`Exercise ${idx + 1}`} placeholderTextColor="#999" value={f.name} onChangeText={(t) => {
                      const copy = [...exerciseForms]; copy[idx].name = t; setExerciseForms(copy)
                    }} />
                    <TouchableOpacity style={styles.typeDropdown} onPress={() => setOpenTypePicker(openTypePicker === idx ? null : idx)}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.typeDropdownText}>{f.type}</Text>
                        <Ionicons name={openTypePicker === idx ? "chevron-up" : "chevron-down"} size={16} color="#333" />
                      </View>
                    </TouchableOpacity>
                  </View>
                  {openTypePicker === idx && (
                    <View style={styles.typeMenu}>
                      {(["Lifting", "Cardio", "METCON"] as ExerciseForm["type"][]).map((opt) => (
                        <TouchableOpacity key={opt} style={styles.typeMenuItem} onPress={() => {
                          const copy = [...exerciseForms]; copy[idx].type = opt; setExerciseForms(copy); setOpenTypePicker(null)
                        }}>
                          <Text style={[styles.typeMenuText, { fontWeight: f.type === opt ? "700" : "500" }]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                {f.type === "Lifting" && (
                  <>
                    <View style={[styles.modalFieldRow, { flexDirection: "row", gap: 8 }]}>
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Sets" placeholderTextColor="#999" keyboardType="number-pad" value={f.sets} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].sets = t; setExerciseForms(copy) }} />
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Reps" placeholderTextColor="#999" keyboardType="number-pad" value={f.reps} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].reps = t; setExerciseForms(copy) }} />
                    </View>
                    <View style={[styles.modalFieldRow, { flexDirection: "row", gap: 8 }]}>
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Weight/%" placeholderTextColor="#999" value={f.weight} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].weight = t; setExerciseForms(copy) }} />
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Rest (Seconds)" placeholderTextColor="#999" keyboardType="number-pad" value={f.rest} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].rest = t; setExerciseForms(copy) }} />
                    </View>
                  </>
                )}
                {f.type === "Cardio" && (
                  <>
                    <View style={[styles.modalFieldRow, { flexDirection: "row", gap: 8 }]}>
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Time" placeholderTextColor="#999" value={f.time} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].time = t; setExerciseForms(copy) }} />
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Distance" placeholderTextColor="#999" value={f.distance} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].distance = t; setExerciseForms(copy) }} />
                    </View>
                    <View style={[styles.modalFieldRow, { flexDirection: "row", gap: 8 }]}>
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Pace" placeholderTextColor="#999" value={f.pace} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].pace = t; setExerciseForms(copy) }} />
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Rest (Seconds)" placeholderTextColor="#999" keyboardType="number-pad" value={f.rest} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].rest = t; setExerciseForms(copy) }} />
                    </View>
                  </>
                )}
                {f.type === "METCON" && (
                  <>
                    <View style={[styles.modalFieldRow, { flexDirection: "row", gap: 8 }]}>
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Time Cap" placeholderTextColor="#999" value={f.time_cap} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].time_cap = t; setExerciseForms(copy) }} />
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Sets" placeholderTextColor="#999" value={f.sets} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].sets = t; setExerciseForms(copy) }} />
                    </View>
                    <View style={[styles.modalFieldRow, { flexDirection: "row", gap: 8 }]}>
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Reps" placeholderTextColor="#999" value={f.reps} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].reps = t; setExerciseForms(copy) }} />
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Score Type" placeholderTextColor="#999" value={f.score_type} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].score_type = t; setExerciseForms(copy) }} />
                    </View>
                    <View style={[styles.modalFieldRow, { flexDirection: "row", gap: 8 }]}>
                      <TextInput style={[styles.modalInput, { flex: 1 }]} placeholder="Target" placeholderTextColor="#999" value={f.target} onChangeText={(t) => { const copy = [...exerciseForms]; copy[idx].target = t; setExerciseForms(copy) }} />
                      <Text style={{ flex: 1 }} />
                    </View>
                  </>
                )}
                <View style={styles.exerciseDivider} />
              </View>
              ))}
              {!editingExercise && (
                <TouchableOpacity style={styles.inlineAddButton} onPress={() => setExerciseForms([...exerciseForms, { name: "", type: "Lifting", sets: "", reps: "", weight: "", rest: "", time: "", distance: "", pace: "", time_cap: "", score_type: "", target: "" }]) }>
                  <Ionicons name="add" size={16} color="#4A90E2" />
                  <Text style={styles.inlineAddText}>Add another exercise</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalSaveButton} onPress={addExercise}>
              <Text style={styles.modalSaveButtonText}>{editingExercise ? "Update Exercise" : "Add Exercise"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* End Session Confirm Modal */}
      {endConfirmOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>End Workout?</Text>
              <TouchableOpacity onPress={() => setEndConfirmOpen(false)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: "#555", marginBottom: 16 }}>
              This will stop the timer and save your session data.
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={[styles.editButton, { flex: 1, alignItems: "center", justifyContent: "center" }]}
                onPress={() => setEndConfirmOpen(false)}
              >
                <Text style={styles.editButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { flex: 1, backgroundColor: "#EF4444" }]}
                onPress={async () => {
                  try {
                    // Mark completed exercises (based on sets done or guided completion)
                    const toCompleteIds = sessionExercises
                      .filter((ex) => (setCounts[ex.id] || 0) > 0 || (ex.plan_exercise_id && completedExercises[ex.plan_exercise_id]))
                      .map((ex) => ex.id)
                    if (toCompleteIds.length) {
                      try { await markExercisesCompleted(toCompleteIds) } catch {}
                    }
                    if (activeSessionId) {
                      try { await endSession(activeSessionId, workoutTime) } catch {}
                    }
                  } finally {
                    // Stop timers and reset UI state
                    setShowSummary(true)
                    setSummarySeconds(workoutTime)
                    setIsWorkoutActive(false)
                    setIsWorkoutPaused(false)
                    setWorkoutTime(0)
                    setActiveSessionId(null)
                    setSessionExercises([])
                    setSetCounts({})
                    setCompletedExercises({})
                    setExerciseOrder([])
                    setCurrentExerciseIdx(0)
                    setEndConfirmOpen(false)
                    // Clear any rest timers
                    try {
                      Object.keys(restTimers).forEach((k) => {
                        const t = (restTimers as any)[k]
                        if (t) clearInterval(t)
                        ;(restTimers as any)[k] = null
                      })
                    } catch {}
                  }
                }}
              >
                <Text style={styles.modalSaveButtonText}>End Workout</Text>
              </TouchableOpacity>
            </View>
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
  calendarArrowBox: {
    width: 32,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDaysContainer: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 8,
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
    marginBottom: 8,
  },
  planNameUnderTimer: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  noPlanSub: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 24,
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
    paddingRight: 16,
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
  exerciseRowLarger: {
    paddingVertical: 12,
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
  prActionButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  prActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
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
  modalScroll: {
    maxHeight: 420,
    marginBottom: 8,
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
  typeDropdown: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  typeDropdownText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  typeMenu: {
    position: "absolute",
    right: 0,
    top: 38,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 2000,
  },
  typeMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
  },
  typeMenuText: {
    color: "#333",
    fontSize: 14,
  },
  exerciseDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginTop: 8,
  },
})

export default BodyScreen
