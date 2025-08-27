import { View, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from 'react'
import { getStreaks, subscribeWins } from '../lib/wins'

const StreakStats = () => {
  const [current, setCurrent] = useState(0)
  const [best, setBest] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const burst = async () => { await load(); setTimeout(load, 300); setTimeout(load, 1200) }
    async function load() {
      try { setLoading(true); const s = await getStreaks(); setCurrent(s.current); setBest(s.best) } finally { setLoading(false) }
    }
    burst()
    const unsub = subscribeWins(() => { burst() })
    return () => { if (unsub) unsub() }
  }, [])

  return (
    <View style={styles.container}>
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
    marginBottom: 16,
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
