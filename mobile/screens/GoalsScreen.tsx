import React, { useEffect, useMemo, useRef, useState } from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Image, Modal, Animated, Easing, LayoutChangeEvent, AppState, RefreshControl, Alert } from "react-native"
import TopHeader from "../components/TopHeader"
import { Ionicons } from "@expo/vector-icons"
import { Target, Plus, Trophy, ChevronDown, ChevronUp, CheckCircle, Trash2, CalendarDays } from "lucide-react-native"
import GoalWizardModal from "../components/GoalWizardModal"
import { createGoal, listGoals, GoalRecord, setGoalStepDone, listAchievements, AchievementRecord, completeGoal, deleteGoal, getCachedGoals, getCachedAchievements, createAchievement } from "../lib/goals"
import { format } from "date-fns"
import EditEntityModal from "../components/EditEntityModal"
import { apiCall } from "../lib/api-utils"

interface ScreenProps { onLogout?: () => void; onOpenProfile?: () => void }

const GoalsScreen: React.FC<ScreenProps> = ({ onLogout, onOpenProfile }) => {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [goals, setGoals] = useState<GoalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [achievements, setAchievements] = useState<AchievementRecord[]>([])
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [addAchOpen, setAddAchOpen] = useState(false)
  const [selectedAch, setSelectedAch] = useState<AchievementRecord | null>(null)
  const appState = useRef(AppState.currentState)

  // Animated progress state
  const trackWidths = useRef<Record<string, number>>({})
  const progressAnims = useRef<Record<string, Animated.Value>>({})
  const ensureAnim = (id: string) => {
    if (!progressAnims.current[id]) progressAnims.current[id] = new Animated.Value(0)
    return progressAnims.current[id]
  }

  const loadData = async (isRefresh: boolean = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const [g, a] = await apiCall(
        () => Promise.all([listGoals(), listAchievements()]),
        {
          timeoutMs: 15000,
          maxRetries: 2,
          timeoutMessage: 'Failed to load goals. Please check your connection and try again.'
        }
      )
      setGoals(g)
      setAchievements(a)
    } catch (e: any) {
      console.error("Failed to load goals/achievements", e)
      Alert.alert('Error', e.message || 'Failed to load goals. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Prime from cache first for instant paint
    const cachedGoals = getCachedGoals()
    const cachedAch = getCachedAchievements()
    if (cachedGoals) setGoals(cachedGoals)
    if (cachedAch) setAchievements(cachedAch)

    loadData()

    // Refresh when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[GoalsScreen] App came to foreground, refreshing...')
        loadData()
      }
      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [])

  const handleRefresh = () => {
    loadData(true)
  }

  // Animate widths when goals or measurements change
  useEffect(() => {
    goals.forEach((g) => {
      const pct = getProgressPct(g)
      const width = trackWidths.current[g.id]
      if (width != null) {
        const toValue = (pct / 100) * width
        const anim = ensureAnim(g.id)
        Animated.timing(anim, {
          toValue,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start()
      }
    })
  }, [goals])

  const getProgressPct = (g: GoalRecord): number => {
    const total = g.steps?.length || 0
    if (!total) return 0
    const done = g.steps!.filter((s) => s.done).length
    return Math.round((done / total) * 100)
  }

  const onTrackLayout = (goalId: string) => (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    const prev = trackWidths.current[goalId]
    trackWidths.current[goalId] = w
    if (prev !== w) {
      const g = goals.find((x) => x.id === goalId)
      if (g) {
        const pct = getProgressPct(g)
        const anim = ensureAnim(goalId)
        anim.setValue((pct / 100) * w)
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header rendered persistently in App */}

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4A90E2"
            colors={['#4A90E2']}
          />
        }
      >
        {/* Active Goals Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Target width={22} height={22} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Active Goals</Text>
          </View>
          <TouchableOpacity style={styles.setClearGoalButton} onPress={() => setWizardOpen(true)}>
            <Plus width={18} height={18} color="#fff" />
            <Text style={styles.setClearGoalButtonText}>Set a Clear Goal</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.emptyStateCard}><Text style={styles.emptyStateTitle}>Loading…</Text></View>
        ) : goals.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyStateIcon}>
              <View style={styles.iconBackground}>
                <Target width={40} height={40} color="#4A90E2" />
              </View>
            </View>

            <Text style={styles.emptyStateTitle}>No Active Goals</Text>
            <Text style={styles.emptyStateDescription}>Set your first goal to start tracking your progress and achievements.</Text>

            <TouchableOpacity style={styles.setFirstGoalButton} onPress={() => setWizardOpen(true)}>
              <Plus width={18} height={18} color="#fff" />
              <Text style={styles.setFirstGoalButtonText}>Set Your First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((g) => {
            const pct = getProgressPct(g)
            const isExpanded = !!expanded[g.id]
            const allDone = pct === 100
            const anim = ensureAnim(g.id)
            return (
              <View key={g.id} style={[styles.goalCard, g.color ? { borderLeftColor: g.color, borderLeftWidth: 4 } : null]}>
                <View style={styles.goalCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalTitle}>{g.title}</Text>
                    {!!g.description && <Text style={styles.goalDesc}>{g.description}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => setConfirmDelete(g.id)} style={{ padding: 6, marginRight: 6 }}>
                    <Trash2 width={18} height={18} color="#EF4444" />
                  </TouchableOpacity>
                  {allDone ? (
                    <View style={styles.completePill}>
                      <CheckCircle width={16} height={16} color="#10B981" />
                      <Text style={styles.completePillText}>Goal Complete</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity onPress={() => setExpanded((prev) => ({ ...prev, [g.id]: !isExpanded }))}>
                    {isExpanded ? <ChevronUp width={20} height={20} color="#6B7280" /> : <ChevronDown width={20} height={20} color="#6B7280" />}
                  </TouchableOpacity>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressRow}> 
                  <Text style={styles.progressLabel}>Goal Progress</Text>
                  <Text style={styles.progressPct}>{pct}%</Text>
                </View>
                <View style={styles.progressTrack} onLayout={onTrackLayout(g.id)}> 
                  <Animated.View style={[styles.progressFill, { width: anim }]} />
                </View>

                {isExpanded && (
                  <View style={{ marginTop: 12 }}>
                    {g.benefits?.length ? (
                      <View style={styles.goalListBlock}>
                        <Text style={[styles.goalListHeader, { color: "#2563EB" }]}>Benefits</Text>
                        {g.benefits.map((b, i) => (
                          <Text key={`b-${g.id}-${i}`} style={styles.goalBullet}>• {b}</Text>
                        ))}
                      </View>
                    ) : null}

                    {g.consequences?.length ? (
                      <View style={styles.goalListBlock}>
                        <Text style={[styles.goalListHeader, { color: "#DC2626" }]}>Consequences of not achieving</Text>
                        {g.consequences.map((c, i) => (
                          <Text key={`c-${g.id}-${i}`} style={styles.goalBullet}>• {c}</Text>
                        ))}
                      </View>
                    ) : null}

                    {g.who_it_helps?.length ? (
                      <View style={styles.goalListBlock}>
                        <Text style={[styles.goalListHeader, { color: "#059669" }]}>Who it helps</Text>
                        {g.who_it_helps.map((w, i) => (
                          <Text key={`w-${g.id}-${i}`} style={styles.goalBullet}>• {w}</Text>
                        ))}
                      </View>
                    ) : null}

                    {g.steps?.length ? (
                      <View style={styles.goalListBlock}>
                        <Text style={[styles.goalListHeader, { color: "#7C3AED" }]}>Action steps</Text>
                        {g.steps.map((s, i) => (
                          <TouchableOpacity
                            key={`s-${g.id}-${i}`}
                            style={styles.stepRow}
                            onPress={async () => {
                              try {
                                const updated = await setGoalStepDone(g.id, i, !s.done)
                                setGoals((prev) => prev.map((pg) => (pg.id === g.id ? updated : pg)))
                              } catch (e) {
                                console.warn("Failed to update step", e)
                              }
                            }}
                          >
                            <View style={[styles.checkbox, s.done && styles.checkboxChecked]} />
                            <Text style={[styles.stepText, s.done && styles.stepTextDone]}>{s.text}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}

                    {allDone && (
                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={async () => {
                          try {
                            await completeGoal(g)
                            setGoals((prev) => prev.filter((pg) => pg.id !== g.id))
                            const newAchievements = await listAchievements()
                            setAchievements(newAchievements)
                          } catch (e) {
                            console.warn("Failed to complete goal", e)
                          }
                        }}
                      >
                        <CheckCircle width={18} height={18} color="#fff" />
                        <Text style={styles.completeBtnText}>Mark as Goal Complete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )
          })
        )}

        {/* Achievement History Section */}
        <View style={styles.achievementSection}>
          <View style={styles.achievementHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Trophy width={22} height={22} color="#FFB800" />
              <Text style={styles.achievementTitle} numberOfLines={1}>Achievement History</Text>
            </View>
            <TouchableOpacity style={styles.addAchButton} onPress={() => setAddAchOpen(true)}>
              <Plus width={16} height={16} color="#fff" />
              <Text style={styles.addAchButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.achievementEmpty}>
            {achievements.map((a) => (
              <TouchableOpacity key={a.id} style={styles.achCard} activeOpacity={0.8} onPress={() => setSelectedAch(a)}>
                <View style={[styles.achAccent, { backgroundColor: a.color || "#10B981" }]} />
                <View style={styles.achCardBody}>
                  <View style={styles.achTitleRow}>
                    <CheckCircle width={18} height={18} color="#10B981" />
                    <Text style={styles.achCardTitle}>{a.title}</Text>
                  </View>
                  {!!a.completed_at && (
                    <Text style={styles.achCardMeta}>Completed {format(new Date(a.completed_at), "MMM d, yyyy")}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Delete confirmation modal */}
      <Modal transparent visible={!!confirmDelete} animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={styles.overlay}> 
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete goal?</Text>
            <Text style={styles.confirmSubtitle}>This action cannot be undone.</Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity style={[styles.confirmBtn, styles.confirmCancel]} onPress={() => setConfirmDelete(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmDanger]}
                onPress={async () => {
                  const id = confirmDelete!
                  setConfirmDelete(null)
                  try {
                    await deleteGoal(id)
                    setGoals((prev) => prev.filter((g) => g.id !== id))
                  } catch (e) {
                    console.warn("Failed to delete goal", e)
                  }
                }}
              >
                <Text style={styles.confirmDangerText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <GoalWizardModal
        visible={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreate={async (g) => {
          try {
            const created = await createGoal(g)
            setGoals((prev) => [created, ...prev])
          } catch (e) {
            console.warn("Failed to create goal", e)
          }
        }}
      />
      {/* View details modal */}
      <Modal transparent visible={!!selectedAch} animationType="fade" onRequestClose={() => setSelectedAch(null)}>
        <View style={styles.overlay}>
          <View style={styles.detailCard}>
            {selectedAch ? (
              <>
                <View style={[styles.detailHeader, { backgroundColor: selectedAch.color || "#4A90E2" }]}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <CheckCircle width={18} height={18} color="#fff" />
                    <Text style={styles.detailHeaderTitle} numberOfLines={2}>{selectedAch.title}</Text>
                  </View>
                </View>
                <View style={styles.detailSection}>
                  {!!selectedAch.description && (
                    <Text style={styles.detailDesc}>{selectedAch.description}</Text>
                  )}
                  {!!selectedAch.description && <View style={styles.detailDivider} />}
                  {!!selectedAch.completed_at && (
                    <View style={styles.detailCompletedRow}>
                      <CalendarDays width={16} height={16} color="#6B7280" />
                      <Text style={styles.detailMuted}>Completed</Text>
                      <Text style={styles.detailDateText}>{format(new Date(selectedAch.completed_at), "MMM d, yyyy")}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.detailFooter}> 
                  <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: selectedAch.color || "#4A90E2" }]} onPress={() => setSelectedAch(null)}>
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
      <EditEntityModal
        visible={addAchOpen}
        title="Add Past Achievement"
        accentColor="#10B981"
        fields={[
          { key: "title", label: "Title", placeholder: "What did you achieve?" },
          { key: "description", label: "Description", placeholder: "Optional details", multiline: true },
          { key: "date", label: "Date", placeholder: "Select date", type: "date" as any },
        ]}
        onClose={() => setAddAchOpen(false)}
        submitLabel="Save"
        onSubmit={async (vals) => {
          const dateStr = (vals.date || "").trim()
          const iso = dateStr ? new Date(dateStr + "T00:00:00").toISOString() : new Date().toISOString()
          try {
            const created = await createAchievement({
              title: vals.title || "Untitled Achievement",
              description: vals.description || null,
              completedAtIso: iso,
            })
            setAchievements((prev) => [created, ...prev])
            setAddAchOpen(false)
          } catch (e) {
            console.warn("Failed to create achievement", e)
          }
        }}
      />
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateIcon: { marginBottom: 24 },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateTitle: { fontSize: 20, fontWeight: "600", color: "#333", marginBottom: 12 },
  emptyStateDescription: { fontSize: 16, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  setFirstGoalButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#4A90E2", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  setFirstGoalButtonText: { color: "#fff", fontSize: 16, fontWeight: "500", marginLeft: 4 },

  goalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16 },
  goalCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 } as any,
  goalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  goalDesc: { fontSize: 14, color: "#4B5563", marginTop: 4 },

  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressLabel: { fontSize: 14, color: "#111827" },
  progressPct: { fontSize: 14, color: "#111827", fontWeight: "700" },
  progressTrack: { height: 8, backgroundColor: "#E5E7EB", borderRadius: 9999, overflow: "hidden", marginTop: 6 },
  progressFill: { height: "100%", backgroundColor: "#4A90E2" },

  goalListBlock: { marginTop: 10 },
  goalListHeader: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  goalBullet: { fontSize: 14, color: "#111827", marginBottom: 4 },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: "#D1D5DB", marginRight: 10 },
  checkboxChecked: { backgroundColor: "#4A90E2", borderColor: "#4A90E2" },
  stepText: { fontSize: 14, color: "#111827" },
  stepTextDone: { color: "#6B7280", textDecorationLine: "line-through" },

  completePill: { flexDirection: "row", alignItems: "center", backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, marginRight: 8 },
  completePillText: { color: "#065F46", fontWeight: "700", marginLeft: 4 },
  completeBtn: { marginTop: 10, backgroundColor: "#10B981", paddingVertical: 10, borderRadius: 8, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 } as any,
  completeBtnText: { color: "#fff", fontWeight: "700", marginLeft: 8 },

  achievementSection: { marginTop: 24, marginBottom: 100 },
  achievementHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  achievementTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginLeft: 8, textTransform: "capitalize" },
  achievementActions: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 12 },
  addAchButton: { marginLeft: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#10B981", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  addAchButtonText: { color: "#fff", fontSize: 13, fontWeight: "600", marginLeft: 6 },
  achievementEmpty: { minHeight: 80 },
  achCard: { flexDirection: "row", alignItems: "stretch", backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 10 },
  achAccent: { width: 6 },
  achCardBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  achTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 } as any,
  achCardTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginLeft: 6 },
  achCardMeta: { fontSize: 12, color: "#6B7280", marginTop: 4 },

  // Confirm modal styles
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 16 },
  confirmCard: { width: "100%", maxWidth: 360, backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  confirmSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 6 },
  confirmRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16, gap: 8 } as any,
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  confirmCancel: { backgroundColor: "#F3F4F6" },
  confirmCancelText: { color: "#111827", fontWeight: "600" },
  confirmDanger: { backgroundColor: "#EF4444" },
  confirmDangerText: { color: "#fff", fontWeight: "700" },
  // Details modal styles
  detailCard: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 14, padding: 20 },
  detailTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  detailFieldLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  detailFieldValue: { fontSize: 14, color: "#111827", marginTop: 4 },
  detailDesc: { fontSize: 15, color: "#111827", marginTop: 2, lineHeight: 24, fontWeight: "600" },
  detailHeader: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 },
  detailHeaderTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginLeft: 8, maxWidth: 320 },
  detailSection: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  detailCompletedRow: { flexDirection: "row", alignItems: "center", gap: 8 } as any,
  detailDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 14, borderRadius: 9999 },
  detailMuted: { fontSize: 13, color: "#6B7280", marginRight: 6 },
  detailDateText: { fontSize: 14, color: "#111827", fontWeight: "700" },
  detailFooter: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
})

export default GoalsScreen
