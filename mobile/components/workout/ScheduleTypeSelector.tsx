import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type ScheduleType = 'once' | 'weekly'

interface ScheduleTypeSelectorProps {
  selectedType: ScheduleType
  onSelect: (type: ScheduleType) => void
}

const ScheduleTypeSelector: React.FC<ScheduleTypeSelectorProps> = ({ selectedType, onSelect }) => {
  const options: Array<{ value: ScheduleType; label: string; description: string; icon: string }> = [
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
          style={[styles.option, selectedType === option.value && styles.optionSelected]}
          onPress={() => onSelect(option.value)}
        >
          <View style={styles.optionContent}>
            <View style={styles.radio}>
              {selectedType === option.value ? (
                <Ionicons name="radio-button-on" size={24} color="#4A90E2" />
              ) : (
                <Ionicons name="radio-button-off" size={24} color="#ccc" />
              )}
            </View>
            <View style={styles.optionText}>
              <View style={styles.optionHeader}>
                <Ionicons
                  name={option.icon as any}
                  size={18}
                  color={selectedType === option.value ? '#4A90E2' : '#666'}
                />
                <Text style={[styles.optionLabel, selectedType === option.value && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
              </View>
              <Text style={[styles.optionDescription, selectedType === option.value && styles.optionDescriptionSelected]}>
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
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
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
    color: '#2563EB',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  optionDescriptionSelected: {
    color: '#4A90E2',
  },
})

export default ScheduleTypeSelector

