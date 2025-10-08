"use client"

import type React from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Image, ActivityIndicator } from "react-native"
import { useEffect, useState } from "react"
import AuthScreen from "./screens/AuthScreen"
import GoalsScreen from "./screens/GoalsScreen"
import DisciplinesScreen from "./screens/DisciplinesScreen"
import MindScreen from "./screens/MindScreen"
import BodyScreen from "./screens/BodyScreen"
import ProfileScreen from "./screens/ProfileScreen"
import { Mountain, Target, Brain, Dumbbell } from "lucide-react-native"
import Calendar from "./components/Calendar"
import StreakStats from "./components/StreakStats"
import WonTodayButton from "./components/WonTodayButton"
import WeeklyPerformance from "./components/WeeklyPerformance"
import DailyRoutines from "./components/DailyRoutines"
import PersonalMasteryDashboard from "./components/PersonalMasteryDashboard"
import TopHeader from "./components/TopHeader"
import { UserProvider } from "./lib/user-context"
import { supabase } from "./lib/supabase"
import { getTodaySummary, getActivityGoals } from "./lib/dashboard"
import { getWinsForMonth } from "./lib/wins"
import { warmStartupCaches } from './lib/warm-start'
import { biometricUnlock, isBiometricLoginEnabled, enableBiometricLock } from './lib/biometrics'
// Removed duplicate notifications prefetch; TopHeader handles its own fetching/realtime

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [appEpoch, setAppEpoch] = useState(0)
  const [showStartupOverlay, setShowStartupOverlay] = useState(true)

  const handleLogin = () => {
    setIsAuthenticated(true)
    // Don't remount UserProvider on login - it handles auth changes internally
    // This prevents unnecessary re-initialization and reduces double-refresh issues
    // Warm critical caches in the background to make the home screen snappy
    setTimeout(() => { try { warmStartupCaches({ timeoutMs: 1800 }) } catch {} }, 0)
    // Ensure any startup overlay is dismissed immediately after a successful login
    setShowStartupOverlay(false)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentScreen("home")
    // Remount UserProvider on logout for a clean slate
    setAppEpoch((e) => e + 1)
  }

  const [currentScreen, setCurrentScreen] = useState("home")
  const [bodyEpoch, setBodyEpoch] = useState(0)
  const [locked, setLocked] = useState(false)

  // Detect existing session on cold start and respond to auth events
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        const hasSession = !!data.session
        setIsAuthenticated(hasSession)
        if (hasSession) {
          // Start warming caches in background - don't block UI
          setTimeout(() => { try { warmStartupCaches({ timeoutMs: 1800 }) } catch {} }, 0)
          // If user opted into biometrics, lock until user authenticates
          const bioEnabled = await isBiometricLoginEnabled()
          if (bioEnabled) setLocked(true)
        }
        if (mounted) setShowStartupOverlay(false)
      } catch {}
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") { setIsAuthenticated(true); setShowStartupOverlay(false) }
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false)
        setCurrentScreen("home")
        setShowStartupOverlay(false)
      }
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])
  if (!isAuthenticated) {
    return (
      <UserProvider key={`provider-${appEpoch}`}>
        <AuthScreen onLogin={handleLogin} />
      </UserProvider>
    )
  }

  return (
    <UserProvider key={`provider-${appEpoch}`}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {locked && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockCard}>
              <Text style={styles.lockTitle}>Unlock</Text>
              <Text style={styles.lockSubtitle}>Use Face ID to continue</Text>
              <TouchableOpacity style={styles.lockButton} onPress={async () => {
                const ok = await biometricUnlock('Unlock You.')
                if (ok) setLocked(false)
              }}>
                <Text style={styles.lockButtonText}>Unlock with Face ID</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.lockSecondary} onPress={() => setLocked(false)}>
                <Text style={styles.lockSecondaryText}>Enter without biometrics</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <TopHeader onLogout={handleLogout} onOpenProfile={() => setCurrentScreen("profile")} />
        {/* Keep screens mounted to avoid refetch/re-render on tab return; toggle visibility instead */}
        <View style={{ flex: 1 }}>
          <ScrollView
            style={[styles.scrollView, currentScreen === "home" ? undefined : styles.hidden]}
            showsVerticalScrollIndicator={false}
          >
            <Calendar />
            <StreakStats />
            <WonTodayButton />
            <DailyRoutines />
            <WeeklyPerformance />
            <PersonalMasteryDashboard />
          </ScrollView>

          <View style={currentScreen === "goals" ? styles.visible : styles.hidden}>
            <GoalsScreen onLogout={handleLogout} onOpenProfile={() => setCurrentScreen("profile")} />
          </View>
          <View style={currentScreen === "disciplines" ? styles.visible : styles.hidden}>
            <DisciplinesScreen onLogout={handleLogout} onOpenProfile={() => setCurrentScreen("profile")} />
          </View>
          <View style={currentScreen === "mind" ? styles.visible : styles.hidden}>
            <MindScreen onLogout={handleLogout} onOpenProfile={() => setCurrentScreen("profile")} />
          </View>
          <View style={currentScreen === "body" ? styles.visible : styles.hidden}>
            <BodyScreen onLogout={handleLogout} onOpenProfile={() => setCurrentScreen("profile")} activeEpoch={bodyEpoch} />
          </View>
          <View style={currentScreen === "profile" ? styles.visible : styles.hidden}>
            <ProfileScreen onLogout={handleLogout} />
          </View>
        </View>
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNavigation}>
            <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen("disciplines")}>
              <View style={styles.navIconContainer}>
                <Mountain stroke="#777" width={24} height={24} />
              </View>
              <Text style={styles.navLabel}>Disciplines</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen("goals")}>
              <View style={styles.navIconContainer}>
                <Target stroke="#777" width={24} height={24} />
              </View>
              <Text style={styles.navLabel}>Goals</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.centerNavItem} onPress={() => setCurrentScreen("home")}>
              <View style={styles.centerButton}>
                <Text style={styles.centerButtonText}>.uoY</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen("mind")}>
              <View style={styles.navIconContainer}>
                <Brain stroke="#777" width={24} height={24} />
              </View>
              <Text style={styles.navLabel}>Mind</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => { setCurrentScreen("body"); setBodyEpoch((e) => e + 1) }}>
              <View style={styles.navIconContainer}>
                <Dumbbell stroke="#777" width={24} height={24} />
              </View>
              <Text style={styles.navLabel}>Body</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.navIndicator}>
            {currentScreen === "disciplines" && <View style={[styles.indicatorLine, { left: "0%", width: "20%" }]} />}
            {currentScreen === "goals" && <View style={[styles.indicatorLine, { left: "20%", width: "20%" }]} />}
            {currentScreen === "home" && <View style={[styles.indicatorLine, { left: "40%", width: "20%" }]} />}
            {currentScreen === "mind" && <View style={[styles.indicatorLine, { left: "60%", width: "20%" }]} />}
            {currentScreen === "body" && <View style={[styles.indicatorLine, { left: "80%", width: "20%" }]} />}
          </View>
        </View>
        {showStartupOverlay && (
          <View style={styles.startupOverlay}>
            <Image source={require('./assets/you-icon.png')} style={styles.overlayLogo} resizeMode="contain" />
            <ActivityIndicator size="small" color="#888" style={{ marginTop: 16 }} />
          </View>
        )}
      </SafeAreaView>
    </UserProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  hidden: { display: 'none' },
  visible: { flex: 1 },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  headerLogo: {
    width: 80,
    height: 30,
  },
  bottomNavContainer: {
    backgroundColor: "#fff",
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  bottomNavigation: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerNavItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  centerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  comingSoon: {
    fontSize: 18,
    textAlign: "center",
    color: "#666",
    marginTop: 100,
  },
  navLabel: {
    fontSize: 10,
    color: "#777",
    marginTop: 5,
  },
  navIndicator: {
    position: "relative",
    height: 3,
    width: "100%",
  },
  navIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorLine: {
    position: "absolute",
    height: 3,
    backgroundColor: "#000",
    bottom: 0,
  },
  startupOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLogo: {
    width: 96,
    height: 96,
  },
  lockOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lockCard: {
    width: '86%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    alignItems: 'center',
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
  },
  lockSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  lockButton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
  },
  lockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lockSecondary: {
    marginTop: 12,
  },
  lockSecondaryText: {
    color: '#666',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
})

export default App
