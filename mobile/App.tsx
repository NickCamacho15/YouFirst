"use client"

import type React from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Image } from "react-native"
import { useState } from "react"
import AuthScreen from "./screens/AuthScreen"
import GoalsScreen from "./screens/GoalsScreen"
import DisciplinesScreen from "./screens/DisciplinesScreen"
import MindScreen from "./screens/MindScreen"
import BodyScreen from "./screens/BodyScreen"
import { Mountain, Target, Brain, Dumbbell } from "lucide-react-native"
import Calendar from "./components/Calendar"
import StreakStats from "./components/StreakStats"
import WinTodaySection from "./components/WinTodaySection"
import WeeklyPerformance from "./components/WeeklyPerformance"
import DailyRoutines from "./components/DailyRoutines"
import PersonalMasteryDashboard from "./components/PersonalMasteryDashboard"
import TopHeader from "./components/TopHeader"

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState("home")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentScreen("home")
  }

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {currentScreen === "home" ? (
        <>
          <TopHeader onLogout={handleLogout} />
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Calendar />
            <StreakStats />
            <WinTodaySection />
            <WeeklyPerformance />
            <DailyRoutines />
            <PersonalMasteryDashboard />
          </ScrollView>
        </>
      ) : currentScreen === "goals" ? (
        <GoalsScreen onLogout={handleLogout} />
      ) : currentScreen === "disciplines" ? (
        <DisciplinesScreen onLogout={handleLogout} />
      ) : currentScreen === "mind" ? (
        <MindScreen onLogout={handleLogout} />
      ) : currentScreen === "body" ? (
        <BodyScreen onLogout={handleLogout} />
      ) : (
        <ScrollView style={styles.scrollView}>
          <Text style={styles.comingSoon}>Coming Soon</Text>
        </ScrollView>
      )}
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
          <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen("body")}>
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
    </SafeAreaView>
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
    paddingBottom: 20,
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
})

export default App
