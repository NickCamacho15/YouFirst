"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
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
  Modal,
  Vibration,
  KeyboardAvoidingView,
  Platform,
  AppState,
  RefreshControl,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import TopHeader from "../components/TopHeader"
import { getDailyWinStatus, subscribeWins } from "../lib/wins"
import { Brain } from "lucide-react-native"
import { saveReadingSession, getReadingStats, listReadingSessions, type ReadingSessionRow } from "../lib/reading"
import { listBooks, addBook, listInsights, addInsight, deleteBook, markBookCompleted, type UserBook, type ReadingInsight } from "../lib/books"
import { saveMeditationSession, getMeditationStats, getMilestonesWithStatus, awardEligibleMilestones, type MilestoneWithStatus } from "../lib/meditation"
import { preloadSounds, playIntervalChime, playFinalBell } from "../lib/sounds"
import { listTrackedApps, addTrackedApp, deleteTrackedApp, saveUsage, getUsageForRange, getMonthlyTotals, getStats, type TrackedApp } from "../lib/distraction"
import { requestNotificationsPermissionIfNeeded, scheduleMeditationNotifications, cancelScheduledNotifications } from "../lib/meditation-notifications"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { apiCall } from "../lib/api-utils"

type StatCardProps = {
    title: string
    value: string
    subtitle: string
    icon: string
    iconColor: string
}

const StatusPill = ({ completed }: { completed: boolean }) => (
  <View style={{ alignSelf: 'flex-end', marginBottom: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: completed ? '#DCFCE7' : '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}>
    <Ionicons name={completed ? (Platform.OS === 'ios' ? 'checkmark' : 'checkmark-circle') as any : (Platform.OS === 'ios' ? 'close' : 'close-circle') as any} size={16} color={completed ? '#22C55E' : '#EF4444'} />
    <Text style={{ marginLeft: 6, color: completed ? '#065F46' : '#6B7280', fontWeight: '600' }}>{completed ? 'Completed Today' : 'Not completed'}</Text>
  </View>
)

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, subtitle, icon, iconColor }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
))

type ReadingContentProps = {
  activeSubTab: string
  setActiveSubTab: (t: string) => void
  formatTime: (s: number) => string
  formatDuration: (s: number) => string
  sessionTime: number
  isSessionActive: boolean
  isPaused: boolean
  bookTitle: string
  setBookTitle: (t: string) => void
  onStartPauseResume: () => void
  onEndReflect: () => void
  totalSeconds: number
  sessionCount: number
  averageSeconds: number
  recentSessions: ReadingSessionRow[]
  openBookPicker: () => void
  activeBooksCount: number
  completedBooksCount: number
  readingCompletedToday: boolean
}

const ReadingContent: React.FC<ReadingContentProps> = React.memo(
  ({
    activeSubTab,
    setActiveSubTab,
    formatTime,
    formatDuration,
    sessionTime,
    isSessionActive,
    isPaused,
    bookTitle,
    setBookTitle,
    onStartPauseResume,
    onEndReflect,
    totalSeconds,
    sessionCount,
    averageSeconds,
    recentSessions,
    openBookPicker,
    activeBooksCount,
    completedBooksCount,
    readingCompletedToday,
  }) => (
    <>
      <View style={styles.statsGrid}>
        <StatCard title="Total Time" value={formatDuration(totalSeconds)} subtitle="All sessions" icon="time-outline" iconColor="#4A90E2" />
        <StatCard title="Sessions" value={String(sessionCount)} subtitle="Completed" icon="book-outline" iconColor="#10B981" />
        <StatCard title="Average Time" value={formatDuration(averageSeconds)} subtitle="Per session" icon="trending-up-outline" iconColor="#8B5CF6" />
        <StatCard title="Books Completed" value="0" subtitle="Finished" icon="checkmark-circle-outline" iconColor="#F59E0B" />
      </View>

      <View style={styles.sessionSection}>
        <Text style={styles.sessionTitle}>Reading Session</Text>
        <StatusPill completed={readingCompletedToday} />

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
          <Text style={styles.timerSubtitle}>Current session</Text>
        </View>

        <TextInput
          style={styles.bookTitleInput}
          placeholder="Book title (optional)..."
          placeholderTextColor="#999"
          value={bookTitle}
          editable={false}
          selectTextOnFocus={false}
          onPressIn={openBookPicker}
        />

        <TouchableOpacity
          style={[styles.sessionButton, isSessionActive ? styles.endSessionButton : styles.startSessionButton]}
          onPress={onStartPauseResume}
        >
          <Ionicons name={!isSessionActive ? "play" : isPaused ? "play" : "pause"} size={20} color="#fff" />
          <Text style={styles.sessionButtonText}>
            {!isSessionActive ? "Start Reading" : isPaused ? "Resume Session" : "Pause Session"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reflectButton} disabled={!isSessionActive} onPress={onEndReflect}>
          <Ionicons name="square-outline" size={20} color="#FF6B35" />
          <Text style={styles.reflectButtonText}>End & Reflect</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subTabContainer}>
        <TouchableOpacity style={[styles.subTab, activeSubTab === "list" && styles.activeSubTab]} onPress={() => setActiveSubTab("list")}>
          <Ionicons name="book-outline" size={20} color={activeSubTab === "list" ? "#333" : "#999"} />
          <Text style={[styles.subTabText, activeSubTab === "list" && styles.activeSubTabText]}>List</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.subTab, activeSubTab === "history" && styles.activeSubTab]} onPress={() => setActiveSubTab("history")}>
          <Ionicons name="time-outline" size={20} color={activeSubTab === "history" ? "#333" : "#999"} />
          <Text style={[styles.subTabText, activeSubTab === "history" && styles.activeSubTabText]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.subTab, activeSubTab === "insights" && styles.activeSubTab]} onPress={() => setActiveSubTab("insights")}>
          <Ionicons name="bulb-outline" size={20} color={activeSubTab === "insights" ? "#333" : "#999"} />
          <Text style={[styles.subTabText, activeSubTab === "insights" && styles.activeSubTabText]}>Insights</Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === "list" ? (
        <>
          <View style={styles.readingStatsContainer}>
            <View style={styles.readingStatCard}>
              <Ionicons name="reader-outline" size={20} color="#4A90E2" />
              <Text style={styles.readingStatValue}>{activeBooksCount}</Text>
              <Text style={styles.readingStatLabel}>Reading</Text>
            </View>
            <View style={styles.readingStatCard}>
              <Ionicons name="trophy-outline" size={20} color="#10B981" />
              <Text style={styles.readingStatValue}>{completedBooksCount}</Text>
              <Text style={styles.readingStatLabel}>Completed</Text>
            </View>
          </View>

          {/* removed duplicate Add Book button here; parent renders a single button */}
        </>
      ) : activeSubTab === "history" ? (
        <></>
      ) : (
        <></>
      )}
    </>
  )
)

// Meditation tab per design
const MeditationContent: React.FC<{
  medTotalSeconds: number
  medSessionCount: number
  medDayStreak: number
  milestones: MilestoneWithStatus[]
  prepSeconds: number
  intervalMinutes: number
  meditationMinutes: number
  onDecreasePrep: () => void
  onIncreasePrep: () => void
  onDecreaseInterval: () => void
  onIncreaseInterval: () => void
  onDecreaseMeditation: () => void
  onIncreaseMeditation: () => void
  onSetPrep: (v: number) => void
  onSetInterval: (v: number) => void
  onSetMeditation: (v: number) => void
  medActive: boolean
  medPhase: "idle" | "prep" | "meditating" | "complete"
  medPaused: boolean
  medElapsed: number
  nextChimeIn: number
  prepRemaining: number
  medRemaining: number
  onStartOrEnd: () => void
  onPauseResume: () => void
  onDoneComplete?: () => void
  meditationCompletedToday: boolean
}> = ({ medTotalSeconds, medSessionCount, medDayStreak, milestones, prepSeconds, intervalMinutes, meditationMinutes, onDecreasePrep, onIncreasePrep, onDecreaseInterval, onIncreaseInterval, onDecreaseMeditation, onIncreaseMeditation, onSetPrep, onSetInterval, onSetMeditation, medActive, medPhase, medPaused, medElapsed, nextChimeIn, prepRemaining, medRemaining, onStartOrEnd, onPauseResume, onDoneComplete, meditationCompletedToday }) => {
  const formatHrs = (s: number) => `${Math.floor(s / 3600)}h`
  const [prepWidth, setPrepWidth] = useState(1)
  const [intWidth, setIntWidth] = useState(1)
  const [medWidth, setMedWidth] = useState(1)
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
    return (
      <>
      {/* Total Time */}
        <View style={styles.totalTimeCard}>
          <View style={styles.totalTimeHeader}>
            <Ionicons name="calendar-outline" size={24} color="#8B5CF6" />
            <View style={styles.totalTimeContent}>
            <Text style={styles.totalTimeValue}>{formatHrs(medTotalSeconds)}</Text>
              <Text style={styles.totalTimeLabel}>Total Time</Text>
            </View>
          </View>
        </View>

        {/* Session Stats */}
        <View style={styles.sessionStatsContainer}>
          <View style={styles.sessionStatCard}>
          <Ionicons name="pulse-outline" size={20} color="#4A90E2" />
          <View style={styles.sessionStatText}>
            <Text style={styles.sessionStatValue}>{medSessionCount}</Text>
            <Text style={styles.sessionStatLabel}>Sessions</Text>
          </View>
          </View>
          <View style={styles.sessionStatCard}>
          <Ionicons name="flame-outline" size={20} color="#FF6B35" />
          <View style={styles.sessionStatText}>
            <Text style={styles.sessionStatValue}>{medDayStreak}</Text>
            <Text style={styles.sessionStatLabel}>Day Streak</Text>
          </View>
          </View>
        </View>

        {/* Meditation Timer */}
        <View style={styles.meditationTimerCard}>
          <Text style={styles.meditationTimerTitle}>Meditation Timer</Text>
          <StatusPill completed={meditationCompletedToday} />

          {medPhase === "prep" || medPhase === "meditating" || medPhase === "complete" ? (
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              {medPhase === "prep" ? (
                <>
                  <Text style={styles.overlayTitle}>Get Ready</Text>
                  <Text style={styles.overlayTimer}>{prepRemaining}s</Text>
                  <View style={styles.overlayControls}>
                    <TouchableOpacity onPress={onStartOrEnd} style={styles.overlayEndBtn}><Text style={styles.overlayEndText}>End Session</Text></TouchableOpacity>
                  </View>
                </>
              ) : medPhase === "meditating" ? (
                <>
                  <Text style={styles.overlayTitle}>Meditating</Text>
                  <Text style={styles.overlayTimer}>{Math.floor(medElapsed/60).toString().padStart(2,'0')+":"+(medElapsed%60).toString().padStart(2,'0')}</Text>
                  <Text style={styles.overlaySubText}>Next chime in: {Math.max(0, Math.floor(nextChimeIn/60))}m{nextChimeIn%60===0?"":` ${nextChimeIn%60}s`}</Text>
                  <View style={styles.overlayControls}>
                    <TouchableOpacity onPress={onPauseResume} style={styles.overlayPauseBtn}><Text style={styles.overlayPauseText}>{medPaused?"Resume":"Pause"}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={onStartOrEnd} style={styles.overlayEndBtn}><Text style={styles.overlayEndText}>End Session</Text></TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.overlayTitle}>Session Complete</Text>
                  <Text style={styles.overlayTimer}>{Math.floor(medElapsed/60).toString().padStart(2,'0')+":"+(medElapsed%60).toString().padStart(2,'0')}</Text>
                  <View style={styles.overlayControls}>
                    <TouchableOpacity onPress={onDoneComplete} style={styles.overlayPauseBtn}><Text style={styles.overlayPauseText}>Done</Text></TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ) : (
          <>
          {/* Preparation Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: "#4A90E2" }]}>Preparation</Text>
              <Text style={styles.sliderValue}>{medActive ? `${prepRemaining}s` : `${prepSeconds}s`}</Text>
            </View>
            <View
              style={styles.sliderTrack}
              onLayout={(e)=> setPrepWidth(e.nativeEvent.layout.width || 1)}
              onStartShouldSetResponder={() => !medActive}
              onMoveShouldSetResponder={() => !medActive}
              onResponderTerminationRequest={() => false}
              onResponderMove={(e)=>{
                if (medActive) return
                const x = clamp(e.nativeEvent.locationX, 0, prepWidth)
                const val = Math.round((x / prepWidth) * 60)
                onSetPrep(val)
              }}
              onResponderGrant={(e)=>{
                if (medActive) return
                const x = clamp(e.nativeEvent.locationX, 0, prepWidth)
                const val = Math.round((x / prepWidth) * 60)
                onSetPrep(val)
              }}
            >
            <View style={[styles.sliderProgress, { width: `${Math.min(100, Math.max(0, (prepSeconds / 60) * 100))}%`, backgroundColor: "#4A90E2" }]} />
            <View style={[styles.sliderThumb, { left: `${Math.min(100, Math.max(0, (prepSeconds / 60) * 100))}%`, backgroundColor: "#4A90E2" }]} />
            </View>
            {!medActive && (
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 8 }}>
                <TouchableOpacity onPress={onDecreasePrep} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }}><Text>-</Text></TouchableOpacity>
                <TouchableOpacity onPress={onIncreasePrep} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }}><Text>+</Text></TouchableOpacity>
              </View>
            )}
          </View>

          {/* Interval Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: "#10B981" }]}>Interval</Text>
            <Text style={styles.sliderValue}>{intervalMinutes}m</Text>
            </View>
            <View
              style={styles.sliderTrack}
              onLayout={(e)=> setIntWidth(e.nativeEvent.layout.width || 1)}
              onStartShouldSetResponder={() => !medActive}
              onMoveShouldSetResponder={() => !medActive}
              onResponderTerminationRequest={() => false}
              onResponderMove={(e)=>{
                if (medActive) return
                const x = clamp(e.nativeEvent.locationX, 0, intWidth)
                const val = Math.max(1, Math.round((x / intWidth) * 60))
                onSetInterval(val)
              }}
              onResponderGrant={(e)=>{
                if (medActive) return
                const x = clamp(e.nativeEvent.locationX, 0, intWidth)
                const val = Math.max(1, Math.round((x / intWidth) * 60))
                onSetInterval(val)
              }}
            >
            <View style={[styles.sliderProgress, { width: `${Math.min(100, Math.max(0, (intervalMinutes / 60) * 100))}%`, backgroundColor: "#10B981" }]} />
            <View style={[styles.sliderThumb, { left: `${Math.min(100, Math.max(0, (intervalMinutes / 60) * 100))}%`, backgroundColor: "#10B981" }]} />
            </View>
            {!medActive && (
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 8 }}>
                <TouchableOpacity onPress={onDecreaseInterval} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }}><Text>-</Text></TouchableOpacity>
                <TouchableOpacity onPress={onIncreaseInterval} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }}><Text>+</Text></TouchableOpacity>
              </View>
            )}
          </View>

          {/* Meditation Time Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: "#FF6B35" }]}>Meditation Time</Text>
              <Text style={styles.sliderValue}>{medActive ? `${Math.ceil(medRemaining/60)}m` : `${meditationMinutes}m`}</Text>
            </View>
            <View
              style={styles.sliderTrack}
              onLayout={(e)=> setMedWidth(e.nativeEvent.layout.width || 1)}
              onStartShouldSetResponder={() => !medActive}
              onMoveShouldSetResponder={() => !medActive}
              onResponderTerminationRequest={() => false}
              onResponderMove={(e)=>{
                if (medActive) return
                const x = clamp(e.nativeEvent.locationX, 0, medWidth)
                const val = Math.max(1, Math.round((x / medWidth) * 60))
                onSetMeditation(val)
              }}
              onResponderGrant={(e)=>{
                if (medActive) return
                const x = clamp(e.nativeEvent.locationX, 0, medWidth)
                const val = Math.max(1, Math.round((x / medWidth) * 60))
                onSetMeditation(val)
              }}
            >
            <View style={[styles.sliderProgress, { width: `${Math.min(100, Math.max(0, (meditationMinutes / 60) * 100))}%`, backgroundColor: "#FF6B35" }]} />
            <View style={[styles.sliderThumb, { left: `${Math.min(100, Math.max(0, (meditationMinutes / 60) * 100))}%`, backgroundColor: "#FF6B35" }]} />
            </View>
            {!medActive && (
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 8 }}>
                <TouchableOpacity onPress={onDecreaseMeditation} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }}><Text>-</Text></TouchableOpacity>
                <TouchableOpacity onPress={onIncreaseMeditation} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }}><Text>+</Text></TouchableOpacity>
              </View>
            )}
          </View>

        {/* Start Session */}
        <TouchableOpacity style={styles.startMeditationButton} onPress={onStartOrEnd}>
            <Text style={styles.startMeditationButtonText}>Start Session</Text>
          </TouchableOpacity>
          </>
          )}
        </View>

      {/* Milestones */}
        <View style={styles.milestonesSection}>
          <View style={styles.milestonesHeader}>
            <Ionicons name="trophy-outline" size={24} color="#FFB800" />
            <Text style={styles.milestonesTitle}>Milestones</Text>
          </View>
          <View style={styles.milestonesGrid}>
          {milestones.map((m)=> {
            const achieved = !!m.achieved
            return (
              <View key={m.code} style={[styles.milestoneCard, achieved && { backgroundColor: "#E8F7F0", borderColor: "#34D399" }] }>
                <Ionicons name={achieved ? "star" : "star-outline"} size={32} color={achieved ? "#FFB800" : "#ccc"} />
                <Text style={[styles.milestoneTitle, { color: achieved ? "#111827" : "#ccc" }]}>{m.title}</Text>
                <Text style={[styles.milestoneDescription, { color: achieved ? "#6b7280" : "#ccc" }]}>{achieved ? (m.awardedAt ? new Date(m.awardedAt).toLocaleDateString() : "Unlocked") : (m.description || "")}</Text>
              </View>
            )
          })}
          </View>
        </View>
      </>
    )
  }

interface ScreenProps { onLogout?: () => void; onOpenProfile?: () => void }

const MindScreen: React.FC<ScreenProps> = ({ onLogout, onOpenProfile }) => {
  const [activeTab, setActiveTab] = useState("reading")
  const [activeSubTab, setActiveSubTab] = useState("list")
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null)
  const [bookTitle, setBookTitle] = useState("")
  const [isReflectOpen, setIsReflectOpen] = useState(false)
  const [reflectionText, setReflectionText] = useState("")
  const [pagesRead, setPagesRead] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [averageSeconds, setAverageSeconds] = useState(0)
  const [recentSessions, setRecentSessions] = useState<ReadingSessionRow[]>([])
  const [books, setBooks] = useState<UserBook[]>([])
  const [insights, setInsights] = useState<ReadingInsight[]>([])
  const [addBookOpen, setAddBookOpen] = useState(false)
  const [newBookTitle, setNewBookTitle] = useState("")
  const [newBookAuthor, setNewBookAuthor] = useState("")
  const [newBookPages, setNewBookPages] = useState("")
  const [addInsightOpen, setAddInsightOpen] = useState(false)
  const [newInsightText, setNewInsightText] = useState("")
  const [selectedBookIdForInsight, setSelectedBookIdForInsight] = useState<string | undefined>(undefined)
  const [bookPickerOpen, setBookPickerOpen] = useState(false)
  const [pendingDeleteBookId, setPendingDeleteBookId] = useState<string | null>(null)
  const [pendingCompleteBookId, setPendingCompleteBookId] = useState<string | null>(null)
  // Meditation state
  const [prepSeconds, setPrepSeconds] = useState(30)
  const [intervalMinutes, setIntervalMinutes] = useState(5)
  const [meditationMinutes, setMeditationMinutes] = useState(15)
  const [medActive, setMedActive] = useState(false)
  const [prepRemaining, setPrepRemaining] = useState(0)
  const [medRemaining, setMedRemaining] = useState(0)
  const [medTotalSeconds, setMedTotalSeconds] = useState(0)
  const [medSessionCount, setMedSessionCount] = useState(0)
  const [medDayStreak, setMedDayStreak] = useState(0)
  const [milestones, setMilestones] = useState<MilestoneWithStatus[]>([])
  const [readingCompletedToday, setReadingCompletedToday] = useState(false)
  const [meditationCompletedToday, setMeditationCompletedToday] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const appState = useRef(AppState.currentState)
  // Meditation session UI state
  const [medPhase, setMedPhase] = useState<"idle" | "prep" | "meditating" | "complete">("idle")
  const [medPaused, setMedPaused] = useState(false)
  const [medElapsed, setMedElapsed] = useState(0) // seconds
  const [nextChimeIn, setNextChimeIn] = useState(0) // seconds
  const [medStartAt, setMedStartAt] = useState<Date | null>(null)
  const medLoopRef = useRef<NodeJS.Timeout | null>(null)
  const medNotifIdsRef = useRef<string[]>([])

  // Persist meditation slider settings across app restarts
  useEffect(() => {
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem("youfirst_meditation_settings_v1")
        if (raw) {
          const obj = JSON.parse(raw)
          if (typeof obj.prepSeconds === "number") setPrepSeconds(Math.max(0, Math.min(60, Math.floor(obj.prepSeconds))))
          if (typeof obj.intervalMinutes === "number") setIntervalMinutes(Math.max(1, Math.min(60, Math.floor(obj.intervalMinutes))))
          if (typeof obj.meditationMinutes === "number") setMeditationMinutes(Math.max(1, Math.min(60, Math.floor(obj.meditationMinutes))))
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const payload = { prepSeconds, intervalMinutes, meditationMinutes }
        await AsyncStorage.setItem("youfirst_meditation_settings_v1", JSON.stringify(payload))
      } catch {}
    })()
  }, [prepSeconds, intervalMinutes, meditationMinutes])

  // Persist a meditation session and refresh stats + milestones
  const persistMeditationSession = async (opts: { startedAt: Date; durationSeconds: number }) => {
    try {
      await saveMeditationSession({
        startedAt: opts.startedAt.toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: Math.max(0, Math.floor(opts.durationSeconds || 0)),
        prepSeconds,
        intervalMinutes,
        meditationMinutes,
      })
      const m = await getMeditationStats()
      setMedTotalSeconds(m.totalSeconds)
      setMedSessionCount(m.sessionCount)
      setMedDayStreak(m.dayStreak)
      setMilestones(await getMilestonesWithStatus(m))
      await awardEligibleMilestones(m)
    } catch {}
  }

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSessionActive && !isPaused) {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSessionActive, isPaused])

  // Load stats and recent sessions
  const loadData = async (isRefresh: boolean = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }
    try {
      const [stats, sessions, booksList, insightsList, medStats, status] = await apiCall(
        () => Promise.all([
          getReadingStats(),
          listReadingSessions(10),
          listBooks(),
          listInsights(20),
          getMeditationStats(),
          getDailyWinStatus(),
        ]),
        {
          timeoutMs: 20000,
          maxRetries: 2,
          timeoutMessage: 'Failed to load mind data. Please check your connection and try again.'
        }
      )
      
      setTotalSeconds(stats.totalSeconds)
      setSessionCount(stats.sessionCount)
      setAverageSeconds(stats.averageSeconds)
      setRecentSessions(sessions)
      setBooks(booksList)
      setInsights(insightsList)
      await preloadSounds()
      setMedTotalSeconds(medStats.totalSeconds)
      setMedSessionCount(medStats.sessionCount)
      setMedDayStreak(medStats.dayStreak)
      setMilestones(await getMilestonesWithStatus(medStats))
      setReadingCompletedToday(!!status.reading)
      setMeditationCompletedToday(!!status.prayerMeditation)
    } catch (error: any) {
      console.error('Failed to load mind data:', error)
      Alert.alert('Error', error.message || 'Failed to load data. Please try again.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
    // Prepare notifications permissions proactively
    requestNotificationsPermissionIfNeeded().catch(() => {})

    // Refresh when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[MindScreen] App came to foreground, refreshing...')
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

  // live wins subscription to keep pills in sync
  useEffect(() => {
    const unsub = subscribeWins(async () => {
      try {
        const status = await getDailyWinStatus()
        setReadingCompletedToday(!!status.reading)
        setMeditationCompletedToday(!!status.prayerMeditation)
      } catch {}
    })
    return () => { if (unsub) unsub() }
  }, [])

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

  const onStartPauseResume = () => {
    if (!isSessionActive) {
      setIsSessionActive(true)
      setIsPaused(false)
      setSessionTime(0)
      setSessionStartedAt(new Date())
      return
    }
    setIsPaused((p) => !p)
  }

  const onEndReflect = () => {
    setIsSessionActive(false)
    setIsPaused(false)
    setIsReflectOpen(true)
    }

  // Meditation phase loop
  useEffect(() => {
    if (activeTab !== "meditation") return
    if (medPhase === "idle" || medPhase === "complete") { if (medLoopRef.current) { clearInterval(medLoopRef.current); medLoopRef.current = null } return }
    if (medPaused) { if (medLoopRef.current) { clearInterval(medLoopRef.current); medLoopRef.current = null } return }

    // ensure a single ticking interval
    if (medLoopRef.current) clearInterval(medLoopRef.current)
    medLoopRef.current = setInterval(() => {
      if (medPhase === "prep") {
        setPrepRemaining((prev) => {
          const next = Math.max(0, prev - 1)
          if (next === 0) {
            Vibration.vibrate(100)
            setMedPhase("meditating")
            setMedElapsed(0)
            setNextChimeIn(Math.max(1, intervalMinutes * 60))
          }
          return next
        })
      } else if (medPhase === "meditating") {
        setMedElapsed((e) => e + 1)
        setMedRemaining((t) => Math.max(0, t - 1))
        setNextChimeIn((c) => {
          const next = Math.max(0, c - 1)
          if (next === 0) {
            Vibration.vibrate(200)
            playIntervalChime()
            return Math.max(1, intervalMinutes * 60)
          }
          return next
        })
        if (medRemaining <= 1) {
          Vibration.vibrate([0, 300, 150, 300])
          playFinalBell()
          setMedPhase("complete")
          setMedActive(false)
          // Clear any remaining scheduled notifications (final bell already played)
          ;(async () => {
            try {
              if (medNotifIdsRef.current.length) {
                await cancelScheduledNotifications(medNotifIdsRef.current)
                medNotifIdsRef.current = []
              }
            } catch {}
          })()
          // save (natural completion uses planned duration)
          const start = medStartAt || new Date()
          const total = meditationMinutes * 60
          ;(async () => { await persistMeditationSession({ startedAt: start, durationSeconds: total }) })()
        }
      }
    }, 1000)
    return () => { if (medLoopRef.current) { clearInterval(medLoopRef.current); medLoopRef.current = null } }
  }, [medPhase, medPaused, activeTab, intervalMinutes, meditationMinutes, medRemaining])

    return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      {/* Header rendered persistently in App */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4A90E2"
            colors={['#4A90E2']}
          />
        }
      >
        {/* Mind Training Section */}
        <View style={styles.mindTrainingSection}>
          <View style={styles.mindTrainingHeader}>
            <Brain stroke="#4A90E2" width={24} height={24} />
            <Text style={styles.mindTrainingTitle}>Mind Training</Text>
            </View>
          <Text style={styles.mindTrainingSubtitle}>Optimize your mental well-being through reading, meditation, and mindful technology use</Text>
          </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === "reading" && styles.activeTab]} onPress={() => setActiveTab("reading")}>
            <Ionicons name="book-outline" size={24} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "meditation" && styles.activeTab]} onPress={() => setActiveTab("meditation")}>
            <Brain stroke="#8B5CF6" width={24} height={24} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "distraction" && styles.activeTab]} onPress={() => setActiveTab("distraction")}>
            <Ionicons name="phone-portrait-outline" size={24} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === "reading" ? (
          <ReadingContent
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab}
            formatTime={formatTime}
            formatDuration={formatDuration}
            sessionTime={sessionTime}
            isSessionActive={isSessionActive}
            isPaused={isPaused}
            bookTitle={bookTitle}
            setBookTitle={setBookTitle}
            onStartPauseResume={onStartPauseResume}
            onEndReflect={onEndReflect}
            totalSeconds={totalSeconds}
            sessionCount={sessionCount}
            averageSeconds={averageSeconds}
            recentSessions={recentSessions}
            openBookPicker={() => setBookPickerOpen(true)}
            activeBooksCount={books.filter((b) => !b.completed_on).length}
            completedBooksCount={books.filter((b) => !!b.completed_on).length}
            readingCompletedToday={readingCompletedToday}
          />
        ) : activeTab === "meditation" ? (
          <>
          <MeditationContent
            medTotalSeconds={medTotalSeconds}
            medSessionCount={medSessionCount}
            medDayStreak={medDayStreak}
            milestones={milestones}
            prepSeconds={prepSeconds}
            intervalMinutes={intervalMinutes}
            meditationMinutes={meditationMinutes}
            onDecreasePrep={() => setPrepSeconds((v) => Math.max(0, v - 5))}
            onIncreasePrep={() => setPrepSeconds((v) => Math.min(60, v + 5))}
            onDecreaseInterval={() => setIntervalMinutes((v) => Math.max(1, v - 1))}
            onIncreaseInterval={() => setIntervalMinutes((v) => Math.min(60, v + 1))}
            onDecreaseMeditation={() => setMeditationMinutes((v) => Math.max(1, v - 1))}
            onIncreaseMeditation={() => setMeditationMinutes((v) => Math.min(60, v + 1))}
            onSetPrep={(v)=> setPrepSeconds(Math.max(0, Math.min(60, v)))}
            onSetInterval={(v)=> setIntervalMinutes(Math.max(1, Math.min(60, v)))}
            onSetMeditation={(v)=> setMeditationMinutes(Math.max(1, Math.min(60, v)))}
            medActive={medPhase === "prep" || medPhase === "meditating"}
            medPhase={medPhase}
            medPaused={medPaused}
            medElapsed={medElapsed}
            nextChimeIn={nextChimeIn}
            prepRemaining={prepRemaining}
            medRemaining={medRemaining}
            onStartOrEnd={() => {
              if (medPhase === "idle" || medPhase === "complete") {
                // Start a new session
                setMedStartAt(new Date())
                setMedPaused(false)
                setMedElapsed(0)
                setNextChimeIn(Math.max(1, intervalMinutes * 60))
                setPrepRemaining(Math.max(0, prepSeconds))
                setMedRemaining(meditationMinutes * 60)
                setMedActive(true)
                setMedPhase(prepSeconds > 0 ? "prep" : "meditating")
                if (prepSeconds === 0) { Vibration.vibrate(100) }
                // Schedule local notifications for interval chimes and final bell (works in background/locked)
                ;(async () => {
                  try {
                    // Cancel any previous stray schedules
                    if (medNotifIdsRef.current.length) {
                      await cancelScheduledNotifications(medNotifIdsRef.current)
                      medNotifIdsRef.current = []
                    }
                    medNotifIdsRef.current = await scheduleMeditationNotifications({
                      prepSeconds,
                      intervalMinutes,
                      meditationMinutes,
                    })
                  } catch {}
                })()
              } else {
                // End early
                const start = medStartAt || new Date()
                const elapsed = medElapsed
                setMedPhase("complete")
                setMedActive(false)
                setMedPaused(true)
                // Cancel any pending notifications since session ended early
                ;(async () => {
                  try {
                    if (medNotifIdsRef.current.length) {
                      await cancelScheduledNotifications(medNotifIdsRef.current)
                      medNotifIdsRef.current = []
                    }
                  } catch {}
                })()
                if (elapsed > 0) {
                  ;(async () => { await persistMeditationSession({ startedAt: start, durationSeconds: elapsed }) })()
                }
              }
            }}
            onPauseResume={() => setMedPaused((p)=>!p)}
            onDoneComplete={() => {
              setMedPhase("idle")
              // Ensure notifications are cleared when user dismisses completion
              ;(async () => {
                try {
                  if (medNotifIdsRef.current.length) {
                    await cancelScheduledNotifications(medNotifIdsRef.current)
                    medNotifIdsRef.current = []
                  }
                } catch {}
              })()
            }}
            meditationCompletedToday={meditationCompletedToday}
          />
          </>
        ) : (
          <DistractionContent />
        )}

        {/* Reading bottom sections for tabs */}
        {activeTab === "reading" && (
          <>
            {activeSubTab === "list" && (
              <>
                <TouchableOpacity style={styles.addBookButton} onPress={() => setAddBookOpen(true)}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addBookButtonText}>Add Book to List</Text>
                </TouchableOpacity>
                <View style={styles.cardContainer}>
                  {books.filter((b)=>!b.completed_on).length === 0 ? (
                    <Text style={styles.cardBodyText}>No books yet. Add your first book to start tracking.</Text>
                  ) : (
                    books.filter((b)=>!b.completed_on).map((b) => (
                      <View key={b.id} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
                        <Text style={{ fontWeight: "700", color: "#111827", fontSize: 16 }}>{b.title}</Text>
                        <Text style={{ color: "#6b7280", marginTop: 2 }}>{b.author || "Unknown author"}{b.total_pages ? ` • ${b.total_pages} pages` : ""}</Text>
                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
                          {b.completed_on ? (
                            <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#9CA3AF" }}>
                              <Text style={{ color: "#fff", fontWeight: "600" }}>Completed</Text>
            </View>
                          ) : (
                            <TouchableOpacity onPress={() => setPendingCompleteBookId(b.id)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#10B981" }}>
                              <Text style={{ color: "#fff", fontWeight: "600" }}>Mark completed</Text>
              </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => setPendingDeleteBookId(b.id)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#EF4444" }}>
                            <Text style={{ color: "#fff", fontWeight: "600" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
                    ))
                  )}
              </View>
              </>
            )}
            {activeSubTab === "history" && (
              <>
                <Text style={styles.sectionTitleCaps}>Completed Books</Text>
                <View style={styles.cardContainer}>
                  {books.filter((b)=>!!b.completed_on).length === 0 ? (
                    <Text style={styles.cardBodyText}>No completed books yet. Check off books from your list as you finish them!</Text>
                  ) : (
                    books.filter((b)=>!!b.completed_on).map((b)=> (
                      <View key={b.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
                        <Text style={{ fontWeight: "700", color: "#111827" }}>{b.title}</Text>
                        <Text style={{ color: "#6b7280" }}>{b.author || "Unknown author"}{b.total_pages ? ` • ${b.total_pages} pages` : ""}</Text>
          </View>
                    ))
                  )}
                  </View>
                <Text style={styles.sectionTitleCaps}>Reading Sessions</Text>
                <View style={styles.cardContainer}>
                  {recentSessions.length === 0 ? (
                    <Text style={styles.cardBodyText}>No reading sessions yet.</Text>
                  ) : (
                    recentSessions.map((s) => (
                      <View key={s.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
                        <Text style={{ fontWeight: "600", color: "#111827" }}>{s.book_title || "Untitled"}</Text>
                        <Text style={{ color: "#6b7280" }}>
                          {new Date(s.started_at).toLocaleDateString()} • {formatDuration(s.duration_seconds)}
                          {typeof s.pages_read === "number" ? ` • ${s.pages_read} pages` : ""}
                        </Text>
                </View>
                    ))
                  )}
                  </View>
              </>
            )}
            {activeSubTab === "insights" && (
              <>
                <View style={styles.insightsHeader}>
                  <Text style={styles.sectionTitle}>Insights</Text>
                  <TouchableOpacity style={styles.addInsightButton} onPress={() => setAddInsightOpen(true)}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addInsightButtonText}>Add Insight</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardContainer}>
                  {insights.length === 0 ? (
                    <Text style={styles.cardBodyText}>No insights yet. Add your first insight from your reading!</Text>
                  ) : (
                    insights.map((i) => (
                      <View key={i.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
                        <Text style={{ color: "#111827" }}>{i.insight}</Text>
                        {i.book_id ? (
                          <Text style={{ color: "#6b7280", marginTop: 2 }}>From {books.find((b)=>b.id===i.book_id)?.title || "Unknown book"}</Text>
                        ) : null}
                        <Text style={{ color: "#6b7280", marginTop: 2 }}>{new Date(i.created_at).toLocaleString()}</Text>
              </View>
                    ))
                  )}
          </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Book Modal */}
      <Modal visible={addBookOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
           <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
             <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Add Book</Text>
             <TextInput value={newBookTitle} onChangeText={setNewBookTitle} placeholder="Title" style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10 }} />
             <TextInput value={newBookAuthor} onChangeText={setNewBookAuthor} placeholder="Author (optional)" style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10 }} />
             <TextInput value={newBookPages} onChangeText={setNewBookPages} inputMode="numeric" placeholder="Total pages (optional)" style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10 }} />
             <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
               <TouchableOpacity onPress={() => { setAddBookOpen(false); setNewBookTitle(""); setNewBookAuthor(""); setNewBookPages("") }} style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }}>
                 <Text style={{ fontWeight: "600" }}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={async () => {
                 if (!newBookTitle.trim()) return
                 const created = await addBook({ title: newBookTitle.trim(), author: newBookAuthor.trim() || undefined, totalPages: newBookPages.trim() ? parseInt(newBookPages, 10) : undefined })
                 setBooks([created, ...books])
                 setBookTitle(created.title)
                 setAddBookOpen(false); setNewBookTitle(""); setNewBookAuthor(""); setNewBookPages("")
               }} style={{ backgroundColor: "#111827", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 }}>
                 <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
               </TouchableOpacity>
             </View>
           </View>
          </KeyboardAvoidingView>
         </View>
       </Modal>

       {/* Add Insight Modal */}
       <Modal visible={addInsightOpen} animationType="slide" transparent>
         <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
           <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
             <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Add Insight</Text>
             <TextInput value={newInsightText} onChangeText={setNewInsightText} placeholder="What insight did you get?" multiline placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, minHeight: 100, textAlignVertical: "top", marginBottom: 10 }} />
             {/* simple book picker */}
             <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, marginBottom: 10 }}>
               <ScrollView style={{ maxHeight: 150 }}>
                 <TouchableOpacity onPress={() => setSelectedBookIdForInsight(undefined)} style={{ padding: 10 }}>
                   <Text style={{ color: !selectedBookIdForInsight ? "#111827" : "#6b7280" }}>No book</Text>
                 </TouchableOpacity>
                 {books.map((b) => (
                   <TouchableOpacity key={b.id} onPress={() => setSelectedBookIdForInsight(b.id)} style={{ padding: 10 }}>
                     <Text style={{ color: selectedBookIdForInsight === b.id ? "#111827" : "#6b7280" }}>{b.title}</Text>
                   </TouchableOpacity>
                 ))}
               </ScrollView>
           </View>
             <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
               <TouchableOpacity onPress={() => { setAddInsightOpen(false); setNewInsightText(""); setSelectedBookIdForInsight(undefined) }} style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }}>
                 <Text style={{ fontWeight: "600" }}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={async () => {
                 if (!newInsightText.trim()) return
                 const created = await addInsight({ insight: newInsightText.trim(), bookId: selectedBookIdForInsight })
                 setInsights([created, ...insights])
                 setAddInsightOpen(false); setNewInsightText(""); setSelectedBookIdForInsight(undefined)
               }} style={{ backgroundColor: "#111827", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 }}>
                 <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
               </TouchableOpacity>
         </View>
           </View>
          </KeyboardAvoidingView>
           </View>
       </Modal>

       {/* Reflection Modal placed at root so it doesn't unmount the input */}
       <Modal visible={isReflectOpen} animationType="slide" transparent>
         <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
           <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
             <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Reading Session Complete!</Text>
             <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
               <Ionicons name="book-outline" size={18} color="#4A90E2" />
               <Text style={{ marginLeft: 6 }}>Reading Session</Text>
             </View>
             <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
               <Ionicons name="time-outline" size={18} color="#10B981" />
               <Text style={{ marginLeft: 6 }}>{Math.floor(sessionTime / 60)} minutes</Text>
               </View>
             <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>Share your reflection (optional)</Text>
             <TextInput
               value={reflectionText}
               onChangeText={setReflectionText}
               placeholder="What insights did you gain? What did you learn? How will you apply this knowledge?"
               placeholderTextColor="#999"
               style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, minHeight: 100, textAlignVertical: "top", marginBottom: 10 }}
               multiline
             />
             <TextInput
               value={pagesRead}
               onChangeText={setPagesRead}
               placeholder="Pages read (optional)"
               inputMode="numeric"
               style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, marginBottom: 12 }}
             />
             <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
               <TouchableOpacity
                 onPress={() => {
                   setIsReflectOpen(false)
                   setReflectionText("")
                   setPagesRead("")
                   setSessionTime(0)
                   setSessionStartedAt(null)
                 }}
                 style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }}
               >
                 <Text style={{ fontWeight: "600" }}>Skip</Text>
               </TouchableOpacity>
               <TouchableOpacity
                 disabled={isSaving}
                 onPress={async () => {
                   if (!sessionStartedAt) { setIsReflectOpen(false); return }
                   try {
                     setIsSaving(true)
                     await saveReadingSession({
                       startedAt: sessionStartedAt.toISOString(),
                       endedAt: new Date().toISOString(),
                       durationSeconds: sessionTime,
                       bookTitle,
                       reflection: reflectionText,
                       pagesRead: pagesRead.trim() ? parseInt(pagesRead, 10) : undefined,
                     })
                     const stats = await getReadingStats()
                     setTotalSeconds(stats.totalSeconds)
                     setSessionCount(stats.sessionCount)
                     setAverageSeconds(stats.averageSeconds)
                     setRecentSessions(await listReadingSessions(10))
                   } finally {
                     setIsSaving(false)
                     setIsReflectOpen(false)
                     setReflectionText("")
                     setPagesRead("")
                     setSessionTime(0)
                     setSessionStartedAt(null)
                   }
                 }}
                 style={{ backgroundColor: "#111827", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 }}
               >
                 <Text style={{ color: "#fff", fontWeight: "700" }}>{isSaving ? "Saving..." : "Save Session"}</Text>
               </TouchableOpacity>
               </View>
             </View>
          </KeyboardAvoidingView>
           </View>
       </Modal>

      {/* Book Picker Modal */}
      <Modal visible={bookPickerOpen} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16, maxHeight: 400 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Select Book</Text>
            <ScrollView>
              {books.filter((b)=>!b.completed_on).map((b) => (
                <TouchableOpacity key={b.id} style={{ paddingVertical: 10 }} onPress={() => { setBookTitle(b.title); setBookPickerOpen(false) }}>
                  <Text style={{ fontWeight: "600" }}>{b.title}</Text>
                  <Text style={{ color: "#6b7280" }}>{b.author || "Unknown author"}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => { setBookPickerOpen(false); setAddBookOpen(true) }}>
                <Text style={{ color: "#2563EB", fontWeight: "700" }}>+ Add new book</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
              <TouchableOpacity onPress={() => setBookPickerOpen(false)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }}>
                <Text>Close</Text>
              </TouchableOpacity>
            </View>
            </View>
          </View>
      </Modal>

      {/* Delete Book Confirm */}
      <Modal visible={!!pendingDeleteBookId} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Delete book?</Text>
            <Text style={{ color: "#6b7280", marginBottom: 12 }}>This action cannot be undone.</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <TouchableOpacity onPress={() => setPendingDeleteBookId(null)} style={{ paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                const id = pendingDeleteBookId
                setPendingDeleteBookId(null)
                if (!id) return
                try {
                  await deleteBook(id)
                  setBooks((prev) => prev.filter((b) => b.id !== id))
                  // If current title was this book, clear it
                  setBookTitle((title) => {
                    const deleted = books.find((b)=>b.id===id)
                    return deleted && deleted.title === title ? "" : title
                  })
                } catch {}
              }} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#EF4444" }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Delete</Text>
              </TouchableOpacity>
          </View>
        </View>
          </View>
      </Modal>

      {/* Mark Completed Confirm */}
      <Modal visible={!!pendingCompleteBookId} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Mark book as completed?</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <TouchableOpacity onPress={() => setPendingCompleteBookId(null)} style={{ paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 }}>
                <Text>Cancel</Text>
          </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                const id = pendingCompleteBookId
                setPendingCompleteBookId(null)
                if (!id) return
                try {
                  const updated = await markBookCompleted(id)
                  setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)))
                } catch {}
              }} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#10B981" }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Mark Completed</Text>
          </TouchableOpacity>
        </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// Distraction tab (manual entry with Supabase persistence)
const DistractionContent: React.FC = () => {
  const [apps, setApps] = useState<TrackedApp[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))
  const [inputs, setInputs] = useState<Record<string, { h: string; m: string }>>({})
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [dailyAverage, setDailyAverage] = useState(0)
  const [monthCursor, setMonthCursor] = useState(new Date())
  const [monthlyTotals, setMonthlyTotals] = useState<Record<string, number>>({})

  useEffect(() => {
    ;(async () => {
      let a = await listTrackedApps()
      // Ensure default set exists (idempotent)
      const ensure = async (name: string, icon: string, color: string) => {
        if (!a.find((x) => x.name.toLowerCase() === name.toLowerCase())) {
          try { const created = await addTrackedApp({ name, icon, color }); a = [created, ...a] } catch {}
        }
      }
      await ensure("Instagram", "logo-instagram", "#E1306C")
      await ensure("TikTok", "logo-tiktok", "#000000")
      await ensure("Snapchat", "logo-snapchat", "#FFFC00")
      await ensure("X", "logo-twitter", "#1D9BF0")
      setApps(a)
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      const startISO = weekStart.toISOString()
      const endISO = new Date(weekStart.getTime() + 6 * 86400000).toISOString()
      const usage = await getUsageForRange(startISO, endISO)
      const sd = toDateKey(selectedDate)
      const map: Record<string, { h: string; m: string }> = {}
      for (const app of apps) {
        const entry = usage.find((u) => u.app_id === app.id && u.usage_date === sd)
        const minutes = entry?.minutes || 0
        map[app.id] = { h: String(Math.floor(minutes / 60)), m: String(minutes % 60) }
      }
      setInputs(map)
      const stats = await getStats(startISO, endISO)
      setTotalMinutes(stats.totalMinutes)
      setDailyAverage(stats.dailyAverageMinutes)
    })()
  }, [apps, weekStart, selectedDate])

  // monthly totals for calendar + cost
  useEffect(() => {
    ;(async () => {
      const y = monthCursor.getUTCFullYear()
      const m = monthCursor.getUTCMonth()
      const totals = await getMonthlyTotals(y, m)
      setMonthlyTotals(totals)
    })()
  }, [monthCursor])

  const saveCurrentDay = async () => {
    if (apps.length === 0) return
    const items = apps.map((a) => {
      const h = parseInt(inputs[a.id]?.h || "0", 10) || 0
      const m = parseInt(inputs[a.id]?.m || "0", 10) || 0
      return { appId: a.id, minutes: Math.max(0, Math.min(1440, h * 60 + m)) }
    })
    await saveUsage({ date: toDateKey(selectedDate), items })
    // refresh week stats
    const startISO = weekStart.toISOString()
    const endISO = new Date(weekStart.getTime() + 6 * 86400000).toISOString()
    const stats = await getStats(startISO, endISO)
    setTotalMinutes(stats.totalMinutes)
    setDailyAverage(stats.dailyAverageMinutes)
    // refresh monthly totals for calendar + true cost
    const y = monthCursor.getUTCFullYear()
    const mth = monthCursor.getUTCMonth()
    const totals = await getMonthlyTotals(y, mth)
    setMonthlyTotals(totals)
  }

  const previousWeek = () => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))
  const nextWeek = () => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))

  const weekDays = [...Array(7)].map((_, i) => new Date(weekStart.getTime() + i * 86400000))
  const rangeLabel = `${formatMonthDay(weekDays[0])} - ${formatMonthDay(weekDays[6])}`

  return (
    <>
      {/* Top stats */}
      <View style={styles.distractionStatsContainer}>
        <View style={styles.distractionStatCard}>
          <Ionicons name="time-outline" size={20} color="#4A90E2" />
          <View style={styles.distractionStatContent}>
            <Text style={styles.distractionStatLabel}>Total Time</Text>
            <Text style={styles.distractionStatValue}>{formatMinutes(totalMinutes)}</Text>
          </View>
        </View>
        <View style={styles.distractionStatCard}>
          <Ionicons name="trending-up-outline" size={20} color="#10B981" />
          <View style={styles.distractionStatContent}>
            <Text style={styles.distractionStatLabel}>Daily Average</Text>
            <Text style={styles.distractionStatValue}>{formatMinutes(dailyAverage)}</Text>
          </View>
        </View>
      </View>

      {/* Tracking card */}
      <View style={styles.trackingSection}>
        <View style={styles.trackingHeader}>
          <View style={styles.trackingTitleContainer}>
            <Ionicons name="phone-portrait-outline" size={20} color="#4A90E2" />
            <Text style={styles.trackingTitle}>Track Your Social Media Time</Text>
          </View>
          <View style={styles.weekSelector}>
            <TouchableOpacity onPress={previousWeek}><Ionicons name="chevron-back" size={20} color="#333" /></TouchableOpacity>
            <Text style={styles.weekText}>{rangeLabel}</Text>
            <TouchableOpacity onPress={nextWeek}><Ionicons name="chevron-forward" size={20} color="#333" /></TouchableOpacity>
          </View>
        </View>

        {/* Week calendar row */}
        <View style={styles.weekCalendar}>
          {weekDays.map((d) => {
            const isSelected = toDateKey(d) === toDateKey(selectedDate)
            const dayName = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getUTCDay()]
            return (
              <TouchableOpacity key={d.toISOString()} style={styles.weekDay} onPress={() => setSelectedDate(d)}>
                <Text style={[styles.weekDayName, isSelected && styles.selectedWeekDay]}>{dayName}</Text>
                <Text style={[styles.weekDayDate, isSelected && styles.selectedWeekDay]}>{d.getUTCDate()}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Apps list */}
        <View style={styles.socialMediaApps}>
          {apps.map((a) => (
            <View key={a.id} style={[styles.socialMediaApp, { backgroundColor: shade(a.color || "#f8f9fa") }]}>
              <View style={styles.appInfo}>
                <View style={[styles.appIcon, { backgroundColor: a.color || "#e5e7eb" }]}>
                  <Ionicons name={(a.icon || "phone-portrait-outline") as any} size={22} color={a.icon ? (a.icon === "logo-snapchat" ? "#000" : "#fff") : "#333"} />
                </View>
                <Text style={styles.appName}>{a.name}</Text>
              </View>
              <View style={styles.timeInputs}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeInputLabel}>Hr</Text>
                  <TextInput
                    value={inputs[a.id]?.h ?? ""}
                    placeholder="0"
                    onChangeText={(t)=> setInputs((prev)=> ({ ...prev, [a.id]: { h: t.replace(/[^0-9]/g, ''), m: prev[a.id]?.m ?? "" } }))}
                    keyboardType="number-pad"
                    style={styles.timeInput}
                  />
                </View>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeInputLabel}>Min</Text>
                  <TextInput
                    value={inputs[a.id]?.m ?? ""}
                    placeholder="0"
                    onChangeText={(t)=> setInputs((prev)=> ({ ...prev, [a.id]: { h: prev[a.id]?.h ?? "", m: t.replace(/[^0-9]/g, '') } }))}
                    keyboardType="number-pad"
                    style={styles.timeInput}
                  />
                </View>
              </View>
              <TouchableOpacity onPress={async ()=> { await deleteTrackedApp(a.id); setApps((p)=> p.filter(x=>x.id!==a.id)) }} style={styles.removeButton}>
                <Ionicons name="close" size={18} color="#333" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12, alignItems: "flex-end" }}>
          <TouchableOpacity onPress={saveCurrentDay} style={{ backgroundColor: "#111827", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Save Day</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Monthly calendar */}
      <View style={styles.monthlySection}>
        <View style={styles.monthlySectionHeader}>
          <Ionicons name="calendar-outline" size={20} color="#EF4444" />
          <Text style={styles.monthlySectionTitle}>Social Media Time This Month</Text>
        </View>
        <View style={styles.legend}>
          {[
            { label: "No usage", color: "#E5E7EB" },
            { label: "<1hr", color: "#DCFCE7" },
            { label: "1-2hrs", color: "#FEF9C3" },
            { label: "2-3hrs", color: "#FFEDD5" },
            { label: "3hrs+", color: "#FEE2E2" },
          ].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.monthlyCalendar}>
          {monthGrid(monthCursor).map((d, idx) => {
            if (!d) {
              return <View key={`empty-${idx}`} style={[styles.monthDay, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB" }]} />
            }
            const key = toDateKey(d)
            const min = monthlyTotals[key] || 0
            const bg = calendarCellColor(min)
            const isSelected = toDateKey(d) === toDateKey(selectedDate)
            return (
              <View key={key} style={[styles.monthDay, { backgroundColor: bg, borderWidth: 1, borderColor: isSelected ? "#3B82F6" : "#E5E7EB" }] }>
                <Text style={[styles.monthDayText, isSelected && styles.selectedMonthDayText]}>{d.getUTCDate()}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* True Cost Section */}
      <View style={styles.trueCostSection}>
        <View style={styles.trueCostHeader}>
          <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
          <Text style={styles.trueCostTitle}>The True Cost of Your Digital Distraction</Text>
        </View>

        {/* Work Time Lost */}
        <View style={styles.costCard}>
          <View style={styles.costCardHeader}>
            <Ionicons name="briefcase-outline" size={18} color="#EF4444" />
            <Text style={styles.costCardTitle}>Work Time Lost</Text>
          </View>
          <Text style={styles.costCardValue}>{workTimeLabel(totalMonthMinutes(monthlyTotals))}</Text>
        </View>

        {/* Income Opportunity Lost */}
        <View style={styles.costCard}>
          <View style={styles.costCardHeader}>
            <Ionicons name="cash-outline" size={18} color="#EF4444" />
            <Text style={styles.costCardTitle}>Income Opportunity Lost</Text>
          </View>
          <View style={styles.incomeGrid}>
            {[20,50,100].map((rate) => (
              <View key={rate} style={styles.incomeItem}>
                <Text style={styles.incomeRate}>${rate}/hour</Text>
                <Text style={styles.incomeLost}>${incomeLost(totalMonthMinutes(monthlyTotals), rate)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quality Time Lost */}
        <View style={styles.costCard}>
          <View style={styles.costCardHeader}>
            <Ionicons name="people-outline" size={18} color="#EF4444" />
            <Text style={styles.costCardTitle}>Quality Time Lost</Text>
          </View>
          <Text style={styles.qualityTimeDescription}>Instead of scrolling, you could have had:</Text>
          <View style={styles.qualityTimeList}>
            {qualityItems(totalMonthMinutes(monthlyTotals)).map((t) => (
              <Text key={t.label} style={styles.qualityTimeItem}>• <Text style={{ fontWeight: "700" }}>{t.value}</Text> {t.label}</Text>
            ))}
          </View>
        </View>

        <View style={styles.totalTimeFooter}>
          <Text style={styles.totalTimeText}>Total time on social media: <Text style={styles.totalTimeValueFooter}>{formatMinutes(totalMonthMinutes(monthlyTotals))}</Text></Text>
        </View>
      </View>
    </>
  )
}

// helpers for Distraction tab
function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dow = d.getUTCDay() // 0=Sun
  return new Date(d.getTime() - dow * 86400000)
}
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}
function formatMonthDay(d: Date): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`
}
function formatMinutes(min: number): string { const h = Math.floor(min/60); const m = min%60; return h>0? `${h}h ${m}m` : `${m}m` }
function shade(hex: string): string { return "#" + (hex.replace('#','') + "888888").slice(0,6) }

function daysInMonth(date: Date): Date[] {
  const y = date.getUTCFullYear(); const m = date.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return Array.from({ length: last }, (_, i) => new Date(Date.UTC(y, m, i + 1)))
}
function monthGrid(date: Date): Array<Date | null> {
  const days = daysInMonth(date)
  const firstDow = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).getUTCDay() // 0-6
  const leading = Array.from({ length: firstDow }, () => null)
  const total = leading.length + days.length
  const trailing = (total % 7 === 0) ? 0 : 7 - (total % 7)
  const tail = Array.from({ length: trailing }, () => null)
  return [...leading, ...days, ...tail]
}
function calendarCellColor(minutes: number): string {
  if (!minutes) return "#F3F4F6" // gray-100
  if (minutes < 60) return "#DCFCE7" // green-100
  if (minutes < 120) return "#FEF9C3" // yellow-100
  if (minutes < 180) return "#FFEDD5" // orange-100
  return "#FEE2E2" // red-100
}
function totalMonthMinutes(map: Record<string, number>): number { return Object.values(map).reduce((a,b)=>a+(b||0),0) }
function workTimeLabel(totalMin: number): string { return totalMin >= 8*60 ? "At least a work day" : "Less than a work day" }
function incomeLost(totalMin: number, rate: number): string { const hrs = totalMin/60; const val = Math.floor(hrs * rate); return val.toLocaleString() }
function qualityItems(totalMin: number): { label: string; value: number }[] {
  const items = [
    { label: "meaningful conversations", min: 60 },
    { label: "family dinners", min: 90 },
    { label: "workout sessions", min: 60 },
    { label: "full nights of sleep", min: 480 },
  ]
  return items.map((i) => ({ label: i.label, value: Math.floor(totalMin / i.min) }))
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
  scrollContent: {
    paddingBottom: 120,
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
    flexShrink: 1,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 30,
    paddingRight: 0,
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    minWidth: 0,
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
    flexShrink: 1,
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
    marginBottom: 20,
  },
  sessionStatCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
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
  sessionStatText: {
    marginLeft: 10,
  },
  sessionStatValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  sessionStatLabel: {
    fontSize: 12,
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
  sessionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 360,
    zIndex: 5,
  },
  overlayContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  overlayTimer: {
    fontSize: 56,
    fontWeight: "800",
    color: "#111827",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  overlaySubText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  overlayControls: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  overlayPauseBtn: {
    backgroundColor: "#4A90E2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  overlayPauseText: {
    color: "#fff",
    fontWeight: "700",
  },
  overlayEndBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  overlayEndText: {
    color: "#fff",
    fontWeight: "700",
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
    width: "13.0%",
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
  totalTimeValueFooter: {
    fontWeight: "700",
    color: "#EF4444",
  },
})

export default MindScreen
