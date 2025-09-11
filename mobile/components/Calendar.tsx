import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons'
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { getWinsForMonth, subscribeWins, toDateKey, listDailyStatusesBetween, type DailyWinStatus, getDailyWinStatus, parseDateKey, getDailyWinDetails, type DailyWinDetails } from '../lib/wins'

export default function Calendar({ embedded }: { embedded?: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wonDays, setWonDays] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<{ open: boolean; status?: DailyWinStatus; dateKey?: string; loading?: boolean; view?: 'summary' | 'details'; details?: DailyWinDetails; selected?: 'intention' | 'tasks' | 'move' | 'read' | 'center' }>({ open: false })
  const [dayStatuses, setDayStatuses] = useState<Record<string, DailyWinStatus>>({})
  
  // Get days of current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Calculate first day of month for proper grid alignment
  const startDay = getDay(monthStart);
  const daysArray = Array(startDay).fill(null).concat(daysInMonth);
  
  // Navigation
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1));

  // Load wins and per-day statuses for the visible month and refresh on win events
  useEffect(() => {
    let unsub: (() => void) | undefined
    const load = async () => {
      try {
        setWonDays(await getWinsForMonth(currentDate))
      } catch { setWonDays(new Set()) }
      try {
        const startKey = toDateKey(monthStart)
        const endKey = toDateKey(monthEnd)
        const map = await listDailyStatusesBetween(startKey, endKey)
        setDayStatuses(map)
      } catch { setDayStatuses({}) }
    }
    load()
    unsub = subscribeWins(() => { load() })
    return () => { if (unsub) unsub() }
  }, [currentDate])
  
  // Render day cells
  const renderDays = () => {
    const weeks = [];
    let days = [];
    
    daysArray.forEach((day, i) => {
      if (i > 0 && i % 7 === 0) {
        weeks.push(days);
        days = [];
      }
      
      days.push(day);
      
      if (i === daysArray.length - 1) {
        // Fill in any remaining cells to complete the grid
        while (days.length < 7) {
          days.push(null);
        }
        weeks.push(days);
      }
    });
    
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const onPressDay = async (day: Date | null) => {
      if (!day) return
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const isFuture = day.getTime() > todayStart.getTime()
      if (isFuture) return
      const key = toDateKey(day)
      setDetail({ open: true, dateKey: key, loading: true, view: 'summary' })
      try {
        const s = await getDailyWinStatus(key)
        setDetail({ open: true, dateKey: key, status: s, loading: false, view: 'summary' })
      } catch {
        setDetail({ open: true, dateKey: key, status: undefined, loading: false, view: 'summary' })
      }
    }

    return weeks.map((week, i) => (
      <View key={i} style={styles.week}>
        {week.map((day, j) => {
          const key = day ? toDateKey(day!) : ''
          const isFuture = !!day && day.getTime() > todayStart.getTime()
          const isPast = !!day && day.getTime() < todayStart.getTime()
          const s = key ? dayStatuses[key] : undefined
          // A day is considered "won" (green) ONLY when a row exists in user_wins
          const isWon = !!(day && !isFuture && wonDays.has(key))
          const isSelected = !!(day && isSameDay(day!, selectedDate))

          // Compute background style: won (green) takes precedence. Otherwise, for past days use
          // red if 0/5, yellow if 1-4/5. Current/future days remain neutral unless won.
          let stateStyle: any = null
          let isPartial = false
          let isFailed = false
          if (isWon) stateStyle = styles.wonDay
          else if (!isFuture && isPast && s) {
            const completedCount = (s.intentionMorning && s.intentionEvening ? 1 : 0)
              + (s.criticalTasks ? 1 : 0)
              + (s.workout ? 1 : 0)
              + (s.reading ? 1 : 0)
              + (s.prayerMeditation ? 1 : 0)
            if (completedCount === 0) { stateStyle = styles.failedDay; isFailed = true }
            else if (completedCount < 5) { stateStyle = styles.partialDay; isPartial = true }
          } else if (isSelected) stateStyle = styles.selectedDay
          return (
            <TouchableOpacity
              key={j}
              style={[styles.day, stateStyle]}
              onPress={() => onPressDay(day)}
              disabled={!day}
            >
              {day ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[
                    styles.dayText,
                    isWon ? styles.wonDayText : isSelected ? styles.selectedDayText : (stateStyle === styles.failedDay ? styles.failedDayText : (stateStyle === styles.partialDay ? styles.partialDayText : null))
                  ]}>
                    {format(day, 'd')}
                  </Text>
                  {/* Always show dots when status is known for non-future days, including won days */}
                  {s && !isFuture ? (
                    <View style={styles.dotRow}>
                      {(() => { const onStyle = isWon ? styles.dotOnWon : styles.dotOn; const offStyle = isPartial ? styles.dotOffPartial : (isFailed ? styles.dotOffFailed : styles.dotOff); return (
                        <>
                          {/* Intention (requires both) */}
                          <View style={[styles.dot, (s.intentionMorning && s.intentionEvening) ? onStyle : offStyle]} />
                          {/* Tasks */}
                          <View style={[styles.dot, s.criticalTasks ? onStyle : offStyle]} />
                          {/* Move */}
                          <View style={[styles.dot, s.workout ? onStyle : offStyle]} />
                          {/* Read */}
                          <View style={[styles.dot, s.reading ? onStyle : offStyle]} />
                          {/* Center */}
                          <View style={[styles.dot, s.prayerMeditation ? onStyle : offStyle]} />
                        </>
                      )})()}
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.emptyDay}></Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    ));
  };

  return (
    <View style={[styles.container, embedded ? { marginHorizontal: 0, marginTop: 0, marginBottom: 0, shadowOpacity: 0, elevation: 0, borderRadius: 0, padding: 0 } : null]}>
      {/* Header with navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {format(currentDate, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Day headers */}
      <View style={styles.weekdays}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <Text key={index} style={styles.weekday}>{day}</Text>
        ))}
      </View>
      
      {/* Days grid */}
      <View style={styles.daysContainer}>
        {renderDays()}
      </View>

      {/* Day Details Modal */}
      <Modal transparent visible={!!detail.open} animationType="fade" onRequestClose={() => setDetail({ open: false })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              {detail.view === 'details' ? (
                <TouchableOpacity onPress={() => setDetail((prev)=> ({ ...prev, view: 'summary' }))} style={styles.headerBtn}><Ionicons name='chevron-back' size={20} color='#111827' /></TouchableOpacity>
              ) : (
                <View style={styles.headerBtn} />
              )}
              <Text style={[styles.modalTitle, { flex: 1, textAlign: 'center' }]}>{detail.dateKey ? format(parseDateKey(detail.dateKey), 'EEEE • MM/dd/yyyy') : 'Day Details'}</Text>
              <TouchableOpacity onPress={() => setDetail({ open: false })} style={styles.headerBtn}><Text style={{ fontWeight: '700', color: '#666' }}>✕</Text></TouchableOpacity>
            </View>
            {detail.loading ? (
              <Text style={{ color: '#6b7280' }}>Loading…</Text>
            ) : detail.view === 'summary' ? (
              (() => {
                const s = detail.status
                const rows: Array<{ label: string; ok: boolean }> = s ? [
                  { label: 'Intention (Morning + Evening)', ok: !!(s.intentionMorning && s.intentionEvening) },
                  { label: "Today’s Tasks", ok: !!s.criticalTasks },
                  { label: 'Move', ok: !!s.workout },
                  { label: 'Read', ok: !!s.reading },
                  { label: 'Center', ok: !!s.prayerMeditation },
                ] : []
                const completedCount = rows.reduce((a, r) => a + (r.ok ? 1 : 0), 0)
                return (
                  <View style={{ paddingTop: 4 }}>
                    {!!s && (
                      <View style={styles.summary}>
                        <Text style={styles.summaryText}>{completedCount}/5 Completed</Text>
                        <View style={styles.summaryDots}>
                          <View style={[styles.modDot, (s.intentionMorning && s.intentionEvening) ? styles.modDotOn : styles.modDotOff]} />
                          <View style={[styles.modDot, s.criticalTasks ? styles.modDotOn : styles.modDotOff]} />
                          <View style={[styles.modDot, s.workout ? styles.modDotOn : styles.modDotOff]} />
                          <View style={[styles.modDot, s.reading ? styles.modDotOn : styles.modDotOff]} />
                          <View style={[styles.modDot, s.prayerMeditation ? styles.modDotOn : styles.modDotOff]} />
                        </View>
                      </View>
                    )}
                    {rows.map((r, idx) => (
                      <TouchableOpacity key={r.label} style={[styles.row, idx < rows.length - 1 ? styles.rowDivider : null]} onPress={async () => {
                        if (!detail.dateKey) return
                        const selected = idx === 0 ? 'intention' : idx === 1 ? 'tasks' : idx === 2 ? 'move' : idx === 3 ? 'read' : 'center'
                        setDetail((prev) => ({ ...prev, loading: true, selected }))
                        const d = await getDailyWinDetails(detail.dateKey)
                        setDetail((prev) => ({ ...prev, loading: false, view: 'details', details: d, selected }))
                      }}>
                        <Text style={styles.rowText}>{r.label}</Text>
                        <View style={[styles.iconBadge, r.ok ? styles.iconBadgeOk : styles.iconBadgeFail]}>
                          <Ionicons name={r.ok ? 'checkmark' : 'close'} size={14} color={r.ok ? '#065f46' : '#7f1d1d'} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              })()
            ) : (
              (() => {
                const d = detail.details
                if (!d) return null
                const renderIntention = () => (
                  <View>
                    <Text style={styles.pillHeader}>Intention</Text>
                    <Text style={styles.sectionHeader}>Morning</Text>
                    {d.intentionMorning.length === 0 ? <Text style={styles.emptyText}>No morning routines</Text> : d.intentionMorning.map((i) => (
                      <View key={`m-${i.id}`} style={styles.detailRow}><Text style={styles.detailText}>{i.title}</Text><View style={[styles.iconBadge, i.completed ? styles.iconBadgeOk : styles.iconBadgeFail]}><Ionicons name={i.completed ? 'checkmark' : 'close'} size={14} color={i.completed ? '#065f46' : '#7f1d1d'} /></View></View>
                    ))}
                    <Text style={styles.sectionHeader}>Evening</Text>
                    {d.intentionEvening.length === 0 ? <Text style={styles.emptyText}>No evening routines</Text> : d.intentionEvening.map((i) => (
                      <View key={`e-${i.id}`} style={styles.detailRow}><Text style={styles.detailText}>{i.title}</Text><View style={[styles.iconBadge, i.completed ? styles.iconBadgeOk : styles.iconBadgeFail]}><Ionicons name={i.completed ? 'checkmark' : 'close'} size={14} color={i.completed ? '#065f46' : '#7f1d1d'} /></View></View>
                    ))}
                  </View>
                )
                const renderTasks = () => (
                  <View>
                    <Text style={styles.pillHeader}>Today’s Tasks</Text>
                    {d.tasks.length === 0 ? <Text style={styles.emptyText}>No tasks</Text> : d.tasks.map((t) => (
                      <View key={`t-${t.id}`} style={styles.detailRow}><Text style={styles.detailText}>{t.title}{t.timeText ? ` • ${t.timeText}` : ''}</Text><View style={[styles.iconBadge, t.done ? styles.iconBadgeOk : styles.iconBadgeFail]}><Ionicons name={t.done ? 'checkmark' : 'close'} size={14} color={t.done ? '#065f46' : '#7f1d1d'} /></View></View>
                    ))}
                  </View>
                )
                const renderWorkout = () => (
                  <View>
                    <Text style={styles.pillHeader}>Move</Text>
                    {d.workout.length === 0 ? (
                      <View style={styles.detailRow}><Text style={styles.detailText}>No sessions</Text><View style={[styles.iconBadge, styles.iconBadgeFail]}><Ionicons name='close' size={14} color='#7f1d1d' /></View></View>
                    ) : d.workout.map((s) => (
                      <View key={`w-${s.id}`} style={styles.detailRow}><Text style={styles.detailText}>{Math.round((s.durationSec||0)/60)} min workout</Text><View style={[styles.iconBadge, styles.iconBadgeOk]}><Ionicons name='checkmark' size={14} color='#065f46' /></View></View>
                    ))}
                  </View>
                )
                const renderReading = () => (
                  <View>
                    <Text style={styles.pillHeader}>Read</Text>
                    {d.reading.length === 0 ? (
                      <View style={styles.detailRow}><Text style={styles.detailText}>No sessions</Text><View style={[styles.iconBadge, styles.iconBadgeFail]}><Ionicons name='close' size={14} color='#7f1d1d' /></View></View>
                    ) : d.reading.map((s) => (
                      <View key={`r-${s.id}`} style={styles.detailRow}><Text style={styles.detailText}>{Math.round((s.durationSec||0)/60)} min{ s.bookTitle ? ` • ${s.bookTitle}` : '' }</Text><View style={[styles.iconBadge, styles.iconBadgeOk]}><Ionicons name='checkmark' size={14} color='#065f46' /></View></View>
                    ))}
                  </View>
                )
                const renderCenter = () => (
                  <View>
                    <Text style={styles.pillHeader}>Center</Text>
                    {d.center.length === 0 ? (
                      <View style={styles.detailRow}><Text style={styles.detailText}>No sessions</Text><View style={[styles.iconBadge, styles.iconBadgeFail]}><Ionicons name='close' size={14} color='#7f1d1d' /></View></View>
                    ) : d.center.map((s) => (
                      <View key={`c-${s.id}`} style={styles.detailRow}><Text style={styles.detailText}>{Math.round((s.durationSec||0)/60)} min meditation</Text><View style={[styles.iconBadge, styles.iconBadgeOk]}><Ionicons name='checkmark' size={14} color='#065f46' /></View></View>
                    ))}
                  </View>
                )
                return (
                  <View>
                    {detail.selected === 'intention' ? renderIntention() : null}
                    {detail.selected === 'tasks' ? renderTasks() : null}
                    {detail.selected === 'move' ? renderWorkout() : null}
                    {detail.selected === 'read' ? renderReading() : null}
                    {detail.selected === 'center' ? renderCenter() : null}
                  </View>
                )
              })()
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  daysContainer: {
    paddingVertical: 10,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 100,
    backgroundColor: '#f8f8f8',
  },
  wonDay: {
    backgroundColor: '#DCFCE7', // green-100
    borderWidth: 1,
    borderColor: '#16A34A', // green-600 ring
  },
  partialDay: {
    backgroundColor: '#FEF9C3', // yellow-100
    borderWidth: 1,
    borderColor: '#EAB308', // yellow-500 ring
  },
  failedDay: {
    backgroundColor: '#FEE2E2', // red-100
    borderWidth: 1,
    borderColor: '#EF4444', // red-500 ring
  },
  emptyDay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  selectedDay: {
    backgroundColor: '#DBEAFE', // blue-100
    borderWidth: 1,
    borderColor: '#3B82F6', // blue-600 ring
  },
  dayText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  wonDayText: { color: '#065f46' },
  selectedDayText: {
    color: '#1f2937',
  },
  partialDayText: {
    color: '#92400E',
    fontWeight: '700',
  },
  failedDayText: {
    color: '#991B1B',
    fontWeight: '700',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotOn: {
    backgroundColor: '#10B981',
  },
  dotOnWon: { backgroundColor: '#10B981' },
  dotOff: {
    backgroundColor: '#ffffff',
  },
  modalOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 520,
    // taller card
    minHeight: 300,
    // subtle shadow
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSpacer: { width: 24 },
  closeButton: { width: 24, alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowText: { color: '#0f172a', fontSize: 16, fontWeight: '600' },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryText: { color: '#0f172a', fontWeight: '700' },
  summaryDots: { flexDirection: 'row', gap: 4 },
  modDot: { width: 8, height: 8, borderRadius: 4 },
  modDotOn: { backgroundColor: '#10B981' },
  modDotOff: { backgroundColor: '#E2E8F0' },
  iconBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconBadgeOk: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0' },
  iconBadgeFail: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  dotOffPartial: { backgroundColor: '#EF4444' },
  dotOffFailed: { backgroundColor: '#EF4444' },
  sectionHeader: { marginTop: 14, marginBottom: 6, fontWeight: '700', color: '#111827' },
  emptyText: { color: '#6b7280', marginVertical: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  detailText: { color: '#111827' },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { width: 24, alignItems: 'flex-start' },
  pillHeader: { fontSize: 14, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  headerBtn: { width: 24, alignItems: 'center' },

});