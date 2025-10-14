"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native"

interface AuthScreenProps {
  onLogin: () => void
}

const AuthScreen = ({ onLogin }: AuthScreenProps) => {
  const [activeTab, setActiveTab] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSignIn = () => {
    // Here you would typically validate credentials and make API call
    // For now, we'll just call the onLogin callback
    onLogin()
  }

  const handleRegister = () => {
    // Here you would typically validate form and make registration API call
    // For now, we'll just call the onLogin callback
    onLogin()
  }

  const { height } = useWindowDimensions()
  const isSmall = height < 700

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1, paddingBottom: isSmall ? 20 : 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Logo Section */}
          <View style={[styles.logoSection, { marginBottom: isSmall ? 28 : 60 }]}>
            <Text style={[styles.logo, { fontSize: isSmall ? 40 : 48 }]}>.uoY</Text>
            <Text style={[styles.tagline, isSmall && { fontSize: 14 }]}>The Premium Personal Excellence Platform</Text>
          </View>

          {/* Auth Card */}
          <View style={[styles.authCard, { padding: isSmall ? 20 : 32 }]}>
            <View style={styles.welcomeSection}>
              <Text style={[styles.welcomeTitle, isSmall && { fontSize: 24 }]}>Welcome</Text>
              <Text style={[styles.welcomeSubtitle, isSmall && { fontSize: 14 }]}>Focus on who you want to become</Text>
            </View>

            {/* Tab Navigation */}
            <View style={[styles.tabContainer, { marginBottom: isSmall ? 20 : 32 }]}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "login" && styles.activeTab]}
                onPress={() => setActiveTab("login")}
              >
                <Text style={[styles.tabText, isSmall && { fontSize: 14 }, activeTab === "login" && styles.activeTabText]}>Login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === "register" && styles.activeTab]}
                onPress={() => setActiveTab("register")}
              >
                <Text style={[styles.tabText, isSmall && { fontSize: 14 }, activeTab === "register" && styles.activeTabText]}>Register</Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isSmall && { fontSize: 14 }]}>Email</Text>
                <TextInput
                  style={[styles.textInput, isSmall && { paddingVertical: 14 }]}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isSmall && { fontSize: 14 }]}>Password</Text>
                <TextInput
                  style={[styles.textInput, isSmall && { paddingVertical: 14 }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {activeTab === "register" && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isSmall && { fontSize: 14 }]}>Confirm Password</Text>
                  <TextInput
                    style={[styles.textInput, isSmall && { paddingVertical: 14 }]}
                    placeholder="Confirm your password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isSmall && { paddingVertical: 14 }]}
                onPress={activeTab === "login" ? handleSignIn : handleRegister}
              >
                <Text style={[styles.submitButtonText, isSmall && { fontSize: 15 }]}>{activeTab === "login" ? "Sign In" : "Create Account"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    // Use ScrollView + flexGrow to allow scroll on small screens while
    // still centering when space allows
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: "700",
    color: "#8B5CF6",
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  authCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#333",
    fontWeight: "600",
  },
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f8f9fa",
  },
  submitButton: {
    backgroundColor: "#333",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default AuthScreen
