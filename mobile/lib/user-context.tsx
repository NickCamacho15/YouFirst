import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { Image } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getCurrentUser, type User } from "./auth"
import { supabase, forceClearAuthStorage } from "./supabase"

type UserContextValue = {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  setUser: (u: User | null) => void
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

const CACHE_KEY = "youfirst_cached_user_v1"

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    ;(async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY)
        if (cached) {
          try {
            const parsed: User = JSON.parse(cached)
            if (mountedRef.current) setUser(parsed)
            if (parsed?.profileImageUrl) { try { await Image.prefetch(parsed.profileImageUrl) } catch {} }
          } catch {}
        }
      } finally {
        // kick an async refresh but don't block first render
        ;(async () => { await doRefresh() })()
      }
    })()
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      try {
        if (event === 'SIGNED_OUT') {
          try { await forceClearAuthStorage() } catch {}
          if (mountedRef.current) { setUser(null); try { await AsyncStorage.removeItem(CACHE_KEY) } catch {} }
        }
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          await doRefresh()
        }
      } catch {}
    })
    return () => { mountedRef.current = false; sub.subscription.unsubscribe() }
  }, [])

  const doRefresh = async () => {
    try {
      const u = await getCurrentUser()
      if (!mountedRef.current) return
      setUser(u)
      if (u) {
        try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(u)) } catch {}
        if (u.profileImageUrl) { try { await Image.prefetch(u.profileImageUrl) } catch {} }
      } else {
        try { await AsyncStorage.removeItem(CACHE_KEY) } catch {}
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const value: UserContextValue = {
    user,
    loading,
    refresh: doRefresh,
    setUser: (u) => { setUser(u); if (u) { try { AsyncStorage.setItem(CACHE_KEY, JSON.stringify(u)) } catch {} } else { try { AsyncStorage.removeItem(CACHE_KEY) } catch {} } },
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used within UserProvider")
  return ctx
}


