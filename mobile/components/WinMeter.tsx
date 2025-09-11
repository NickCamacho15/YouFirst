import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { getDailyWinStatus, subscribeWins, toDateKey } from '../lib/wins'

type Props = { dateKey?: string }

type Segment = { key: 'intention' | 'tasks' | 'move' | 'read' | 'center'; label: string; value: boolean }

const WinMeter: React.FC<Props> = ({ dateKey }) => {
  const [status, setStatus] = useState<{ intention: boolean; tasks: boolean; move: boolean; read: boolean; center: boolean }>({ intention: false, tasks: false, move: false, read: false, center: false })
  const anims = useRef<Record<string, Animated.Value>>({ intention: new Animated.Value(0), tasks: new Animated.Value(0), move: new Animated.Value(0), read: new Animated.Value(0), center: new Animated.Value(0) })

  const refresh = async () => {
    try {
      const key = dateKey || toDateKey(new Date())
      const s = await getDailyWinStatus(key)
      const next = {
        intention: !!(s.intentionMorning && s.intentionEvening),
        tasks: !!s.criticalTasks,
        move: !!s.workout,
        read: !!s.reading,
        center: !!s.prayerMeditation,
      }
      setStatus(next)
      Object.entries(next).forEach(([k, v]) => {
        Animated.timing(anims.current[k], { toValue: v ? 1 : 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: false }).start()
      })
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let unsub: (() => void) | undefined
    refresh()
    unsub = subscribeWins(() => { refresh() })
    return () => { if (unsub) unsub() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey])

  const segments: Segment[] = useMemo(() => [
    { key: 'intention', label: 'Intention', value: status.intention },
    { key: 'tasks', label: "Today's Tasks", value: status.tasks },
    { key: 'move', label: 'Move', value: status.move },
    { key: 'read', label: 'Read', value: status.read },
    { key: 'center', label: 'Center', value: status.center },
  ], [status])

  const completedCount = segments.reduce((acc, s) => acc + (s.value ? 1 : 0), 0)

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {segments.map((s, idx) => {
          const animatedBg = anims.current[s.key].interpolate({ inputRange: [0, 1], outputRange: ['#f3f4f6', '#10B981'] })
          const borderCol = s.value ? '#10B981' : '#e5e7eb'
          return (
            <View key={s.key} style={[styles.segmentWrap, idx > 0 && styles.segmentGap]}> 
              <Animated.View style={[styles.segment, { backgroundColor: animatedBg, borderColor: borderCol }]} />
              <Text style={styles.segmentLabel}>{s.label}</Text>
            </View>
          )
        })}
      </View>
      <Text style={styles.countText}>{completedCount}/5</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentWrap: {
    flex: 1,
    alignItems: 'center',
  },
  segmentGap: {
    marginLeft: 6,
  },
  segment: {
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    width: '100%',
  },
  segmentLabel: {
    marginTop: 6,
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  countText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'right',
  },
})

export default WinMeter


