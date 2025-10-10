import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DatePickerInput from './DatePickerInput'

interface WeeklyScheduleSelectorProps {
  selectedDays: number[]  // 0=Sun, 1=Mon, ..., 6=Sat
  onDaysChange: (days: number[]) => void
  startDate: string
  onStartDateChange: (date: string) => void
  endDate?: string
  onEndDateChange: (date: string | undefined) => void
}

const WeeklyScheduleSelector: React.FC<WeeklyScheduleSelectorProps> = ({
  selectedDays,
  onDaysChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}) => {
  const days = [
    { value: 0, label: 'Sun', fullName: 'Sunday' },
    { value: 1, label: 'Mon', fullName: 'Monday' },
    { value: 2, label: 'Tue', fullName: 'Tuesday' },
    { value: 3, label: 'Wed', fullName: 'Wednesday' },
    { value: 4, label: 'Thu', fullName: 'Thursday' },
    { value: 5, label: 'Fri', fullName: 'Friday' },
    { value: 6, label: 'Sat', fullName: 'Saturday' },
  ]

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onDaysChange(selectedDays.filter(d => d !== day))
    } else {
      onDaysChange([...selectedDays, day].sort((a, b) => a - b))
    }
  }

  const getDayNames = () => {
    if (selectedDays.length === 0) return 'No days selected'
    if (selectedDays.length === 7) return 'Every day'
    return selectedDays.map(d => days[d].label).join(', ')
  }

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

  const formatDateDisplay = (dateStr: string | undefined) => {
    if (!dateStr || dateStr === 'Invalid Date') return 'Today'
    if (dateStr === getTodayLocal()) return 'Today'
    return parseDateLocal(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Select Days</Text>
        <View style={styles.daysGrid}>
          {days.map((day) => (
            <TouchableOpacity
              key={day.value}
              style={[
                styles.dayButton,
                selectedDays.includes(day.value) && styles.dayButtonSelected
              ]}
              onPress={() => toggleDay(day.value)}
            >
              <Text style={[
                styles.dayButtonText,
                selectedDays.includes(day.value) && styles.dayButtonTextSelected
              ]}>
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {selectedDays.length > 0 && (
        <View style={styles.preview}>
          <Ionicons name="information-circle-outline" size={16} color="#4A90E2" />
          <Text style={styles.previewText}>
            Repeats every {getDayNames()} starting {formatDateDisplay(startDate)}
            {endDate && ` until ${formatDateDisplay(endDate)}`}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Start Date</Text>
        <DatePickerInput
          value={startDate}
          onChange={onStartDateChange}
          label=""
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>End Date (Optional)</Text>
          {endDate && (
            <TouchableOpacity onPress={() => onEndDateChange(undefined)}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <DatePickerInput
          value={endDate || ''}
          onChange={(date) => onEndDateChange(date || undefined)}
          label=""
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: '13%',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  dayButtonTextSelected: {
    color: '#2563EB',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  previewText: {
    flex: 1,
    fontSize: 13,
    color: '#2563EB',
    lineHeight: 18,
  },
})

export default WeeklyScheduleSelector

