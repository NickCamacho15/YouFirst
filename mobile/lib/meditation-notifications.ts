import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

export async function requestNotificationsPermissionIfNeeded(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync()
    if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) {
      return true
    }
    const req = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    })
    return !!(req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED)
  } catch {
    return false
  }
}

export async function scheduleMeditationNotifications(params: {
  prepSeconds: number
  intervalMinutes: number
  meditationMinutes: number
}): Promise<string[]> {
  const now = Date.now()
  const ids: string[] = []
  const prep = Math.max(0, Math.floor(params.prepSeconds || 0))
  const interval = Math.max(1, Math.floor(params.intervalMinutes || 1)) * 60
  const totalMeditation = Math.max(1, Math.floor(params.meditationMinutes || 1)) * 60

  // Interval chimes: after prep, every `interval` seconds, but not after the final bell
  let t = prep + interval
  while (t < prep + totalMeditation) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Meditation interval",
          body: "Chime",
          sound: true,
        },
        trigger: Platform.select({
          ios: { seconds: t },
          android: { seconds: t, channelId: "default" } as any,
          default: { seconds: t } as any,
        }),
      })
      ids.push(id)
    } catch {}
    t += interval
  }

  // Final bell at end
  const finalAt = prep + totalMeditation
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Meditation complete",
        body: "Final bell",
        sound: true,
      },
      trigger: Platform.select({
        ios: { seconds: finalAt },
        android: { seconds: finalAt, channelId: "default" } as any,
        default: { seconds: finalAt } as any,
      }),
    })
    ids.push(id)
  } catch {}

  return ids
}

export async function cancelScheduledNotifications(ids: string[]): Promise<void> {
  await Promise.all(
    (ids || []).map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id)
      } catch {}
    })
  )
}


