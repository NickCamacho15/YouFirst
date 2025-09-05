import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { getWinsForMonth, subscribeWins, toDateKey } from '../lib/wins'

export default function Calendar({ embedded }: { embedded?: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wonDays, setWonDays] = useState<Set<string>>(new Set())
  
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

  // Load wins for the visible month and refresh on win events
  useEffect(() => {
    let unsub: (() => void) | undefined
    const load = async () => {
      try { setWonDays(await getWinsForMonth(currentDate)) } catch { setWonDays(new Set()) }
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
    
    return weeks.map((week, i) => (
      <View key={i} style={styles.week}>
        {week.map((day, j) => {
          const isWon = !!(day && wonDays.has(toDateKey(day!)))
          const isSelected = !!(day && isSameDay(day!, selectedDate))
          return (
            <TouchableOpacity
              key={j}
              style={[styles.day, isWon ? styles.wonDay : isSelected ? styles.selectedDay : null]}
              onPress={() => day && setSelectedDate(day)}
              disabled={!day}
            >
              {day ? (
                <Text style={[styles.dayText, isWon ? styles.wonDayText : isSelected ? styles.selectedDayText : null]}>
                  {format(day, 'd')}
                </Text>
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
    backgroundColor: '#22C55E',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  emptyDay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  selectedDay: {
    backgroundColor: '#4A90E2',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  dayText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  wonDayText: {
    color: 'white',
  },
  selectedDayText: {
    color: 'white',
  },

});