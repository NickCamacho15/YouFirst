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
  TextInput,
  Modal,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import TopHeader from "../components/TopHeader"
import { Brain } from "lucide-react-native"
import { saveReadingSession, getReadingStats, listReadingSessions, type ReadingSessionRow } from "../lib/reading"
import { listBooks, addBook, listInsights, addInsight, type UserBook, type ReadingInsight } from "../lib/books"

type StatCardProps = {
  title: string
  value: string
  subtitle: string
  icon: string
  iconColor: string
}

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
          blurOnSubmit={false}
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
              <Text style={styles.readingStatValue}>{sessionCount}</Text>
              <Text style={styles.readingStatLabel}>Reading</Text>
            </View>
            <View style={styles.readingStatCard}>
              <Ionicons name="trophy-outline" size={20} color="#10B981" />
              <Text style={styles.readingStatValue}>0</Text>
              <Text style={styles.readingStatLabel}>Completed</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.addBookButton}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBookButtonText}>Add Book to List</Text>
          </TouchableOpacity>

          {/* Recent Sessions hidden for now */}
          {/*
          <View style={styles.cardContainer}>
            {recentSessions.length === 0 ? (
              <Text style={styles.cardBodyText}>No reading sessions yet. Start one above and save it.</Text>
            ) : (
              recentSessions.map((s) => (
                <View key={s.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
                  <Text style={{ fontWeight: "600", color: "#111827" }}>{s.book_title || "Untitled"}</Text>
                  <Text style={{ color: "#6b7280" }}>
                    {new Date(s.started_at).toLocaleDateString()} • {formatDuration(s.duration_seconds)}
                    {typeof s.pages_read === "number" ? ` • ${s.pages_read} pages` : ""}
                  </Text>
                  {s.reflection ? <Text style={{ color: "#374151", marginTop: 2 }}>{s.reflection}</Text> : null}
                </View>
              ))
            )}
          </View>
          */}
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
)

interface ScreenProps { onLogout?: () => void }

const MindScreen: React.FC<ScreenProps> = ({ onLogout }) => {
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
  useEffect(() => {
    ;(async () => {
      try {
        const stats = await getReadingStats()
        setTotalSeconds(stats.totalSeconds)
        setSessionCount(stats.sessionCount)
        setAverageSeconds(stats.averageSeconds)
        setRecentSessions(await listReadingSessions(10))
        setBooks(await listBooks())
        setInsights(await listInsights(20))
      } catch {
        // ignore for now
      }
    })()
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <TopHeader onLogout={onLogout} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
          <TouchableOpacity style={[styles.tab, activeTab === "reading" && styles.activeTab]} onPress={() => setActiveTab("reading")}>
            <Ionicons name="book-outline" size={20} color={activeTab === "reading" ? "#333" : "#999"} />
            <Text style={[styles.tabText, activeTab === "reading" && styles.activeTabText]}>Reading</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "meditation" && styles.activeTab]} onPress={() => setActiveTab("meditation")}>
            <Brain stroke={activeTab === "meditation" ? "#333" : "#999"} width={20} height={20} />
            <Text style={[styles.tabText, activeTab === "meditation" && styles.activeTabText]}>Meditation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "distraction" && styles.activeTab]} onPress={() => setActiveTab("distraction")}>
            <Ionicons name="phone-portrait-outline" size={20} color={activeTab === "distraction" ? "#333" : "#999"} />
            <Text style={[styles.tabText, activeTab === "distraction" && styles.activeTabText]}>Distraction</Text>
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
          />
        ) : activeTab === "meditation" ? (
          <MeditationContent />
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
                  {books.length === 0 ? (
                    <Text style={styles.cardBodyText}>No books yet. Add your first book to start tracking.</Text>
                  ) : (
                    books.map((b) => (
                      <View key={b.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
                        <Text style={{ fontWeight: "700", color: "#111827" }}>{b.title}</Text>
                        <Text style={{ color: "#6b7280" }}>{b.author || "Unknown author"}{b.total_pages ? ` • ${b.total_pages} pages` : ""}</Text>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
            {activeSubTab === "history" && (
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
                        <Text style={{ color: "#6b7280", marginTop: 2 }}>{new Date(i.created_at).toLocaleString()}</Text>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Book Modal */}
      <Modal visible={addBookOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 }}>
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
                setAddBookOpen(false); setNewBookTitle(""); setNewBookAuthor(""); setNewBookPages("")
              }} style={{ backgroundColor: "#111827", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Insight Modal */}
      <Modal visible={addInsightOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 }}>
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
        </View>
      </Modal>

      {/* Reflection Modal placed at root so it doesn't unmount the input */}
      <Modal visible={isReflectOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 }}>
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
        </View>
      </Modal>
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
