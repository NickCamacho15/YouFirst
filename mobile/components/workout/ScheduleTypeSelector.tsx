import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScheduleType } from '../../lib/workout-assignments'

interface ScheduleTypeSelectorProps {
  value: ScheduleType
  onChange: (type: ScheduleType) => void
}

const ScheduleTypeSelector: React.FC<ScheduleTypeSelectorProps> = ({ value, onChange }) => {
  const options: Array<{ value: ScheduleType; label: string; description: string; icon: string }> = [
    {
      value: 'immediate',
      label: 'Assign Now',
      description: 'Available immediately',
      icon: 'flash-outline',
    },
    {
      value: 'once',
      label: 'Specific Date',
      description: 'Schedule for one day',
      icon: 'calendar-outline',
    },
    {
      value: 'weekly',
      label: 'Weekly Recurring',
      description: 'Repeat on selected days',
      icon: 'repeat-outline',
    },
  ]

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[styles.option, value === option.value && styles.optionSelected]}
          onPress={() => onChange(option.value)}
        >
          <View style={styles.optionContent}>
            <View style={styles.radio}>
              {value === option.value ? (
                <Ionicons name="radio-button-on" size={24} color="#8B5CF6" />
              ) : (
                <Ionicons name="radio-button-off" size={24} color="#ccc" />
              )}
            </View>
            <View style={styles.optionText}>
              <View style={styles.optionHeader}>
                <Ionicons
                  name={option.icon as any}
                  size={18}
                  color={value === option.value ? '#8B5CF6' : '#666'}
                />
                <Text style={[styles.optionLabel, value === option.value && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
              </View>
              <Text style={[styles.optionDescription, value === option.value && styles.optionDescriptionSelected]}>
                {option.description}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  option: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: '#F3E8FF',
    borderColor: '#8B5CF6',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 24,
    height: 24,
  },
  optionText: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionLabelSelected: {
    color: '#7C3AED',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  optionDescriptionSelected: {
    color: '#9333EA',
  },
})

export default ScheduleTypeSelector

