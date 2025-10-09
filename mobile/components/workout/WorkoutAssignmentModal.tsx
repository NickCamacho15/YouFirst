import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { listGroupMembers, assignWorkoutToUser, type GroupMember, type ScheduleType, type ScheduleParams } from '../../lib/workout-assignments'
import ScheduleTypeSelector from './ScheduleTypeSelector'
import DatePickerInput from './DatePickerInput'
import WeeklyScheduleSelector from './WeeklyScheduleSelector'

interface WorkoutAssignmentModalProps {
  visible: boolean
  onClose: () => void
  workoutId: string
  workoutName: string
}

type Step = 'members' | 'schedule' | 'review'

const WorkoutAssignmentModal: React.FC<WorkoutAssignmentModalProps> = ({
  visible,
  onClose,
  workoutId,
  workoutName,
}) => {
  // Member selection state
  const [members, setMembers] = useState<GroupMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Multi-step state
  const [currentStep, setCurrentStep] = useState<Step>('members')
  
  // Schedule state
  const [scheduleType, setScheduleType] = useState<ScheduleType>('immediate')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (visible) {
      loadMembers()
      resetModal()
    }
  }, [visible])

  const resetModal = () => {
    setSelectedMembers(new Set())
    setCurrentStep('members')
    setScheduleType('immediate')
    setSelectedDate(new Date().toISOString().split('T')[0])
    setSelectedDays([])
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate(undefined)
    setError(null)
  }

  const loadMembers = async () => {
    setLoading(true)
    try {
      const data = await listGroupMembers()
      // Filter out admins - typically you assign workouts to regular users
      setMembers(data.filter(m => m.role !== 'admin'))
    } catch (err: any) {
      console.error('Failed to load members:', err)
      setError(err.message || 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const toggleMember = (memberId: string) => {
    const newSet = new Set(selectedMembers)
    if (newSet.has(memberId)) {
      newSet.delete(memberId)
    } else {
      newSet.add(memberId)
    }
    setSelectedMembers(newSet)
  }

  const selectAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(members.map(m => m.id)))
    }
  }

  const canProceedToSchedule = () => {
    return selectedMembers.size > 0
  }

  const canProceedToReview = () => {
    if (scheduleType === 'once') {
      return selectedDate !== ''
    }
    if (scheduleType === 'weekly') {
      return selectedDays.length > 0
    }
    return true  // immediate is always valid
  }

  const handleAssign = async () => {
    setAssigning(true)
    setError(null)
    try {
      const scheduleParams: ScheduleParams | undefined = scheduleType === 'immediate' 
        ? undefined 
        : {
            scheduleType,
            ...(scheduleType === 'once' && { scheduledDate: selectedDate }),
            ...(scheduleType === 'weekly' && {
              recurrenceDays: selectedDays,
              startDate,
              ...(endDate && { endDate }),
            }),
          }

      const promises = Array.from(selectedMembers).map(userId =>
        assignWorkoutToUser(workoutId, userId, scheduleParams)
      )
      await Promise.all(promises)
      onClose()
    } catch (err: any) {
      console.error('Failed to assign workout:', err)
      setError(err.message || 'Failed to assign workout')
    } finally {
      setAssigning(false)
    }
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.step, currentStep === 'members' && styles.stepActive]}>
        <View style={styles.stepCircle}>
          <Text style={styles.stepNumber}>1</Text>
        </View>
        <Text style={styles.stepLabel}>Members</Text>
      </View>
      <View style={styles.stepLine} />
      <View style={[styles.step, currentStep === 'schedule' && styles.stepActive]}>
        <View style={styles.stepCircle}>
          <Text style={styles.stepNumber}>2</Text>
        </View>
        <Text style={styles.stepLabel}>Schedule</Text>
      </View>
      <View style={styles.stepLine} />
      <View style={[styles.step, currentStep === 'review' && styles.stepActive]}>
        <View style={styles.stepCircle}>
          <Text style={styles.stepNumber}>3</Text>
        </View>
        <Text style={styles.stepLabel}>Review</Text>
      </View>
    </View>
  )

  const renderMembersStep = () => (
    <>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      ) : members.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No members found</Text>
          <Text style={styles.emptySubtext}>Invite members to your group first</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity style={styles.selectAllButton} onPress={selectAll}>
            <Ionicons
              name={selectedMembers.size === members.length ? "checkbox" : "square-outline"}
              size={20}
              color="#4A90E2"
            />
            <Text style={styles.selectAllText}>
              {selectedMembers.size === members.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          {members.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.memberItem}
              onPress={() => toggleMember(member.id)}
            >
              <View style={styles.checkbox}>
                <Ionicons
                  name={selectedMembers.has(member.id) ? "checkbox" : "square-outline"}
                  size={24}
                  color={selectedMembers.has(member.id) ? "#4A90E2" : "#ccc"}
                />
              </View>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>
                  {member.username?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.username || 'No username'}</Text>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </>
  )

  const renderScheduleStep = () => (
    <>
      <ScheduleTypeSelector 
        value={scheduleType} 
        onChange={setScheduleType} 
      />

      {scheduleType === 'once' && (
        <View style={styles.scheduleDetail}>
          <DatePickerInput
            value={selectedDate}
            onChange={setSelectedDate}
            label="Select Date"
            minDate={new Date().toISOString().split('T')[0]}
          />
        </View>
      )}

      {scheduleType === 'weekly' && (
        <View style={styles.scheduleDetail}>
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
    </>
  )

  const renderReviewStep = () => {
    const getScheduleDescription = () => {
      if (scheduleType === 'immediate') {
        return 'Available immediately'
      }
      if (scheduleType === 'once') {
        const date = new Date(selectedDate)
        return `Scheduled for ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
      }
      if (scheduleType === 'weekly') {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const days = selectedDays.map(d => dayNames[d]).join(', ')
        return `Every ${days} starting ${new Date(startDate).toLocaleDateString()}${endDate ? ` until ${new Date(endDate).toLocaleDateString()}` : ''}`
      }
      return ''
    }

    return (
      <View style={styles.reviewContainer}>
        <View style={styles.reviewSection}>
          <View style={styles.reviewHeader}>
            <Ionicons name="people" size={20} color="#4A90E2" />
            <Text style={styles.reviewTitle}>Assigning to {selectedMembers.size} {selectedMembers.size === 1 ? 'member' : 'members'}</Text>
          </View>
          <View style={styles.reviewMembersList}>
            {Array.from(selectedMembers).map(memberId => {
              const member = members.find(m => m.id === memberId)
              return member ? (
                <View key={memberId} style={styles.reviewMemberChip}>
                  <Text style={styles.reviewMemberName}>{member.username || member.email}</Text>
                </View>
              ) : null
            })}
          </View>
        </View>

        <View style={styles.reviewSection}>
          <View style={styles.reviewHeader}>
            <Ionicons name="calendar" size={20} color="#4A90E2" />
            <Text style={styles.reviewTitle}>Schedule</Text>
          </View>
          <Text style={styles.reviewText}>{getScheduleDescription()}</Text>
        </View>

        <View style={styles.confirmBox}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.confirmText}>Ready to assign "{workoutName}"</Text>
        </View>
      </View>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Assign Workout</Text>
              <Text style={styles.subtitle}>{workoutName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {renderStepIndicator()}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {currentStep === 'members' && renderMembersStep()}
            {currentStep === 'schedule' && renderScheduleStep()}
            {currentStep === 'review' && renderReviewStep()}
          </ScrollView>

          <View style={styles.footer}>
            {currentStep !== 'members' && (
              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={() => {
                  if (currentStep === 'schedule') setCurrentStep('members')
                  if (currentStep === 'review') setCurrentStep('schedule')
                }}
                disabled={assigning}
              >
                <Ionicons name="chevron-back" size={20} color="#666" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button, 
                styles.primaryButton,
                currentStep === 'members' && !canProceedToSchedule() && styles.disabledButton,
                currentStep === 'schedule' && !canProceedToReview() && styles.disabledButton,
                assigning && styles.disabledButton,
              ]}
              onPress={() => {
                if (currentStep === 'members') {
                  if (canProceedToSchedule()) setCurrentStep('schedule')
                } else if (currentStep === 'schedule') {
                  if (canProceedToReview()) setCurrentStep('review')
                } else {
                  handleAssign()
                }
              }}
              disabled={
                (currentStep === 'members' && !canProceedToSchedule()) ||
                (currentStep === 'schedule' && !canProceedToReview()) ||
                assigning
              }
            >
              {assigning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {currentStep === 'review' ? 'Assign Workout' : 'Next'}
                  </Text>
                  {currentStep !== 'review' && <Ionicons name="chevron-forward" size={20} color="#fff" />}
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 4,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  step: {
    alignItems: 'center',
    opacity: 0.4,
  },
  stepActive: {
    opacity: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#BBDEFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#BBDEFB',
    marginHorizontal: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
  content: {
    maxHeight: 450,
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#999',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#666',
  },
  scheduleDetail: {
    marginTop: 20,
  },
  reviewContainer: {
    gap: 20,
  },
  reviewSection: {
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reviewText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  reviewMembersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewMemberChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reviewMemberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  confirmBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confirmText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  backButton: {
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
})

export default WorkoutAssignmentModal
