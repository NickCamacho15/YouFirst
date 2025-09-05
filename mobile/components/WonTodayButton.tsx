import React, { useEffect, useRef, useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from "react-native"
import { checkEligibility, hasWon, markWon, subscribeWins } from "../lib/wins"
import { subscribePersonalMastery } from "../lib/dashboard"
import { toDateKey } from "../lib/wins"
import ConfettiCannon from "react-native-confetti-cannon"

const WonTodayButton: React.FC = () => {
  const [wonToday, setWonToday] = useState(false)
  const [eligible, setEligible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasAnyConfigured, setHasAnyConfigured] = useState(true)
  const [showCongrats, setShowCongrats] = useState(false)
  const confettiRef = useRef<any>(null)

  const refresh = async () => {
    try {
      const key = toDateKey(new Date())
      // Already won today disables button as well
      const already = await hasWon(key)
      if (already) { setWonToday(true); setEligible(false); return }
      const elig = await checkEligibility(key)
      setWonToday(false)
      setEligible(!!elig.allComplete)
      setHasAnyConfigured(!!elig.hasAnyConfigured)
    } catch { setWonToday(false); setEligible(false) }
  }

  useEffect(() => {
    const unsubs: Array<() => void> = []
    const burst = () => { refresh(); setTimeout(() => refresh(), 300); setTimeout(() => refresh(), 1200) }
    burst()
    unsubs.push(subscribeWins(() => { burst() }))
    // also refresh on personal mastery updates triggered by routines/tasks
    unsubs.push(subscribePersonalMastery(() => { burst() }))
    return () => { unsubs.forEach((u) => { try { u() } catch {} }) }
  }, [])

  const onPress = async () => {
    if (wonToday || !eligible) {
      try {
        const key = toDateKey(new Date())
        // show granular message
        const { allComplete, missing, hasAnyConfigured: anyConfig } = await checkEligibility(key)
        if (wonToday) return
        if (allComplete) { setEligible(true); return }
        if (!anyConfig) {
          Alert.alert('Create your daily routine first', 'Please create a daily routine and complete it to win the day!')
          setHasAnyConfigured(false)
          return
        }
        const parts: string[] = []
        if (missing.morning) parts.push("Morning Priming")
        if (missing.tasks) parts.push("Today's Tasks")
        if (missing.evening) parts.push("Evening Reflection")
        Alert.alert("Finish today's items first", parts.length ? `You need to complete: ${parts.join(", ")}.` : "You need to complete all morning, tasks, and evening items.")
      } catch {
        Alert.alert("Not ready yet", "Complete all morning, tasks, and evening items first.")
      }
      return
    }
    try {
      setLoading(true)
      await markWon()
      // After saving, force a visible refresh: wins, calendar, streaks
      setWonToday(true)
      setEligible(false)
      // Proactively notify listeners that state changed
      try { const { emitWinsChanged } = await import('../lib/wins'); emitWinsChanged() } catch {}
      setShowCongrats(true)
    } catch (e) {
      Alert.alert('Save failed', 'Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[
        styles.winButton,
        (wonToday ? styles.winButtonDisabled : (eligible ? styles.winButtonEnabled : styles.winButtonInfo)),
        (!hasAnyConfigured && !eligible && !wonToday) ? styles.winButtonSmall : undefined,
      ]} onPress={onPress} disabled={loading || wonToday}>
        <Text style={[
          styles.winButtonText,
          wonToday ? styles.winButtonTextDisabled : (hasAnyConfigured ? styles.winButtonTextEnabled : styles.winButtonTextInfo)
        ]}>
          {loading ? 'Saving…' : (
            wonToday ? 'You won today!' : (
              eligible ? 'I Won Today' : (
                hasAnyConfigured ? 'I Won Today' : 'Create a daily routine to get started.'
              )
            )
          )}
        </Text>
      </TouchableOpacity>

      {/* Congrats Modal */}
      <Modal transparent visible={showCongrats} animationType="fade" onRequestClose={() => setShowCongrats(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 }}>Congratulations!</Text>
            <Text style={{ color: '#374151', textAlign: 'center' }}>You strung together another great day. Keep stacking wins and build your streak.</Text>
            <TouchableOpacity onPress={() => setShowCongrats(false)} style={{ backgroundColor: '#111827', marginTop: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Awesome</Text>
            </TouchableOpacity>
          </View>
          <ConfettiCannon count={140} origin={{ x: 0, y: 0 }} fadeOut autoStart ref={confettiRef} explosionSpeed={450} fallSpeed={2000} />
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  winButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  winButtonEnabled: { backgroundColor: "#10B981" },
  winButtonDisabled: { backgroundColor: "#93C5FD" },
  winButtonInfo: { backgroundColor: "#EAF1FF", borderWidth: 1, borderColor: "#C9D8FF" },
  winButtonSmall: { paddingVertical: 12 },
  winButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  winButtonTextEnabled: { color: "#fff" },
  winButtonTextDisabled: { color: "#f0f9ff" },
  winButtonTextInfo: { color: "#1f2937", fontSize: 14, fontWeight: "700" },
})

export default WonTodayButton


