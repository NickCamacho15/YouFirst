import * as SecureStore from "expo-secure-store"
import Constants from "expo-constants"

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

function getApiBaseUrl(): string {
  // Prefer value from app.json extra, fallback to localhost for simulator
  const extra: any = (Constants as any).expoConfig?.extra || (Constants as any).manifest2?.extra || {}
  return extra.expoPublicApiBaseUrl || "http://localhost:3000"
}

const USER_DATA_KEY = "user_data"
let inMemoryUserData: string | null = null

async function loadUserDataFromStorage(): Promise<string | null> {
  if (inMemoryUserData !== null) return inMemoryUserData
  try {
    const stored = await SecureStore.getItemAsync(USER_DATA_KEY)
    inMemoryUserData = stored ?? null
    return inMemoryUserData
  } catch {
    return null
  }
}

export async function setStoredUserData(userDataJson: string | null): Promise<void> {
  inMemoryUserData = userDataJson
  if (userDataJson) {
    await SecureStore.setItemAsync(USER_DATA_KEY, userDataJson)
  } else {
    await SecureStore.deleteItemAsync(USER_DATA_KEY)
  }
}

export async function getStoredUserData(): Promise<string | null> {
  return await loadUserDataFromStorage()
}

export async function clearStoredUserData(): Promise<void> {
  inMemoryUserData = null
  await SecureStore.deleteItemAsync(USER_DATA_KEY)
}

export async function apiRequest<T = any>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<Response> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${path}`

  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"

  const userData = await loadUserDataFromStorage()
  if (userData) headers["X-User-Data"] = userData

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
    signal,
  })

  // Persist X-User-Data if provided by server
  const userDataHeader = response.headers.get("X-User-Data")
  if (userDataHeader) {
    await setStoredUserData(userDataHeader)
  }

  return response
}

export const API = {
  get: (path: string, signal?: AbortSignal) => apiRequest("GET", path, undefined, signal),
  post: (path: string, body?: unknown, signal?: AbortSignal) => apiRequest("POST", path, body, signal),
  put: (path: string, body?: unknown, signal?: AbortSignal) => apiRequest("PUT", path, body, signal),
  patch: (path: string, body?: unknown, signal?: AbortSignal) => apiRequest("PATCH", path, body, signal),
  delete: (path: string, signal?: AbortSignal) => apiRequest("DELETE", path, undefined, signal),
}


