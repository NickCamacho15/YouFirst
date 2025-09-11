"use client"

import { useEffect, useRef, useState } from "react"
import { login, register } from "../lib/auth"
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
} from "react-native"

interface AuthScreenProps {
  onLogin: () => void
}

const AuthScreen = ({ onLogin }: AuthScreenProps) => {
  const [activeTab, setActiveTab] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs to control focus order so fields scroll into view automatically
  const usernameRef = useRef<TextInput | null>(null)
  const emailRef = useRef<TextInput | null>(null)
  const passwordRef = useRef<TextInput | null>(null)
  const confirmRef = useRef<TextInput | null>(null)
  const scrollRef = useRef<ScrollView | null>(null)

  // Keep focused fields visible by scrolling as focus changes
  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true })
  const scrollToMid = () => scrollRef.current?.scrollTo({ y: 160, animated: true })
  const scrollToBottom = () => scrollRef.current?.scrollToEnd({ animated: true })

  // Autofocus the first relevant field when tab changes or on mount
  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === "register") {
        usernameRef.current?.focus()
      } else {
        emailRef.current?.focus()
      }
    }, 250)
    return () => clearTimeout(t)
  }, [activeTab])

  const handleSignIn = async () => {
    if (!(email || username) || !password) return
    setSubmitting(true)
    setError(null)
    try {
      const identifier = activeTab === "login" ? (email || username) : email
      // Give login adequate time because username→email resolution may need a network roundtrip
      const result = await Promise.race([
        login({ identifier: identifier || "", password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Login is taking longer than expected. Please try again.")), 15000)),
      ])
      onLogin()
    } catch (e: any) {
      setError(e?.message || "Login failed")
    } finally {
      setSubmitting(false)
    }
  }

  // Clear any transient UI state when this screen mounts
  useEffect(() => {
    setError(null)
    setSubmitting(false)
  }, [])

  const handleRegister = async () => {
    if (!email || !username || !password || password !== confirmPassword) return
    setSubmitting(true)
    setError(null)
    try {
      await register({ email, username, displayName: email.split("@")[0], password })
      onLogin()
    } catch (e: any) {
      setError(e?.message || "Registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Text style={styles.logo}>.uoY</Text>
            <Text style={styles.tagline}>The Premium Personal Excellence Platform</Text>
          </View>

          {/* Auth Card */}
          <View style={styles.authCard}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Welcome</Text>
              <Text style={styles.welcomeSubtitle}>Focus on who you want to become</Text>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "login" && styles.activeTab]}
                onPress={() => setActiveTab("login")}
              >
                <Text style={[styles.tabText, activeTab === "login" && styles.activeTabText]}>Login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === "register" && styles.activeTab]}
                onPress={() => setActiveTab("register")}
              >
                <Text style={[styles.tabText, activeTab === "register" && styles.activeTabText]}>Register</Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {activeTab === "register" ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Choose a username"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    ref={usernameRef}
                    autoFocus={activeTab === "register"}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => emailRef.current?.focus()}
                    onFocus={scrollToTop}
                  />
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email or Username</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your email or username"
                    placeholderTextColor="#999"
                    value={email || username}
                    onChangeText={(v) => {
                      // heuristically set email or username field
                      if (v.includes("@")) {
                        setEmail(v)
                        setUsername("")
                      } else {
                        setUsername(v)
                        setEmail("")
                      }
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    ref={emailRef}
                    autoFocus={activeTab === "login"}
                    textContentType={Platform.OS === "ios" ? "emailAddress" : "emailAddress"}
                    autoComplete="username"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    onFocus={scrollToMid}
                  />
                </View>
              )}
              {activeTab === "register" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType={Platform.OS === "ios" ? "emailAddress" : "emailAddress"}
                    autoComplete="email"
                    ref={emailRef}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    onFocus={scrollToMid}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType={Platform.OS === "ios" ? "password" : "password"}
                  autoComplete="password"
                  ref={passwordRef}
                  returnKeyType={activeTab === "register" ? "next" : "done"}
                  blurOnSubmit={activeTab !== "register"}
                  onSubmitEditing={() => {
                    if (activeTab === "register") confirmRef.current?.focus()
                    else handleSignIn()
                  }}
                  onFocus={scrollToBottom}
                />
              </View>

              {activeTab === "register" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm your password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType={Platform.OS === "ios" ? "password" : "password"}
                    autoComplete="password"
                    ref={confirmRef}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    onFocus={scrollToBottom}
                  />
                </View>
              )}

              {/* Submit Button */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity style={[styles.submitButton, submitting && { opacity: 0.6 }]} disabled={submitting} onPress={activeTab === "login" ? handleSignIn : handleRegister}>
                <Text style={styles.submitButtonText}>
                  {submitting ? "Please wait…" : activeTab === "login" ? "Sign In" : "Create Account"}
                </Text>
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
    flex: 1,
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
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
})

export default AuthScreen
