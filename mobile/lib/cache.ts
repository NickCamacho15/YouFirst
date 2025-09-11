// Tiny in-memory cache with TTL and prefix invalidation for React Native runtime
// This avoids repeated network calls on quick navigations and remounts.

type CacheEntry<T> = { value: T; expiry: number }

const store = new Map<string, CacheEntry<any>>()

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiry) { store.delete(key); return null }
  return hit.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiry: Date.now() + Math.max(0, ttlMs) })
}

export function cacheInvalidate(key: string): void {
  store.delete(key)
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) store.delete(k)
  }
}


