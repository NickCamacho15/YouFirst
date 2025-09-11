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
// Removed duplicate notifications prefetch; TopHeader handles its own fetching/realtime

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [appEpoch, setAppEpoch] = useState(0)
  const [showStartupOverlay, setShowStartupOverlay] = useState(true)

  const handleLogin = () => {
    setIsAuthenticated(true)
    // On a successful login, reset the epoch to establish a clean app context
    setAppEpoch((e) => e + 1)
    // Warm critical caches in the background to make the home screen snappy
    setTimeout(() => { try { warmStartupCaches({ timeoutMs: 1800 }) } catch {} }, 0)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentScreen("home")
    setAppEpoch((e) => e + 1)
  }

  const [currentScreen, setCurrentScreen] = useState("home")
  const [bodyEpoch, setBodyEpoch] = useState(0)

  // Detect existing session on cold start and respond to auth events
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        const hasSession = !!data.session
        setIsAuthenticated(hasSession)
        if (hasSession) { try { await warmStartupCaches({ timeoutMs: 1800 }) } catch {} }
        if (mounted) setShowStartupOverlay(false)
      } catch {}
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setIsAuthenticated(true)
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
})

export default App
