import { View, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useRef, useState } from 'react'
import { getStreaks, subscribeWins } from '../lib/wins'

const StreakStats = ({ embedded }: { embedded?: boolean }) => {
  const [current, setCurrent] = useState(0)
  const [best, setBest] = useState(0)
  const [loading, setLoading] = useState(false) // Start as false since cache loads instantly
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    let isActive = true

    async function load(force = false) {
      // Prevent double-loading on initial mount
      if (!force && hasLoadedRef.current) return
      hasLoadedRef.current = true
      
      try {
        const s = await getStreaks()
        if (!isActive) return
        // Only update state if values actually changed
        setCurrent(prev => s.current === prev ? prev : s.current)
        setBest(prev => s.best === prev ? prev : s.best)
      } catch {}
    }

    // Initial load (cache loads instantly)
    load(false)

    // Subsequent updates from win changes
    const unsub = subscribeWins(() => { load(true) })

    return () => { isActive = false; if (unsub) unsub() }
  }, [])

  return (
    <View style={[styles.container, embedded ? { marginHorizontal: 0, marginBottom: 0, shadowOpacity: 0, elevation: 0, borderRadius: 0, paddingHorizontal: 0, paddingVertical: 12, backgroundColor: 'transparent' } : null]}>
      <View style={styles.statItem}>
        <Ionicons name="flame-outline" size={20} color="#FF6B35" />
        <Text style={styles.statLabel}>Current Streak:</Text>
        <Text style={styles.statValue}>{loading ? '…' : `${current} days`}</Text>
      </View>
      <View style={styles.statItem}>
        <Ionicons name="trophy-outline" size={20} color="#FFB800" />
        <Text style={styles.statLabel}>Best:</Text>
        <Text style={styles.statValue}>{loading ? '…' : `${best} days`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 16,
    color: "#666",
    marginLeft: 8,
    marginRight: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
})

export default StreakStats
