import React, { useState } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ScheduleTypeSelector from './ScheduleTypeSelector'
import DatePickerInput from './DatePickerInput'
import WeeklyScheduleSelector from './WeeklyScheduleSelector'

export type ScheduleType = 'once' | 'weekly'

export interface PublishScheduleParams {
  scheduleType: ScheduleType
  scheduledDate?: string
  recurrenceDays?: number[]
  startDate?: string
  endDate?: string
}

interface PublishWorkoutModalProps {
  visible: boolean
  onClose: () => void
  workoutName: string
  onPublish: (scheduleParams: PublishScheduleParams) => Promise<void>
}

const PublishWorkoutModal: React.FC<PublishWorkoutModalProps> = ({
  visible,
  onClose,
  workoutName,
  onPublish,
}) => {
  const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [scheduleType, setScheduleType] = useState<ScheduleType>('once')
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString())
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [startDate, setStartDate] = useState<string>(getLocalDateString())
  const [endDate, setEndDate] = useState<string | undefined>(undefined)
  const [publishing, setPublishing] = useState(false)

  const resetModal = () => {
    setScheduleType('once')
    setSelectedDate(getLocalDateString())
    setSelectedDays([])
    setStartDate(getLocalDateString())
    setEndDate(undefined)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const canPublish = () => {
    if (scheduleType === 'once') {
      return selectedDate !== ''
    }
    if (scheduleType === 'weekly') {
      return selectedDays.length > 0
    }
    return false
  }

  const handlePublish = async () => {
    if (!canPublish()) {
      console.log('[PublishWorkoutModal] Cannot publish - incomplete schedule')
      Alert.alert('Incomplete Schedule', 'Please complete the schedule settings')
      return
    }

    console.log('[PublishWorkoutModal] Starting publish...')
    setPublishing(true)
    try {
      const scheduleParams: PublishScheduleParams = {
        scheduleType,
      }

      if (scheduleType === 'once') {
        scheduleParams.scheduledDate = selectedDate
      }

      if (scheduleType === 'weekly') {
        scheduleParams.recurrenceDays = selectedDays
        scheduleParams.startDate = startDate
        scheduleParams.endDate = endDate
      }

      console.log('[PublishWorkoutModal] Calling onPublish with params:', scheduleParams)
      await onPublish(scheduleParams)
      console.log('[PublishWorkoutModal] Publish successful, closing modal')
      handleClose()
    } catch (error: any) {
      console.error('[PublishWorkoutModal] Publish failed:', error)
      Alert.alert('Error', error.message || 'Failed to publish workout')
    } finally {
      console.log('[PublishWorkoutModal] Setting publishing to false')
      setPublishing(false)
    }
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

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || dateStr === 'Invalid Date') return 'Today'
    if (dateStr === getTodayLocal()) return 'Today'
    return parseDateLocal(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getScheduleSummary = () => {
    if (scheduleType === 'once') {
      return `Scheduled for ${formatDateDisplay(selectedDate)}`
    }
    if (scheduleType === 'weekly') {
      if (selectedDays.length === 0) return ''
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const days = selectedDays.length === 7 
        ? 'day' 
        : selectedDays.map(d => dayNames[d]).join(', ')
      
      let summary = `Repeats every ${days} starting ${formatDateDisplay(startDate)}`
      if (endDate) {
        summary += ` until ${formatDateDisplay(endDate)}`
      }
      return summary
    }
    return ''
  }

  const showSummary = () => {
    if (scheduleType === 'once') return true
    if (scheduleType === 'weekly') return selectedDays.length > 0
    return false
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publish Workout</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Workout Name */}
          <View style={styles.section}>
            <Text style={styles.workoutName}>{workoutName}</Text>
            <Text style={styles.description}>
              Set a schedule for when this workout will be available. 
              Once published, you'll see it in your Workouts tab on the scheduled days.
            </Text>
          </View>

          {/* Schedule Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule Type</Text>
            <ScheduleTypeSelector
              selectedType={scheduleType}
              onSelect={setScheduleType}
            />
          </View>

          {/* Schedule Details */}
          {scheduleType === 'once' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <DatePickerInput
                value={selectedDate}
                onChange={setSelectedDate}
                label=""
              />
            </View>
          )}

          {scheduleType === 'weekly' && (
            <View style={styles.section}>
              <WeeklyScheduleSelector
                selectedDays={selectedDays}
                onDaysChange={setSelectedDays}
                startDate={startDate}
                onStartDateChange={setStartDate}
                endDate={endDate}
                onEndDateChange={setEndDate}
              />
            </View>
          )}

          {/* Summary */}
          {showSummary() && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="information-circle" size={20} color="#4A90E2" />
                <Text style={styles.summaryTitle}>Schedule Summary</Text>
              </View>
              <Text style={styles.summaryText}>{getScheduleSummary()}</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleClose}
            disabled={publishing}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.publishButton, !canPublish() && styles.publishButtonDisabled]}
            onPress={handlePublish}
            disabled={!canPublish() || publishing}
          >
            {publishing ? (
              <Text style={styles.publishButtonText}>Publishing...</Text>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.publishButtonText}>Publish</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E40AF',
  },
  summaryText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  publishButton: {
    backgroundColor: '#10B981',
  },
  publishButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})

export default PublishWorkoutModal

