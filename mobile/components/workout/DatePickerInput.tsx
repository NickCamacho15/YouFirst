import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface DatePickerInputProps {
  value: string  // ISO date string
  onChange: (date: string) => void
  label?: string
  minDate?: string  // ISO date string
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  label = 'Select Date',
  minDate,
}) => {
  // For now, show a simple date display with navigation
  // In a production app, you'd use @react-native-community/datetimepicker
  
  const adjustDate = (days: number) => {
    const currentDate = new Date(value)
    currentDate.setDate(currentDate.getDate() + days)
    const newDateStr = currentDate.toISOString().split('T')[0]
    
    // Check min date
    if (minDate && newDateStr < minDate) {
      return
    }
    
    onChange(newDateStr)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  const isTomorrow = (dateStr: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return dateStr === tomorrow.toISOString().split('T')[0]
  }

  const getDateLabel = (dateStr: string) => {
    if (isToday(dateStr)) return 'Today'
    if (isTomorrow(dateStr)) return 'Tomorrow'
    return formatDate(dateStr)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={styles.dateContainer}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => adjustDate(-1)}
        >
          <Ionicons name="chevron-back" size={24} color="#4A90E2" />
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <Ionicons name="calendar" size={20} color="#4A90E2" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateMainText}>{getDateLabel(value)}</Text>
            {(isToday(value) || isTomorrow(value)) && (
              <Text style={styles.dateSubText}>{formatDate(value)}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => adjustDate(1)}
        >
          <Ionicons name="chevron-forward" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickButton, isToday(value) && styles.quickButtonActive]}
          onPress={() => onChange(new Date().toISOString().split('T')[0])}
        >
          <Text style={[styles.quickButtonText, isToday(value) && styles.quickButtonTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.quickButton, isTomorrow(value) && styles.quickButtonActive]}
          onPress={() => {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            onChange(tomorrow.toISOString().split('T')[0])
          }}
        >
          <Text style={[styles.quickButtonText, isTomorrow(value) && styles.quickButtonTextActive]}>
            Tomorrow
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickButton}
          onPress={() => {
            const nextWeek = new Date()
            nextWeek.setDate(nextWeek.getDate() + 7)
            onChange(nextWeek.toISOString().split('T')[0])
          }}
        >
          <Text style={styles.quickButtonText}>Next Week</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#BBDEFB',
  },
  navButton: {
    padding: 4,
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  dateSubText: {
    fontSize: 13,
    color: '#4A90E2',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  quickButtonTextActive: {
    color: '#2563EB',
  },
})

export default DatePickerInput

