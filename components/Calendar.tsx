"use client"

import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // Get days of current month
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Calculate first day of month for proper grid alignment
  const startDay = monthStart.getDay()
  const daysArray = Array(startDay).fill(null).concat(daysInMonth)
  
  // Navigation
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1))
  
  // Render day cells
  const renderDays = () => {
    const weeks = []
    let days = []
    
    daysArray.forEach((day, i) => {
      if (i > 0 && i % 7 === 0) {
        weeks.push(days)
        days = []
      }
      
      days.push(day)
      
      if (i === daysArray.length - 1) {
        // Fill in any remaining cells to complete the grid
        while (days.length < 7) {
          days.push(null)
        }
        weeks.push(days)
      }
    })
    
    return weeks.map((week, i) => (
      <View key={i} style={styles.week}>
        {week.map((day, j) => (
          <TouchableOpacity
            key={j}
            style={[
              styles.day,
              day && isSameDay(day, selectedDate) && styles.selectedDay
            ]}
            onPress={() => day && setSelectedDate(day)}
            disabled={!day}
          >
            {day && (
              <Text style={[
                styles.dayText,
                day && isSameDay(day, selectedDate) && styles.selectedDayText
              ]}>
                {format(day, 'd')}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    ))
  }

  return (
    <View style={styles.container}>
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
      
      {/* Streak Stats */}
      <View style={styles.streakContainer}>
        <View style={styles.streakItem}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakLabel}>Current Streak: </Text>
          <Text style={styles.streakValue}>0 days</Text>
        </View>
        <View style={styles.streakItem}>
          <Text style={styles.streakIcon}>🏆</Text>
          <Text style={styles.streakLabel}>Best: </Text>
          <Text style={styles.streakValue}>0 days</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 16,
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
    fontSize: 18,
    fontWeight: '500',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
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
  selectedDay: {
    backgroundColor: '#4A90E2',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedDayText: {
    color: 'white',
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  streakItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIcon: {
    marginRight: 4,
    fontSize: 16,
  },
  streakLabel: {
    fontSize: 16,
    color: '#666',
  },
  streakValue: {
    fontSize: 16,
    fontWeight: '600',
  }
})
