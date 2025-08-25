import { Audio } from "expo-av"
import { INTERVAL_LOCAL, FINAL_LOCAL } from "../assets/sounds/local-sources"

let initialized = false
let intervalSound: Audio.Sound | null = null
let finalBellSound: Audio.Sound | null = null

// Prefer local bundled assets if provided; fallback to remote URLs
const INTERVAL_URL = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
const FINAL_URL = "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg"

export async function preloadSounds(): Promise<void> {
  if (initialized) return
  initialized = true
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
  } catch {}
  try {
    const src: any = INTERVAL_LOCAL || { uri: INTERVAL_URL }
    const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false })
    intervalSound = sound
  } catch {}
  try {
    const src: any = FINAL_LOCAL || { uri: FINAL_URL }
    const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false })
    finalBellSound = sound
  } catch {}
}

export async function playIntervalChime(): Promise<void> {
  try {
    if (!initialized) await preloadSounds()
    if (intervalSound) {
      await intervalSound.replayAsync()
    }
  } catch {}
}

export async function playFinalBell(): Promise<void> {
  try {
    if (!initialized) await preloadSounds()
    if (finalBellSound) {
      await finalBellSound.replayAsync()
    }
  } catch {}
}


