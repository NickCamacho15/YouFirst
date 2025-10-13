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
import Svg, { Circle } from "react-native-svg"

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
  const [progress, setProgress] = useState(1) // 1 -> 0
  const endTimeMsRef = useRef<number>(Date.now())

  useEffect(() => {
    if (visible) {
      setTimeLeft(duration)
      setTotalDuration(duration)
      setProgress(1)
      endTimeMsRef.current = Date.now() + duration * 1000
    }
  }, [visible, duration])

  useEffect(() => {
    if (!visible) return

    const tick = () => {
      const now = Date.now()
      const remainingMs = Math.max(0, endTimeMsRef.current - now)
      const newProgress = remainingMs / (totalDuration * 1000)
      setProgress(newProgress)
      setTimeLeft(Math.ceil(remainingMs / 1000))
      if (remainingMs <= 0) {
        onComplete()
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    const rafRef = { current: requestAnimationFrame(tick) } as any
    return () => cancelAnimationFrame(rafRef.current)
  }, [visible, totalDuration])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`
    }
    return `${secs}s`
  }

  const handleExtend = () => {
    // Extend from the remaining time, not from the original duration
    endTimeMsRef.current += 30000
    const remainingMs = Math.max(0, endTimeMsRef.current - Date.now())
    setTimeLeft(Math.ceil(remainingMs / 1000))
    setTotalDuration(prev => prev + 30)
    setProgress(remainingMs / ( (totalDuration + 30) * 1000 ))
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

          {/* Timer Display with animated radial progress */}
          <View style={styles.timerContainer}>
            <View style={styles.timerCircleWrapper}>
              {/* Background ring */}
              <Svg width={200} height={200}>
                <Circle cx={100} cy={100} r={86} stroke="#e6eefc" strokeWidth={12} fill="none" />
                {/* Foreground ring driven by JS progress */}
                <Circle
                  cx={100}
                  cy={100}
                  r={86}
                  stroke="#4A90E2"
                  strokeWidth={12}
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 86} ${2 * Math.PI * 86}`}
                  strokeDashoffset={(2 * Math.PI * 86) * (1 - progress)}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                />
              </Svg>
              <View style={styles.timerCenter}>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                <Text style={styles.timerLabel}>remaining</Text>
              </View>
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

// Animated circle component that consumes the same file's Animated.Value
function ProgressRing({ progress }: { progress: Animated.Value }) {
  const circumference = 2 * Math.PI * 86
  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  })

  // We can't directly bind Animated.Value to SVG Circle props; wrap in Animated component
  const AnimatedCircleComp: any = Animated.createAnimatedComponent(Circle)

  return (
    <AnimatedCircleComp
      cx={100}
      cy={100}
      r={86}
      stroke="#4A90E2"
      strokeWidth={12}
      fill="none"
      strokeDasharray={`${circumference} ${circumference}`}
      strokeDashoffset={strokeDashoffset as any}
      strokeLinecap="round"
      transform="rotate(-90 100 100)"
    />
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
  timerCircleWrapper: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  timerCenter: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
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

