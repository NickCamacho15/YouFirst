import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
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
  const [showPicker, setShowPicker] = useState(false)

  // Parse date string in local timezone to avoid UTC conversion issues
  const parseDateLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const getTodayLocal = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No date selected'
    const date = parseDateLocal(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const isToday = (dateStr: string) => {
    if (!dateStr) return false
    return dateStr === getTodayLocal()
  }

  const isTomorrow = (dateStr: string) => {
    if (!dateStr) return false
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const year = tomorrow.getFullYear()
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const day = String(tomorrow.getDate()).padStart(2, '0')
    return dateStr === `${year}-${month}-${day}`
  }

  const getDateLabel = (dateStr: string) => {
    if (!dateStr) return 'No date selected'
    if (isToday(dateStr)) return 'Today'
    if (isTomorrow(dateStr)) return 'Tomorrow'
    return formatDate(dateStr)
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false)
    }
    
    if (selectedDate) {
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      // Check min date
      if (minDate && dateStr < minDate) {
        return
      }
      
      onChange(dateStr)
    }
  }

  // If no value, default to today for the picker
  const dateValue = value ? parseDateLocal(value) : new Date()
  const minimumDate = minDate ? parseDateLocal(minDate) : undefined

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={styles.dateContainer}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Ionicons name="calendar" size={24} color="#4A90E2" />
        <View style={styles.dateTextContainer}>
          <Text style={[styles.dateMainText, !value && styles.placeholderText]}>
            {getDateLabel(value)}
          </Text>
          {value && (isToday(value) || isTomorrow(value)) && (
            <Text style={styles.dateSubText}>{formatDate(value)}</Text>
          )}
        </View>
        <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={20} color="#4A90E2" />
      </TouchableOpacity>

      {showPicker && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={dateValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={minimumDate}
            textColor="#333"
          />
        </View>
      )}

      {Platform.OS === 'ios' && showPicker && (
        <View style={styles.pickerActions}>
          <TouchableOpacity 
            style={styles.pickerButton}
            onPress={() => setShowPicker(false)}
          >
            <Text style={styles.pickerButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
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
  dateTextContainer: {
    flex: 1,
  },
  dateMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  placeholderText: {
    color: '#999',
    fontWeight: '500',
  },
  dateSubText: {
    fontSize: 13,
    color: '#4A90E2',
    marginTop: 2,
  },
  pickerContainer: {
    marginTop: 6,
    marginBottom: 16,
  },
  pickerActions: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 8,
  },
  pickerButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  pickerButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})

export default DatePickerInput

