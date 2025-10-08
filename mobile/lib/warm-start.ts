import { getActivityGoals, getTodaySummary } from './dashboard'
import { getWinsForMonth, getStreaks } from './wins'

type WarmOptions = {
  timeoutMs?: number
}

function withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T | void> {
  return Promise.race([
    p.catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, timeoutMs))),
  ])
}

export async function warmStartupCaches(options?: WarmOptions): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 1800

  const jobs: Promise<unknown>[] = []
  try { jobs.push(getActivityGoals().catch(() => {})) } catch {}
  try { jobs.push(getTodaySummary().catch(() => {})) } catch {}
  
  // Pre-cache calendar and streak data for instant component rendering
  // These functions cache their results in AsyncStorage, so when components mount
  // they'll load instantly from cache rather than hitting the network
  try { jobs.push(getWinsForMonth(new Date()).catch(() => {})) } catch {}
  try { jobs.push(getStreaks().catch(() => {})) } catch {}

  if (jobs.length === 0) return

  try {
    await withTimeout(Promise.allSettled(jobs), timeoutMs)
  } catch {
  }
}


