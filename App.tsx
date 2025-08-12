"use client"

import type React from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Image } from "react-native"
import { useState } from "react"
import AuthScreen from "./screens/AuthScreen"
import GoalsScreen from "./screens/GoalsScreen"
import DisciplinesScreen from "./screens/DisciplinesScreen"
import MindScreen from "./screens/MindScreen"
import BodyScreen from "./screens/BodyScreen"
import Ionicons from "react-native-vector-icons/Ionicons"
import Calendar from "./components/Calendar"
import StreakStats from "./components/StreakStats"
import WinTodaySection from "./components/WinTodaySection"
import WeeklyPerformance from "./components/WeeklyPerformance"
import DailyRoutines from "./components/DailyRoutines"
import PersonalMasteryDashboard from "./components/PersonalMasteryDashboard"

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
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Calendar />
          <StreakStats />
          <WinTodaySection />
          <WeeklyPerformance />
          <DailyRoutines />
          <PersonalMasteryDashboard />
        </ScrollView>
      ) : currentScreen === "goals" ? (
        <GoalsScreen />
      ) : currentScreen === "disciplines" ? (
        <DisciplinesScreen />
      ) : currentScreen === "mind" ? (
        <MindScreen />
      ) : currentScreen === "body" ? (
        <BodyScreen />
      ) : (
        <ScrollView style={styles.scrollView}>
          <Text style={styles.comingSoon}>Coming Soon</Text>
        </ScrollView>
      )}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen("disciplines")}>
          <Ionicons name="triangle-outline" size={24} color={currentScreen === "disciplines" ? "#4A90E2" : "#999"} />
          <Text style={[styles.navLabel, currentScreen === "disciplines" && styles.activeNavLabel]}>Disciplines</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen("goals")}>
          <Ionicons name="radio-button-off-outline" size={24} color={currentScreen === "goals" ? "#4A90E2" : "#999"} />
          <Text style={[styles.navLabel, currentScreen === "goals" && styles.activeNavLabel]}>Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.centerNavItem} onPress={() => setCurrentScreen("home")}>
          <View style={styles.centerButton}>
            <Image
              source={require("./assets/logo-circular.png")}
              style={styles.centerButtonImage}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen("mind")}>
          <Ionicons name="flower-outline" size={24} color={currentScreen === "mind" ? "#4A90E2" : "#999"} />
          <Text style={[styles.navLabel, currentScreen === "mind" && styles.activeNavLabel]}>Mind</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen("body")}>
          <Ionicons name="fitness-outline" size={24} color={currentScreen === "body" ? "#4A90E2" : "#999"} />
          <Text style={[styles.navLabel, currentScreen === "body" && styles.activeNavLabel]}>Body</Text>
        </TouchableOpacity>
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
  bottomNavigation: {
    height: 80,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingBottom: 20,
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
  centerButtonImage: {
    width: 32,
    height: 32,
    tintColor: "#fff",
  },
  comingSoon: {
    fontSize: 18,
    textAlign: "center",
    color: "#666",
    marginTop: 100,
  },
  activeNavLabel: {
    color: "#4A90E2",
  },
  navLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
})

export default App
