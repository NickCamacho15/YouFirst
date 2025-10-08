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

const CACHE_KEY = "youfirst_cached_user_v1" // bump only if shape changes dramatically; added role/groupId is backward compatible

// Debug counters for monitoring (can be removed after confirming fix works)
let refreshCounter = 0
let authEventCounter = 0

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const initialLoadDoneRef = useRef(false)
  const lastRefreshRef = useRef<number>(0)
  const REFRESH_DEBOUNCE_MS = 1000 // Only allow one refresh per second

  useEffect(() => {
    mountedRef.current = true
    ;(async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY)
        if (cached) {
          try {
            const parsed: User = JSON.parse(cached)
            if (mountedRef.current) {
              setUser(parsed)
              // If we have cached data, we're not really loading
              setLoading(false)
            }
            if (parsed?.profileImageUrl) { try { await Image.prefetch(parsed.profileImageUrl) } catch {} }
          } catch {}
        }
      } finally {
        // kick an async refresh but don't block first render
        ;(async () => { 
          lastRefreshRef.current = Date.now() // Set timestamp BEFORE refresh to prevent race
          await doRefresh()
          initialLoadDoneRef.current = true
        })()
      }
    })()
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      authEventCounter++
      console.log(`[UserProvider] Auth event #${authEventCounter}: ${event}`)
      
      try {
        if (event === 'SIGNED_OUT') {
          try { await forceClearAuthStorage() } catch {}
          if (mountedRef.current) { 
            setUser(null)
            setLoading(true)
            try { await AsyncStorage.removeItem(CACHE_KEY) } catch {} 
          }
          initialLoadDoneRef.current = false
          lastRefreshRef.current = 0
        }
        
        // Debounce ALL refresh-triggering auth events, even before initialLoadDoneRef is set
        // This prevents multiple rapid refreshes during app startup
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          const now = Date.now()
          const timeSinceLastRefresh = now - lastRefreshRef.current
          
          // Only refresh if initial load is done AND enough time has passed
          if (initialLoadDoneRef.current && timeSinceLastRefresh >= REFRESH_DEBOUNCE_MS) {
            lastRefreshRef.current = now
            await doRefresh()
          } else if (!initialLoadDoneRef.current) {
            console.log(`[UserProvider] Skipping refresh for ${event} - initial load in progress`)
          } else {
            console.log(`[UserProvider] Skipping refresh for ${event} - only ${timeSinceLastRefresh}ms since last refresh`)
          }
        }
      } catch {}
    })
    return () => { mountedRef.current = false; sub.subscription.unsubscribe() }
  }, [])

  const doRefresh = async () => {
    refreshCounter++
    console.log(`[UserProvider] doRefresh #${refreshCounter}`)
    
    try {
      const u = await getCurrentUser()
      if (!mountedRef.current) return
      
      // Only update state if user data actually changed to prevent unnecessary re-renders
      setUser(prevUser => {
        // If both are null or both are undefined, no change
        if (!u && !prevUser) return prevUser
        // If one is null/undefined and the other isn't, update
        if (!u || !prevUser) return u
        // Compare key fields to detect actual changes
        const unchanged = 
          prevUser.id === u.id &&
          prevUser.email === u.email &&
          prevUser.username === u.username &&
          prevUser.displayName === u.displayName &&
          prevUser.role === u.role &&
          prevUser.groupId === u.groupId &&
          prevUser.profileImageUrl === u.profileImageUrl
        
        if (unchanged) {
          console.log('[UserProvider] User data unchanged, keeping same reference to prevent re-renders')
          return prevUser
        } else {
          console.log('[UserProvider] User data changed, updating:', {
            idChanged: prevUser.id !== u.id,
            emailChanged: prevUser.email !== u.email,
            usernameChanged: prevUser.username !== u.username,
            displayNameChanged: prevUser.displayName !== u.displayName,
            roleChanged: prevUser.role !== u.role,
            groupIdChanged: prevUser.groupId !== u.groupId,
            profileImageUrlChanged: prevUser.profileImageUrl !== u.profileImageUrl,
          })
          return u
        }
      })
      
      if (u) {
        try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(u)) } catch {}
        if (u.profileImageUrl) { try { await Image.prefetch(u.profileImageUrl) } catch {} }
      } else {
        try { await AsyncStorage.removeItem(CACHE_KEY) } catch {}
      }
    } finally {
      // Only set loading=false if it's not already false (to avoid extra state updates)
      if (mountedRef.current) {
        setLoading(prev => prev ? false : prev)
      }
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


