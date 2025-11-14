type Bucket = {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

export function assertRateLimit(key: string, limit = 5, refillIntervalMs = 60_000): void {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { tokens: limit, lastRefill: now }

  const elapsed = now - bucket.lastRefill
  if (elapsed > refillIntervalMs) {
    const tokensToAdd = Math.floor(elapsed / refillIntervalMs) * limit
    bucket.tokens = Math.min(limit, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now
  }

  if (bucket.tokens <= 0) {
    throw new Error('Rate limit exceeded. Please try again shortly.')
  }

  bucket.tokens -= 1
  buckets.set(key, bucket)
}


