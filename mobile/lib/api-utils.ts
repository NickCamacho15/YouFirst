/**
 * API Utilities
 * 
 * Helper functions for handling API calls with timeouts and error handling
 */

/**
 * Wraps an async function with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 15000ms / 15s)
 * @param errorMessage - Custom error message for timeout
 * @returns Promise that rejects if timeout is exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  errorMessage: string = 'Request timed out'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timeoutHandle)
    return result
  } catch (error) {
    clearTimeout(timeoutHandle)
    throw error
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 1000ms)
 * @returns Promise that resolves with the function result or rejects after all retries
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError
      }

      // Wait with exponential backoff before retrying
      const delay = initialDelayMs * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Combines timeout and retry for robust API calls
 * @param fn - The async function to execute
 * @param options - Configuration options
 * @returns Promise that resolves with the function result
 */
export async function apiCall<T>(
  fn: () => Promise<T>,
  options: {
    timeoutMs?: number
    maxRetries?: number
    retryDelayMs?: number
    timeoutMessage?: string
  } = {}
): Promise<T> {
  const {
    timeoutMs = 15000,
    maxRetries = 2,
    retryDelayMs = 1000,
    timeoutMessage = 'Request timed out'
  } = options

  return withRetry(
    () => withTimeout(fn(), timeoutMs, timeoutMessage),
    maxRetries,
    retryDelayMs
  )
}





