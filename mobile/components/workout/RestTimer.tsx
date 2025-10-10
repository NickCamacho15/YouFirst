/**
 * Rest Timer Component
 * 
 * Countdown timer that appears between sets:
 * - Shows remaining time
 * - Skip button
 * - Add 30s button
 * - Auto-dismiss when complete
 * - Visual progress ring
 */

import React, { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface RestTimerProps {
  visible: boolean
  duration: number  // in seconds
  onComplete: () => void
  onSkip: () => void
  onExtend: (seconds: number) => void
}

export default function RestTimer({
  visible,
  duration,
  onComplete,
  onSkip,
  onExtend,
}: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [totalDuration, setTotalDuration] = useState(duration)
  const progressAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (visible) {
      setTimeLeft(duration)
      setTotalDuration(duration)
      progressAnim.setValue(1)
    }
  }, [visible, duration])

  useEffect(() => {
    if (!visible || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1
        
        // Update progress animation
        const progress = newTime / totalDuration
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 100,
          useNativeDriver: true,
        }).start()

        if (newTime <= 0) {
          onComplete()
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [visible, timeLeft, totalDuration])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`
    }
    return `${secs}s`
  }

  const handleExtend = () => {
    setTimeLeft((prev) => prev + 30)
    setTotalDuration((prev) => prev + 30)
    onExtend(30)
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rest Time</Text>
            <TouchableOpacity onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Timer Display */}
          <View style={styles.timerContainer}>
            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              <Text style={styles.timerLabel}>remaining</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.extendButton}
              onPress={handleExtend}
            >
              <Ionicons name="add-circle-outline" size={20} color="#4A90E2" />
              <Text style={styles.extendButtonText}>+30s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
            >
              <Text style={styles.skipButtonText}>Skip Rest</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Account for home indicator
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  timerContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#EBF5FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 8,
    borderColor: "#4A90E2",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#4A90E2",
  },
  timerLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  extendButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#EBF5FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4A90E2",
    gap: 8,
  },
  extendButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A90E2",
  },
  skipButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: "#4A90E2",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
})

