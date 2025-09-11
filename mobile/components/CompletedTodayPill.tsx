import React, { useEffect, useState } from 'react'
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getDailyWinStatus, setDailyOverride, subscribeWins, type DailyComponent, toDateKey } from '../lib/wins'

type Props = { component: DailyComponent; label: string; dateKey?: string }

const CompletedTodayPill: React.FC<Props> = ({ component, label, dateKey }) => {
  const [selected, setSelected] = useState(false)
  const [loading, setLoading] = useState(false)

  const sync = async () => {
    try {
      const key = dateKey || toDateKey(new Date())
      const s = await getDailyWinStatus(key)
      switch (component) {
        case 'intention_morning': setSelected(!!s.intentionMorning); break
        case 'intention_evening': setSelected(!!s.intentionEvening); break
        case 'tasks': setSelected(!!s.criticalTasks); break
        case 'workout': setSelected(!!s.workout); break
        case 'reading': setSelected(!!s.reading); break
        case 'prayer_meditation': setSelected(!!s.prayerMeditation); break
        default: setSelected(false)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let unsub: (() => void) | undefined
    ;(async () => {
      await sync()
      unsub = subscribeWins(() => { sync() })
    })()
    return () => { if (unsub) unsub() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component, dateKey])

  const onPress = async () => {
    if (loading) return
    const next = !selected
    setSelected(next)
    setLoading(true)
    try {
      await setDailyOverride(component, next, dateKey)
    } catch {
      // revert on failure
      setSelected(!next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[styles.pill, selected ? styles.pillOn : styles.pillOff, loading ? styles.pillDisabled : null]}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator size="small" color={selected ? '#065f46' : '#1f2937'} />
        ) : selected ? (
          <Ionicons name="checkmark" size={14} color="#065f46" />
        ) : (
          <Ionicons name="ellipse-outline" size={14} color="#1f2937" />
        )}
      </View>
      <Text style={[styles.text, selected ? styles.textOn : styles.textOff]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillOn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  pillOff: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  pillDisabled: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  textOn: {
    color: '#065f46',
  },
  textOff: {
    color: '#1f2937',
  },
})

export default CompletedTodayPill


