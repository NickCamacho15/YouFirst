"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import type React from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Image, Dimensions, Modal, TextInput, ActivityIndicator, Animated, Easing } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Shield, CalendarDays, Plus } from "lucide-react-native"
import TopHeader from "../components/TopHeader"
import { createChallenge, listChallenges, type ChallengeRow, setRuleCompleted, getRuleChecksForChallenge, deleteChallenge } from "../lib/challenges"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { addPersonalRule, deletePersonalRule, listPersonalRuleChecks, listPersonalRules, setPersonalRuleCompleted } from "../lib/personal-rules"

interface ScreenProps { onLogout?: () => void }

const DisciplinesScreen: React.FC<ScreenProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState("challenge")
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState<40 | 70 | 100>(40)
  const [ruleInput, setRuleInput] = useState("")
  const [rules, setRules] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [challenges, setChallenges] = useState<ChallengeRow[]>([])
  const [todayChecks, setTodayChecks] = useState<Record<string, Set<number>>>({})
  const [checksByDate, setChecksByDate] = useState<Record<string, Record<string, Set<number>>>>({})
  const [daysCompleted, setDaysCompleted] = useState<Record<string, number>>({})
  const [trackWidths, setTrackWidths] = useState<Record<string, number>>({})
  const progressAnims = useRef<Record<string, Animated.Value>>({})
  const [animNonce, setAnimNonce] = useState(0)
  const [showBanner, setShowBanner] = useState(true)

  const reloadData = async () => {
    setLoading(true)
    try {
      const data = await listChallenges()
      setChallenges(data)
      const todayIsoStr = new Date().toISOString().slice(0, 10)

      const todayMap: Record<string, Set<number>> = {}
      const dateToChecksMap: Record<string, Record<string, Set<number>>> = {}
      const completedDaysMap: Record<string, number> = {}

      await Promise.all(
        data.map(async (c) => {
          const endDate = new Date(c.start_date)
          endDate.setDate(endDate.getDate() + c.duration_days - 1)
          const toIso = new Date(Math.min(Date.now(), endDate.getTime()))
            .toISOString()
            .slice(0, 10)
          const checks = await getRuleChecksForChallenge(c.id, c.start_date, toIso)

          const perDate: Record<string, Set<number>> = {}
          for (const chk of checks) {
            if (!perDate[chk.log_date]) perDate[chk.log_date] = new Set<number>()
            if (chk.completed) perDate[chk.log_date].add(chk.rule_index)
          }
          dateToChecksMap[c.id] = perDate
          todayMap[c.id] = new Set((perDate[todayIsoStr] && Array.from(perDate[todayIsoStr])) || [])

          // Compute completed days
          const totalDays = Math.ceil((new Date(toIso).getTime() - new Date(c.start_date).getTime()) / (24 * 3600 * 1000)) + 1
          let completed = 0
          for (let i = 0; i < totalDays; i++) {
            const d = new Date(c.start_date)
            d.setDate(d.getDate() + i)
            const iso = d.toISOString().slice(0, 10)
            const set = perDate[iso]
            if (set && set.size >= c.rules.length && c.rules.length > 0) completed++
          }
          completedDaysMap[c.id] = completed
        })
      )

      setTodayChecks(todayMap)
      setChecksByDate(dateToChecksMap)
      setDaysCompleted(completedDaysMap)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadData()
  }, [])

  // Schedule a refresh at the next local midnight so day number advances and today's checkboxes reset
  const midnightTimer = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    function scheduleNextMidnight() {
      if (midnightTimer.current) clearTimeout(midnightTimer.current)
      const now = new Date()
      const next = new Date(now)
      next.setHours(24, 0, 0, 0)
      const delay = Math.max(1000, next.getTime() - now.getTime())
      midnightTimer.current = setTimeout(async () => {
        await reloadData()
        scheduleNextMidnight()
      }, delay)
    }
    scheduleNextMidnight()
    return () => {
      if (midnightTimer.current) clearTimeout(midnightTimer.current)
    }
  }, [])

  useEffect(() => {
    challenges.forEach((c) => {
      const width = trackWidths[c.id]
      if (!width) return
      const completed = daysCompleted[c.id] || 0
      const ratio = c.duration_days ? completed / c.duration_days : 0
      const target = width * ratio
      if (!progressAnims.current[c.id]) {
        progressAnims.current[c.id] = new Animated.Value(target)
        // Force a re-render so Animated.View picks up the new Animated.Value reference
        setAnimNonce((n) => n + 1)
      } else {
        Animated.timing(progressAnims.current[c.id], {
          toValue: target,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start()
      }
    })
  }, [challenges, daysCompleted, trackWidths])

  function addRule() {
    const trimmed = ruleInput.trim()
    if (!trimmed) return
    setRules((prev) => [...prev, trimmed])
    setRuleInput("")
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleCreate() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await createChallenge({
        title: title.trim(),
        description: description.trim() || undefined,
        durationDays: duration,
        rules,
      })
      setShowCreate(false)
      setTitle("")
      setDescription("")
      setDuration(40)
      setRules([])
      // reload list and stats
      const data = await listChallenges()
      setChallenges(data)
      // trigger initial stats load again
      const event = new Event("reload")
      // @ts-ignore
      if (global && (global as any).document?.dispatchEvent) {
        ;(global as any).document.dispatchEvent(event)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Create challenge failed", (e as any)?.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleRule(c: ChallengeRow, ruleIndex: number) {
    const today = new Date().toISOString().slice(0, 10)
    const setForChallenge = new Set(todayChecks[c.id] ? Array.from(todayChecks[c.id]!) : [])
    const willComplete = !setForChallenge.has(ruleIndex)
    try {
      await setRuleCompleted(c.id, ruleIndex, today, willComplete)
      if (willComplete) setForChallenge.add(ruleIndex)
      else setForChallenge.delete(ruleIndex)
      setTodayChecks((prev) => ({ ...prev, [c.id]: setForChallenge }))

      // Update per-date map and recompute completed day count
      setChecksByDate((prev) => {
        const perDate = { ...(prev[c.id] || {}) }
        const setForDate = new Set(perDate[today] ? Array.from(perDate[today]) : [])
        if (willComplete) setForDate.add(ruleIndex)
        else setForDate.delete(ruleIndex)
        perDate[today] = setForDate
        const newAll = { ...prev, [c.id]: perDate }
        // recompute daysCompleted
        const totalRules = c.rules.length
        let count = 0
        if (totalRules > 0) {
          Object.entries(perDate).forEach(([d, s]) => {
            const dateObj = new Date(d)
            const start = new Date(c.start_date)
            const todayObj = new Date()
            if (dateObj >= start && dateObj <= todayObj && s.size >= totalRules) count += 1
          })
        }
        setDaysCompleted((prevDays) => ({ ...prevDays, [c.id]: count }))
        return newAll
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Toggle rule failed", (e as any)?.message)
    }
  }


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
            {/* Info Banner */}
            {showBanner && (
              <View style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeIconContainer}>
                    <Ionicons name="trophy" size={24} color="#4A90E2" />
                  </View>
                  <View style={styles.challengeContent}>
                    <Text style={styles.challengeTitle}>40-100 Day Challenge</Text>
                    <Text style={styles.challengeSubtitle}>Transform through extended commitment</Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setShowBanner(false)}>
                    <Ionicons name="close" size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Start New Challenge Button */}
            <TouchableOpacity style={styles.startChallengeButton} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.startChallengeButtonText}>Start New Challenge</Text>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator style={{ marginTop: 24 }} />
            ) : challenges.length === 0 ? (
              // Empty State
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="trophy-outline" size={60} color="#ccc" />
                </View>
                <Text style={styles.emptyStateTitle}>No Active Challenges</Text>
                <Text style={styles.emptyStateDescription}>
                  Start a 40, 70, or 100-day challenge to push{"\n"}your limits and build unbreakable discipline.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 16, marginBottom: 24 }}>
                {challenges.map((c) => {
                  const start = new Date(c.start_date)
                  const today = new Date()
                  const dayNumber = Math.min(
                    c.duration_days,
                    Math.max(1, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                  )
                  const completedSet = todayChecks[c.id] || new Set<number>()
                  const completedDays = daysCompleted[c.id] || 0
                  const progressPct = Math.round((completedDays / c.duration_days) * 100)
                  const daysRemaining = Math.max(0, c.duration_days - completedDays)
                  return (
                    <View key={c.id} style={styles.challengeItem}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View>
                          <Text style={styles.challengeItemTitle}>{c.title}</Text>
                          {!!c.description && <Text style={styles.challengeItemSubtitle}>{c.description}</Text>}
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={styles.challengeItemDay}>Day {dayNumber}</Text>
                          <Text style={styles.challengeItemOf}> of {c.duration_days}</Text>
                          <TouchableOpacity onPress={async () => { try { await deleteChallenge(c.id); setChallenges((prev) => prev.filter((x) => x.id !== c.id)) } catch(e) { /* noop */ } }} style={{ paddingLeft: 10 }}>
                            <Ionicons name="trash" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {/* Progress */}
                      <View style={{ marginTop: 12 }}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <View
                          style={styles.progressBarTrack}
                          onLayout={(e) => {
                            const width = e.nativeEvent?.layout?.width || 0
                            setTrackWidths((prev) => (prev[c.id] === width ? prev : { ...prev, [c.id]: width }))
                          }}
                        >
                          <Animated.View style={[styles.progressBarFill, { width: progressAnims.current[c.id] || 0 }]} key={`bar-${c.id}-${animNonce}`} />
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={styles.progressMeta}>{completedDays} days completed</Text>
                          <Text style={styles.progressMeta}>{daysRemaining} days remaining</Text>
                        </View>
                      </View>

                      {/* Calendar */}
                      <View style={styles.calendarCard}>
                        <Text style={styles.calendarTitle}>Progress Calendar</Text>
                        <View style={styles.calendarGrid}>
                          {Array.from({ length: c.duration_days }, (_, i) => i + 1).map((n) => {
                            const isToday = n === dayNumber
                            const date = new Date(c.start_date)
                            date.setDate(date.getDate() + (n - 1))
                            const iso = date.toISOString().slice(0, 10)
                            const perDate = checksByDate[c.id] || {}
                            const done = c.rules.length > 0 && perDate[iso] && (perDate[iso] as Set<number>).size >= c.rules.length
                            return (
                              <View key={n} style={[styles.calendarCell, isToday && styles.calendarCellToday, done && styles.calendarCellDone]}>
                                <Text style={styles.calendarCellText}>{n}</Text>
                              </View>
                            )
                          })}
                        </View>
                      </View>

                      {/* Requirements */}
                      <View style={styles.requirementsCard}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <Text style={styles.requirementsTitle}>Today's Requirements</Text>
                          <Text style={styles.requirementsHint}>Complete all to win the day</Text>
                        </View>
                        {c.rules.length === 0 ? (
                          <Text style={styles.noRulesText}>No rules added.</Text>
                        ) : (
                          c.rules.map((r, idx) => (
                            <TouchableOpacity key={idx} style={styles.ruleRow} onPress={() => toggleRule(c, idx)}>
                              <View style={[styles.checkbox, completedSet.has(idx) && styles.checkboxChecked]}>
                                {completedSet.has(idx) && <Ionicons name="checkmark" size={14} color="#fff" />}
                              </View>
                              <Text style={styles.ruleText}>{r}</Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Create Challenge Modal */}
            <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
              <SafeAreaView style={[styles.container]}> 
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 20 }}>
                  <Text style={{ fontSize: 20, fontWeight: "700" }}>Create New Challenge</Text>
                  <TouchableOpacity onPress={() => setShowCreate(false)} style={{ padding: 8 }}>
                    <Ionicons name="close" size={22} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Challenge Title *</Text>
                  <TextInput value={title} onChangeText={setTitle} placeholder="e.g., No Social Media, No Fast Food" style={styles.input} />

                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput value={description} onChangeText={setDescription} placeholder="What this challenge means to you..." style={[styles.input, { height: 100, textAlignVertical: "top" }]} multiline />

                  <Text style={styles.inputLabel}>Duration (Days)</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                    {[40, 70, 100].map((d) => (
                      <TouchableOpacity key={d} onPress={() => setDuration(d as 40 | 70 | 100)} style={[styles.durationPill, duration === d && styles.durationPillActive]}>
                        <Text style={[styles.durationPillText, duration === d && styles.durationPillTextActive]}>{d} Days</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Challenge Rules</Text>
                  <View style={styles.inputRow}>
                    <TextInput value={ruleInput} onChangeText={setRuleInput} placeholder="Type a rule and press +" style={[styles.input, styles.ruleInput, { flex: 1, marginRight: 8 }]} onSubmitEditing={addRule} />
                    <TouchableOpacity style={styles.addRuleButton} onPress={addRule}>
                      <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {rules.map((r, idx) => (
                    <View key={`${r}-${idx}`} style={styles.ruleChipRow}>
                      <Text style={styles.ruleChipText}>{r}</Text>
                      <TouchableOpacity onPress={() => removeRule(idx)} style={{ paddingLeft: 8 }}>
                        <Ionicons name="close" size={16} color="#777" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity style={[styles.primaryButton, { marginTop: 12, opacity: saving || !title.trim() ? 0.7 : 1 }]} disabled={saving || !title.trim()} onPress={handleCreate}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Start Challenge</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.secondaryButton, { marginTop: 10 }]} onPress={() => setShowCreate(false)}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </ScrollView>
              </SafeAreaView>
            </Modal>
          </>
        ) : (
          <RulesTabConnected />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const RulesTabConnected = () => {
  type Rule = { id: string; text: string; createdAt: string }
  const [rules, setRules] = useState<Rule[]>([])
  const [checksByDate, setChecksByDate] = useState<Record<string, Record<string, boolean>>>({})
  const [today, setToday] = useState(new Date())
  const [showInput, setShowInput] = useState(false)
  const [newRule, setNewRule] = useState("")

  // Animations per rule
  const scaleAnims = useRef<Record<string, Animated.Value>>({})
  const bgAnims = useRef<Record<string, Animated.Value>>({})
  const checkAnims = useRef<Record<string, Animated.Value>>({})

  // Load from backend
  useEffect(() => {
    ;(async () => {
      try {
        const backendRules = await listPersonalRules()
        setRules(backendRules.map((r) => ({ id: r.id, text: r.text, createdAt: r.created_at })))
        const from = new Date(); from.setDate(from.getDate() - 30)
        const checks = await listPersonalRuleChecks(from.toISOString().slice(0,10), new Date().toISOString().slice(0,10))
        const map: Record<string, Record<string, boolean>> = {}
        checks.forEach((chk) => {
          if (!map[chk.log_date]) map[chk.log_date] = {}
          map[chk.log_date][chk.rule_id] = !!chk.completed
        })
        setChecksByDate(map)
      } catch (e) {
        console.warn("Failed to load personal rules", e)
      }
    })()
  }, [])

  // Roll to next day at local midnight
  useEffect(() => {
    const now = new Date()
    const next = new Date(now); next.setHours(24,0,0,0)
    const delay = Math.max(1000, next.getTime()-now.getTime())
    const t = setTimeout(() => setToday(new Date()), delay)
    return () => clearTimeout(t)
  }, [today])

  const todayIso = useMemo(() => today.toISOString().slice(0, 10), [today])
  const todayChecks = checksByDate[todayIso] || {}
  const numCheckedToday = Object.values(todayChecks).filter(Boolean).length
  const completionPct = rules.length ? Math.round((numCheckedToday / rules.length) * 100) : 0

  // Progress animation value
  const progressAnim = useRef(new Animated.Value((completionPct || 0) / 100))
  useEffect(() => {
    Animated.timing(progressAnim.current, { toValue: (completionPct || 0) / 100, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [completionPct])

  function dayIso(d: Date): string { return d.toISOString().slice(0, 10) }

  function percentForDate(d: Date): number {
    if (rules.length === 0) return 0
    const iso = dayIso(d)
    const checks = checksByDate[iso] || {}
    const completed = Object.values(checks).filter(Boolean).length
    return completed / rules.length
  }

  // Ensure animation values exist and match current day state
  useEffect(() => {
    rules.forEach((r) => {
      if (!scaleAnims.current[r.id]) scaleAnims.current[r.id] = new Animated.Value(1)
      const isChecked = !!todayChecks[r.id]
      if (!bgAnims.current[r.id]) bgAnims.current[r.id] = new Animated.Value(isChecked ? 1 : 0)
      else bgAnims.current[r.id].setValue(isChecked ? 1 : 0)
      if (!checkAnims.current[r.id]) checkAnims.current[r.id] = new Animated.Value(isChecked ? 1 : 0)
      else checkAnims.current[r.id].setValue(isChecked ? 1 : 0)
    })
  }, [rules, todayIso])

  async function handleAddRule() {
    const text = newRule.trim()
    if (!text) return
    try {
      const created = await addPersonalRule(text)
      setRules((prev) => [{ id: created.id, text: created.text, createdAt: created.created_at }, ...prev])
      setNewRule("")
      setShowInput(false)
    } catch (e) {
      console.warn("Failed to add rule", e)
    }
  }

  async function handleDeleteRule(ruleId: string) {
    try {
      await deletePersonalRule(ruleId)
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
      setChecksByDate((prev) => {
        const next: typeof prev = {}
        for (const [date, checks] of Object.entries(prev)) {
          const clone = { ...checks }; delete clone[ruleId]
          next[date] = clone
        }
        return next
      })
    } catch (e) {
      console.warn("Failed to delete rule", e)
    }
  }

  async function toggleRule(ruleId: string) {
    const iso = todayIso
    const currently = !!(checksByDate[iso] && checksByDate[iso][ruleId])
    try {
      await setPersonalRuleCompleted(ruleId, iso, !currently)
      setChecksByDate((prev) => ({ ...prev, [iso]: { ...(prev[iso] || {}), [ruleId]: !currently } }))
      const scale = scaleAnims.current[ruleId] || new Animated.Value(1)
      scaleAnims.current[ruleId] = scale
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.9, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start()
      const bg = bgAnims.current[ruleId] || new Animated.Value(!currently ? 1 : 0)
      bgAnims.current[ruleId] = bg
      Animated.timing(bg, { toValue: !currently ? 1 : 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
      const chk = checkAnims.current[ruleId] || new Animated.Value(!currently ? 1 : 0)
      checkAnims.current[ruleId] = chk
      Animated.timing(chk, { toValue: !currently ? 1 : 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
    } catch (e) {
      console.warn("Failed to toggle rule", e)
    }
  }

  const screenWidth = Dimensions.get("window").width
  const horizontalGutters = 40 + 32 + 6 * 8
  const cellSize = Math.max(36, Math.floor((screenWidth - horizontalGutters) / 7))

  const last30Days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (29 - i))
      return d
    })
  }, [today])

  function colorFromPercent(p: number): string {
    if (p <= 0) return "#f3f4f6"
    if (p < 0.25) return "#e57373"
    if (p < 0.5) return "#ffb74d"
    if (p < 0.75) return "#fff176"
    if (p < 1) return "#aed581"
    return "#81c784"
  }

  function isDayComplete(d: Date): boolean {
    const iso = d.toISOString().slice(0, 10)
    const checks = checksByDate[iso] || {}
    const completed = Object.values(checks).filter(Boolean).length
    return rules.length > 0 && completed >= rules.length
  }

  // UI copied from original RulesTab, with delete handler and add handler wired
  return (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <CalendarDays color="#4A90E2" width={20} height={20} />
            <Text style={styles.cardTitle}>Rules Adherence</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={styles.metricGroup}>
              <Text style={styles.metricPrimary}>{completionPct}%</Text>
              <Text style={styles.metricLabel}>TODAY</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricGroup}>
              <Text style={styles.metricPrimary}>0</Text>
              <Text style={styles.metricLabel}>AVG STREAK</Text>
            </View>
          </View>
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>LAST 30 DAYS</Text>
          <View style={styles.legendScale}>
            <Text style={styles.legendPercent}>0%</Text>
            <View style={styles.legendDots}>
              {["#e57373", "#ffb74d", "#fff176", "#aed581", "#81c784"].map((c, idx) => (
                <View key={idx} style={[styles.legendDot, { backgroundColor: c }]} />
              ))}
            </View>
            <Text style={styles.legendPercent}>100%</Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          {last30Days.map((date, idx) => {
            const isToday = date.toDateString() === today.toDateString()
            const pct = percentForDate(date)
            if (isToday) {
              const todayColor = progressAnim.current.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: ["#f3f4f6", "#e57373", "#ffb74d", "#aed581", "#81c784"],
              })
              const todayScale = progressAnim.current.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })
              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.gridCell,
                    { width: cellSize, height: cellSize, backgroundColor: todayColor as any, transform: [{ scale: todayScale as any }] },
                    styles.gridCellToday,
                  ]}
                >
                  <Text style={styles.gridCellText}>{date.getDate()}</Text>
                </Animated.View>
              )
            }
            const color = colorFromPercent(pct)
            const done = isDayComplete(date)
            return (
              <View key={idx} style={[styles.gridCell, { width: cellSize, height: cellSize, backgroundColor: done ? "#bbf7d0" : color }]}>
                <Text style={styles.gridCellText}>{date.getDate()}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {showInput ? (
        <View style={styles.addRow}>
          <TextInput
            value={newRule}
            onChangeText={setNewRule}
            placeholder="Enter your new rule..."
            style={[styles.input, { flex: 1, marginRight: 12 }]}
            onSubmitEditing={handleAddRule}
          />
          <TouchableOpacity style={[styles.addBtn]} onPress={handleAddRule}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cancelBtn]} onPress={() => { setShowInput(false); setNewRule("") }}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={() => setShowInput(true)}>
          <Plus color="#fff" width={18} height={18} />
          <Text style={styles.primaryButtonText}>Add New Rule</Text>
        </TouchableOpacity>
      )}

      {rules.length === 0 ? (
        <View style={styles.emptyCard}>
          <Shield color="#A0AEC0" width={56} height={56} />
          <Text style={styles.emptyTitle}>No Rules Yet</Text>
          <Text style={styles.emptySubtitle}>Create your first rule to start building personal discipline.</Text>
        </View>
      ) : (
        <View style={{ gap: 12, marginBottom: 24 }}>
          {rules.map((r) => {
            const checked = !!todayChecks[r.id]
            const bg = bgAnims.current[r.id]
            const cardBg = bg
              ? bg.interpolate({ inputRange: [0, 1], outputRange: ["#fff", "#bbf7d0"] })
              : "#fff"
            const scale = scaleAnims.current[r.id] || new Animated.Value(1)
            const chk = checkAnims.current[r.id] || new Animated.Value(checked ? 1 : 0)
            return (
              <Animated.View key={r.id} style={[styles.ruleCard, { backgroundColor: cardBg as any }] }>
                <TouchableOpacity style={styles.ruleRow} onPress={() => toggleRule(r.id)}>
                  <Animated.View style={[styles.checkbox, checked && styles.checkboxChecked, { transform: [{ scale }] }]}>
                    <Animated.View style={{ opacity: chk, transform: [{ scale: chk }] }}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </Animated.View>
                  </Animated.View>
                  <Text style={styles.ruleTextEmphasis}>{r.text}</Text>
                  <View style={{ width: 22 }} />
                </TouchableOpacity>
              </Animated.View>
            )
          })}
        </View>
      )}
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
  // Challenge list styles
  challengeItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  challengeItemTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  challengeItemSubtitle: {
    color: "#6b7280",
    marginTop: 2,
  },
  challengeItemDay: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "700",
  },
  challengeItemOf: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 2,
  },
  progressLabel: {
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: "#4A90E2",
  },
  progressMeta: {
    color: "#6b7280",
    fontSize: 12,
  },
  calendarCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  calendarTitle: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  calendarCell: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCellToday: {
    backgroundColor: "#dbeafe",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  calendarCellDone: {
    backgroundColor: "#bbf7d0",
    borderColor: "#22c55e",
  },
  calendarCellText: {
    color: "#111827",
    fontWeight: "600",
  },
  requirementsCard: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  requirementsTitle: {
    fontWeight: "700",
    color: "#111827",
  },
  requirementsHint: {
    color: "#6b7280",
    fontSize: 12,
  },
  winButton: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  winButtonEnabled: {
    backgroundColor: "#10b981",
  },
  winButtonDisabled: {
    backgroundColor: "#d1fae5",
  },
  winButtonText: {
    fontWeight: "700",
  },
  winButtonTextEnabled: {
    color: "#ffffff",
  },
  winButtonTextDisabled: {
    color: "#065f46",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  ruleText: {
    marginLeft: 10,
    color: "#1f2937",
  },
  ruleTextEmphasis: {
    marginLeft: 10,
    color: "#0f172a",
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
    flex: 1,
    fontSize: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#c7d2fe",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
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
  // Form styles
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ruleInput: {
    marginBottom: 0,
  },
  durationPill: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  durationPillActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  durationPillText: { color: "#374151", fontWeight: "600" },
  durationPillTextActive: { color: "#1d4ed8" },
  addRuleButton: {
    height: 44,
    width: 44,
    backgroundColor: "#4A90E2",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleChipRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  ruleChipText: { color: "#111827", fontWeight: "600", flex: 1 },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  secondaryButtonText: { color: "#111827", fontWeight: "700", fontSize: 16 },
  // Rules tab input and cards
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  addBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: "#4A90E2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  cancelBtnText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 16,
  },
  ruleCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  noRulesText: {
    color: "#6b7280",
  },
})

export default DisciplinesScreen
