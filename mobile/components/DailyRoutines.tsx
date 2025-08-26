import React, { useState, useMemo, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Easing, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { createTask, listTasksByDate, setTaskDone, deleteTask, updateTask, toDateKey } from "../lib/tasks"
import { listRoutines, createRoutine, getRoutineStats, toggleRoutineCompleted, listRoutineCompletionsByDate } from "../lib/routines"
import { supabase } from "../lib/supabase"

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

// Morning/Evening now come from DB (user_routines)

type DayTask = { title: string; time?: string }
type TasksByDay = Record<string, DayTask[]>

const DailyRoutines = () => {
  const initialIndex = (() => {
    const now = new Date()
    const monBased = now.getDay() === 0 ? 6 : now.getDay() - 1
    return monBased
  })()
  const [currentDayIndex, setCurrentDayIndex] = useState(initialIndex)
  const currentDay = daysOfWeek[currentDayIndex]

  // Day-specific tasks start empty; can be populated elsewhere in app later
  const [tasksByDay, setTasksByDay] = useState<TasksByDay>(() =>
    Object.fromEntries(daysOfWeek.map((d) => [d, []])) as TasksByDay
  )
  const currentTasks = useMemo(() => tasksByDay[currentDay] || [], [tasksByDay, currentDay])

  const [eveningChecks, setEveningChecks] = useState<boolean[]>([])
  const [morningChecks, setMorningChecks] = useState<boolean[]>([])
  type RoutineItem = { id: string; title: string; streak: number; percent: number; completed: boolean; anim: Animated.Value; trackWidth?: number }
  const [morningItems, setMorningItems] = useState<RoutineItem[]>([])
  const [eveningItems, setEveningItems] = useState<RoutineItem[]>([])
  const [addMorningOpen, setAddMorningOpen] = useState(false)
  const [addEveningOpen, setAddEveningOpen] = useState(false)
  const [newMorningTitle, setNewMorningTitle] = useState("")
  const [newEveningTitle, setNewEveningTitle] = useState("")
  const [savingMorning, setSavingMorning] = useState(false)
  const [savingEvening, setSavingEvening] = useState(false)
  const [tasksChecks, setTasksChecks] = useState<boolean[]>([])
  const [adding, setAdding] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskTime, setNewTaskTime] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editTime, setEditTime] = useState("")

  useEffect(() => {
    setMorningChecks(morningItems.map((i) => !!i.completed))
    setEveningChecks(eveningItems.map((i) => !!i.completed))
    setTasksChecks(Array(currentTasks.length).fill(false))
  }, [currentTasks, currentDay, morningItems, eveningItems])

  // Load routines and stats when session is ready (handles cold start)
  useEffect(() => {
    let unsub: any
    const loadRoutines = async () => {
      const [mRows, eRows] = await Promise.all([listRoutines('morning'), listRoutines('evening')])
      const mStats = await getRoutineStats(mRows.map(r => r.id))
      const eStats = await getRoutineStats(eRows.map(r => r.id))
      const mItems: RoutineItem[] = mRows.map((r) => {
        const s = mStats[r.id] || { streakDays: 0, weekPercent: 0, completedToday: false }
        return { id: r.id, title: r.title, streak: s.streakDays, percent: s.weekPercent, completed: s.completedToday, anim: new Animated.Value(s.weekPercent || 0) }
      })
      const eItems: RoutineItem[] = eRows.map((r) => {
        const s = eStats[r.id] || { streakDays: 0, weekPercent: 0, completedToday: false }
        return { id: r.id, title: r.title, streak: s.streakDays, percent: s.weekPercent, completed: s.completedToday, anim: new Animated.Value(s.weekPercent || 0) }
      })
      setMorningItems(mItems)
      setEveningItems(eItems)
    }
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        await loadRoutines()
      } else {
        const sub = supabase.auth.onAuthStateChange((_e, session) => {
          if (session?.user) {
            loadRoutines()
          }
        })
        unsub = sub.data.subscription
      }
    }
    init()
    return () => { if (unsub) unsub.unsubscribe?.() }
  }, [])

  // Clear checkboxes when switching the displayed day (progress remains)
  useEffect(() => {
    const loadDayCompletion = async () => {
      const base = new Date()
      const weekday = base.getDay() === 0 ? 6 : base.getDay() - 1
      const date = new Date(base)
      date.setDate(base.getDate() - weekday + currentDayIndex)
      const key = toDateKey(date)
      if (morningItems.length) {
        const map = await listRoutineCompletionsByDate(morningItems.map(i => i.id), key)
        setMorningItems(morningItems.map((i) => ({ ...i, completed: !!map[i.id] })))
      }
      if (eveningItems.length) {
        const map = await listRoutineCompletionsByDate(eveningItems.map(i => i.id), key)
        setEveningItems(eveningItems.map((i) => ({ ...i, completed: !!map[i.id] })))
      }
    }
    loadDayCompletion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDayIndex])

  // Load tasks for selected day from Supabase
  useEffect(() => {
    const load = async () => {
      const today = new Date()
      // Shift to the requested day in the current week based on currentDayIndex
      const mondayIndex = 0
      const diff = currentDayIndex - mondayIndex
      const date = new Date(today)
      const weekday = date.getDay() === 0 ? 6 : date.getDay() - 1
      date.setDate(date.getDate() - weekday + currentDayIndex)
      const key = toDateKey(date)
      const rows = await listTasksByDate(key)
      setTasksByDay((prev) => ({ ...prev, [currentDay]: rows.map(r => ({ title: r.title, time: r.time_text || undefined })) }))
    }
    load()
  }, [currentDayIndex])

  const prevDay = () => setCurrentDayIndex((i) => (i - 1 + daysOfWeek.length) % daysOfWeek.length)
  const nextDay = () => setCurrentDayIndex((i) => (i + 1) % daysOfWeek.length)

  const toggleCheck = async (index: number) => {
    const item = eveningItems[index]
    if (!item) return
    const newDone = !item.completed
    const base = new Date()
    const weekday = base.getDay() === 0 ? 6 : base.getDay() - 1
    const date = new Date(base)
    date.setDate(base.getDate() - weekday + currentDayIndex)
    const key = toDateKey(date)
    await toggleRoutineCompleted(item.id, newDone, key)
    const stats = await getRoutineStats([item.id], key)
    const s = stats[item.id]
    const next = eveningItems.slice()
    next[index] = { ...item, completed: newDone, percent: s?.weekPercent || 0, streak: s?.streakDays || 0 }
    setEveningItems(next)
    Animated.timing(item.anim, { toValue: (s?.weekPercent || 0), duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }
  const toggleMorning = async (index: number) => {
    const item = morningItems[index]
    if (!item) return
    const newDone = !item.completed
    const base = new Date()
    const weekday = base.getDay() === 0 ? 6 : base.getDay() - 1
    const date = new Date(base)
    date.setDate(base.getDate() - weekday + currentDayIndex)
    const key = toDateKey(date)
    await toggleRoutineCompleted(item.id, newDone, key)
    const stats = await getRoutineStats([item.id], key)
    const s = stats[item.id]
    const next = morningItems.slice()
    next[index] = { ...item, completed: newDone, percent: s?.weekPercent || 0, streak: s?.streakDays || 0 }
    setMorningItems(next)
    Animated.timing(item.anim, { toValue: (s?.weekPercent || 0), duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }
  const toggleTask = async (index: number) => {
    const next = tasksChecks.map((v, i) => (i === index ? !v : v))
    setTasksChecks(next)
    // Persist using setTaskDone; we need the task id, so we refetch for the day by date key and index match
    const base = new Date()
    const weekday = base.getDay() === 0 ? 6 : base.getDay() - 1
    const date = new Date(base)
    date.setDate(base.getDate() - weekday + currentDayIndex)
    const key = toDateKey(date)
    const rows = await listTasksByDate(key)
    const row = rows[index]
    if (row) {
      await setTaskDone(row.id, next[index])
    }
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
          <TouchableOpacity onPress={() => setAddMorningOpen((v) => !v)}>
            <Text style={styles.addIconBlue}>+</Text>
          </TouchableOpacity>
        </View>

        {addMorningOpen && (
          <View style={{ backgroundColor: '#F2F8FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#CFE1FF', marginBottom: 12 }}>
            <TextInput value={newMorningTitle} onChangeText={setNewMorningTitle} placeholder="Add morning routine" placeholderTextColor="#94a3b8" style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => { setAddMorningOpen(false); setNewMorningTitle('') }} style={{ paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 }}>
                <Text style={{ color: '#6b7280', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                const title = newMorningTitle.trim()
                if (!title || savingMorning) { return }
                setSavingMorning(true)
                try {
                  await createRoutine('morning', title)
                  const m = await listRoutines('morning')
                  const ms = await getRoutineStats(m.map(r => r.id))
                  const items = m.map(r => {
                    const s = ms[r.id] || { streakDays: 0, weekPercent: 0, completedToday: false }
                    return { id: r.id, title: r.title, streak: s.streakDays, percent: s.weekPercent, completed: s.completedToday, anim: new Animated.Value(s.weekPercent || 0) }
                  })
                  setMorningItems(items)
                  setAddMorningOpen(false); setNewMorningTitle('')
                } catch (e: any) {
                  Alert.alert('Unable to save', e?.message || 'Please try again')
                } finally { setSavingMorning(false) }
              }} style={{ backgroundColor: '#4A90E2', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, opacity: savingMorning ? 0.6 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{savingMorning ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {morningItems.length === 0 && (
          <Text style={{ color: '#6b7280', marginBottom: 8 }}>No morning routine set yet.</Text>
        )}
        {morningItems.map((item, idx) => (
          <LinearGradient
            key={item.id}
            colors={["#E6F0FF", "#F7FAFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCardMorning}
          >
            <View style={styles.habitTopRow}>
              <TouchableOpacity style={styles.checkboxTouchable} onPress={() => toggleMorning(idx)}>
                <View style={[styles.checkboxBoxBlue, item.completed && styles.checkboxBoxBlueChecked]}>
                  {item.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              <Text style={styles.habitLabel}>{item.title}</Text>
              <View style={[styles.streakBadge, { backgroundColor: "#E6F7F1" }]}>
                <Text style={[styles.streakText, { color: "#10B981" }]}>{item.streak} day streak</Text>
              </View>
            </View>
            <Text style={styles.progressLabel}>Weekly Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrackBlue}>
                <Animated.View style={[styles.progressFillBlue, { width: item.anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
              </View>
              <Text style={styles.progressPercentageBlue}>{Math.round(item.anim as any as number) || item.percent}%</Text>
            </View>
          </LinearGradient>
        ))}
      </View>

      {/* Today's Tasks */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          <TouchableOpacity onPress={() => setAdding(true)}>
            <Text style={styles.addIconGreen}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.subHeaderRow}>
          <Text style={styles.subHeaderLeft}>{currentDay}'s priorities</Text>
          <Text style={styles.subHeaderRight}>{tasksChecks.filter(Boolean).length} total tasks completed</Text>
        </View>

        {currentTasks.length === 0 && (
          <Text style={{ color: "#6b7280", marginBottom: 4 }}>No tasks set for {currentDay}.</Text>
        )}
        {currentTasks.map((task, idx) => (
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
                {editingIndex === idx ? (
                  <>
                    <TextInput value={editTitle} onChangeText={setEditTitle} placeholder="Task title" placeholderTextColor="#94a3b8" style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }} />
                    <TextInput value={editTime} onChangeText={setEditTime} placeholder="Time (optional)" placeholderTextColor="#94a3b8" style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginTop: 6 }} />
                  </>
                ) : (
                  <>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskTime}>{task.time ?? ""}</Text>
                  </>
                )}
              </View>
              {editingIndex === idx ? (
                <>
                  <TouchableOpacity onPress={async () => {
                    const base = new Date()
                    const weekday = base.getDay() === 0 ? 6 : base.getDay() - 1
                    const date = new Date(base)
                    date.setDate(base.getDate() - weekday + currentDayIndex)
                    const key = toDateKey(date)
                    const rows = await listTasksByDate(key)
                    const row = rows[idx]
                    if (row) {
                      await updateTask(row.id, { title: editTitle.trim(), timeText: editTime.trim() })
                      const updated = await listTasksByDate(key)
                      setTasksByDay((prev) => ({ ...prev, [currentDay]: updated.map(r => ({ title: r.title, time: r.time_text || undefined })) }))
                    }
                    setEditingIndex(null)
                  }} style={{ padding: 6, marginLeft: 8 }}>
                    <Ionicons name="save" size={18} color="#4A90E2" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setEditingIndex(null) }} style={{ padding: 6 }}>
                    <Ionicons name="close" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => { setEditingIndex(idx); setEditTitle(task.title); setEditTime(task.time || '') }} style={{ padding: 6, marginLeft: 8 }}>
                    <Ionicons name="create-outline" size={18} color="#4A90E2" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={async () => {
                    const base = new Date()
                    const weekday = base.getDay() === 0 ? 6 : base.getDay() - 1
                    const date = new Date(base)
                    date.setDate(base.getDate() - weekday + currentDayIndex)
                    const key = toDateKey(date)
                    const rows = await listTasksByDate(key)
                    const row = rows[idx]
                    if (row) {
                      await deleteTask(row.id)
                      const updated = await listTasksByDate(key)
                      setTasksByDay((prev) => ({ ...prev, [currentDay]: updated.map(r => ({ title: r.title, time: r.time_text || undefined })) }))
                      setTasksChecks((prev) => prev.filter((_, i) => i !== idx))
                    }
                  }} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </LinearGradient>
        ))}

        {adding && (
          <View style={{ backgroundColor: '#F2F8FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#CFE1FF', marginTop: 8 }}>
            <Text style={{ fontWeight: '700', color: '#1f2937', marginBottom: 8 }}>Add Task</Text>
            <TextInput value={newTaskTitle} onChangeText={setNewTaskTitle} placeholder="Task title" placeholderTextColor="#94a3b8" style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginBottom: 8 }} />
            <TextInput value={newTaskTime} onChangeText={setNewTaskTime} placeholder="Time (e.g., 6:00 PM) — optional" placeholderTextColor="#94a3b8" style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => { setAdding(false); setNewTaskTitle(''); setNewTaskTime('') }} style={{ paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 }}>
                <Text style={{ color: '#6b7280', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                if (!newTaskTitle.trim()) { setAdding(false); return }
                const base = new Date()
                const weekday = base.getDay() === 0 ? 6 : base.getDay() - 1
                const date = new Date(base)
                date.setDate(base.getDate() - weekday + currentDayIndex)
                const key = toDateKey(date)
                await createTask({ dateKey: key, title: newTaskTitle.trim(), timeText: newTaskTime.trim() || undefined })
                const rows = await listTasksByDate(key)
                setTasksByDay((prev) => ({ ...prev, [currentDay]: rows.map(r => ({ title: r.title, time: r.time_text || undefined })) }))
                setAdding(false); setNewTaskTitle(''); setNewTaskTime('')
              }} style={{ backgroundColor: '#4A90E2', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Evening Reflection */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Evening Reflection</Text>
          <TouchableOpacity onPress={() => setAddEveningOpen((v) => !v)}>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        </View>

        {addEveningOpen && (
          <View style={{ backgroundColor: '#F7F2FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E3D7FF', marginBottom: 12 }}>
            <TextInput value={newEveningTitle} onChangeText={setNewEveningTitle} placeholder="Add evening routine" placeholderTextColor="#94a3b8" style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => { setAddEveningOpen(false); setNewEveningTitle('') }} style={{ paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 }}>
                <Text style={{ color: '#6b7280', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                const title = newEveningTitle.trim()
                if (!title || savingEvening) { return }
                setSavingEvening(true)
                try {
                  await createRoutine('evening', title)
                  const e = await listRoutines('evening')
                  const es = await getRoutineStats(e.map(r => r.id))
                  const items = e.map(r => {
                    const s = es[r.id] || { streakDays: 0, weekPercent: 0, completedToday: false }
                    return { id: r.id, title: r.title, streak: s.streakDays, percent: s.weekPercent, completed: s.completedToday, anim: new Animated.Value(s.weekPercent || 0) }
                  })
                  setEveningItems(items)
                  setAddEveningOpen(false); setNewEveningTitle('')
                } catch (e: any) {
                  Alert.alert('Unable to save', e?.message || 'Please try again')
                } finally { setSavingEvening(false) }
              }} style={{ backgroundColor: '#8B5CF6', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, opacity: savingEvening ? 0.6 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{savingEvening ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {eveningItems.length === 0 && (
          <Text style={{ color: '#6b7280', marginBottom: 8 }}>No evening routine set yet.</Text>
        )}
        {eveningItems.map((item, idx) => (
          <LinearGradient
            key={item.id}
            colors={["#F3EEFF", "#FBF8FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCardEvening}
          >
            <View style={styles.habitTopRow}>
              <TouchableOpacity style={styles.checkboxTouchable} onPress={() => toggleCheck(idx)}>
                <View style={[styles.checkboxBox, item.completed && styles.checkboxBoxChecked]}> 
                  {item.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              <Text style={styles.habitLabel}>{item.title}</Text>
              <View style={[styles.streakBadge, { backgroundColor: "#EAF7EE" }]}>
                <Text style={[styles.streakText, { color: "#16A34A" }]}>{item.streak} day streak</Text>
              </View>
            </View>
            <Text style={styles.progressLabel}>Weekly Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrackAlt}>
                <Animated.View style={[styles.progressFillAlt, { width: item.anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
              </View>
              <Text style={styles.progressPercentage}>{Math.round(item.anim as any as number) || item.percent}%</Text>
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
    fontWeight: "700",
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
  addIconBlue: {
    fontSize: 24,
    color: "#3B82F6",
    fontWeight: "700",
  },
  addIconGreen: {
    fontSize: 24,
    color: "#22C55E",
    fontWeight: "700",
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
  taskTitle: { fontSize: 16, color: "#111827", fontWeight: "600" },
  taskTime: { fontSize: 12, color: "#6b7280", marginTop: 4 },
})

export default DailyRoutines
