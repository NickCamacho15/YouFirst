import { Audio } from "expo-av"
import { INTERVAL_LOCAL, FINAL_LOCAL } from "../assets/sounds/local-sources"

let intervalSound: Audio.Sound | null = null
let finalBellSound: Audio.Sound | null = null
let audioModeSet = false
let initialized = false

// Prefer local bundled assets if provided; fallback to remote URLs
const INTERVAL_URL = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
const FINAL_URL = "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg"

async function ensureAudioConfigured(): Promise<void> {
  if (audioModeSet) return
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    })
    audioModeSet = true
  } catch {
    // Try again on next call
  }
}

async function loadIntervalSound(): Promise<void> {
  if (intervalSound) return
  try {
    const src: any = INTERVAL_LOCAL || { uri: INTERVAL_URL }
    const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false })
    intervalSound = sound
  } catch {
    // Keep null; we'll retry on next play
  }
}

async function loadFinalBellSound(): Promise<void> {
  if (finalBellSound) return
  try {
    const src: any = FINAL_LOCAL || { uri: FINAL_URL }
    const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false })
    finalBellSound = sound
  } catch {
    // Keep null; we'll retry on next play
  }
}

export async function preloadSounds(): Promise<void> {
  if (initialized && audioModeSet && intervalSound && finalBellSound) return
  await ensureAudioConfigured()
  await Promise.all([loadIntervalSound(), loadFinalBellSound()])
  initialized = true
}

export async function playIntervalChime(): Promise<void> {
  try {
    await ensureAudioConfigured()
    await loadIntervalSound()
    if (intervalSound) {
      await intervalSound.replayAsync()
    }
  } catch {}
}

export async function playFinalBell(): Promise<void> {
  try {
    await ensureAudioConfigured()
    await loadFinalBellSound()
    if (finalBellSound) {
      await finalBellSound.replayAsync()
    }
  } catch {}
}


