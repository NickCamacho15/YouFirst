"use client"

import { useEffect, useRef, useState } from "react"
import { login } from "../lib/auth"
import { REMEMBER_ME_KEY } from "../lib/supabase"
// Biometrics removed
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useUser } from "../lib/user-context"
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
  Linking,
} from "react-native"

interface AuthScreenProps {
  onLogin: () => void
}

const CACHE_KEY = "youfirst_cached_user_v1" // Same key as UserProvider

const webSignupUrl = "https://you-first-rho.vercel.app/"

const AuthScreen = ({ onLogin }: AuthScreenProps) => {
  const { refresh } = useUser()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs to control focus order so fields scroll into view automatically
  const identifierRef = useRef<TextInput | null>(null)
  const passwordRef = useRef<TextInput | null>(null)
  const scrollRef = useRef<ScrollView | null>(null)

  // Screen size awareness for responsive spacing on compact devices
  const { height } = useWindowDimensions()
  const isSmall = height < 700
  const isTiny = height < 620

  // Keep focused fields visible by scrolling as focus changes
  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true })
  const scrollToMid = () => scrollRef.current?.scrollTo({ y: 160, animated: true })
  const scrollToBottom = () => scrollRef.current?.scrollToEnd({ animated: true })

  // Autofocus the first relevant field when tab changes or on mount
  useEffect(() => {
    const t = setTimeout(() => {
      identifierRef.current?.focus()
    }, 250)
    return () => clearTimeout(t)
  }, [])

  const handleSignIn = async () => {
    if (!identifier || !password) return
    setSubmitting(true)
    setError(null)
    try {
      const trimmedIdentifier = identifier.trim()
      // Give login adequate time because username→email resolution may need a network roundtrip
      const result = await Promise.race([
        login({ identifier: trimmedIdentifier, password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Login is taking longer than expected. Please try again.")), 15000)),
      ])
      // Biometrics disabled: do not prompt to enable
      // Persist remember-me preference
      try { await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? '1' : '0') } catch {}
      onLogin()
    } catch (e: any) {
      setError(e?.message || "Login failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleFaceIdLogin = undefined as unknown as () => Promise<void>

  // Clear any transient UI state when this screen mounts
  useEffect(() => {
    setError(null)
    setSubmitting(false)
  }, [])

  // No auto biometric here; gating will be in app shell

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { flexGrow: 1, paddingBottom: isSmall ? 20 : 32, paddingTop: isSmall ? 8 : 0 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentInset={{ bottom: 30 }}
          scrollIndicatorInsets={{ bottom: 24 }}
        >
          {/* Logo Section */}
          <View style={[styles.logoSection, { marginTop: isSmall ? 8 : 24, marginBottom: isSmall ? 24 : 60 }]}>
            <Text style={[styles.logo, { fontSize: isSmall ? 40 : 48 } ]}>.uoY</Text>
            {!isTiny && (
              <Text style={[styles.tagline, isSmall && { fontSize: 14 }]}>The Premium Personal Excellence Platform</Text>
            )}
          </View>

          {/* Auth Card */}
          <View style={[styles.authCard, { padding: isSmall ? 20 : 32 }] }>
            <View style={styles.welcomeSection}>
              <Text style={[styles.welcomeTitle, isSmall && { fontSize: 24 } ]}>Welcome</Text>
              <Text style={[styles.welcomeSubtitle, isSmall && { fontSize: 14 } ]}>Focus on who you want to become</Text>
            </View>
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email or Username</Text>
                <TextInput
                  style={[styles.textInput, isSmall && { paddingVertical: 14 } ]}
                  placeholder="Enter your email or username"
                  placeholderTextColor="#999"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  ref={identifierRef}
                  autoFocus
                  textContentType={Platform.OS === "ios" ? "none" : "none"}
                  autoComplete="off"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onFocus={scrollToMid}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={[styles.textInput, isSmall && { paddingVertical: 14 } ]}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType={Platform.OS === "ios" ? 'password' : 'none'}
                  autoComplete="password"
                  ref={passwordRef}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={handleSignIn}
                  onFocus={scrollToBottom}
                />
              </View>

              <TouchableOpacity style={styles.signupLink} onPress={() => Linking.openURL(webSignupUrl)}>
                <Text style={styles.signupLinkText}>
                  {"Don't have an account? "}
                  <Text style={styles.signupLinkHighlight}>sign up here</Text>
                </Text>
              </TouchableOpacity>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {/* Remember Me toggle (applies to both login and register) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#333', fontSize: 14, fontWeight: '500' }}>Remember Me</Text>
                <TouchableOpacity
                  accessibilityRole="switch"
                  accessibilityState={{ checked: rememberMe }}
                  onPress={() => setRememberMe((v) => !v)}
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 16,
                    backgroundColor: rememberMe ? '#111' : '#ddd',
                    padding: 3,
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#fff',
                      alignSelf: rememberMe ? 'flex-end' : 'flex-start',
                    }}
                  />
                </TouchableOpacity>
              </View>

              {/* Action buttons stacked */}
              <View style={[styles.actionsContainer, { marginTop: isSmall ? 4 : 8 } ]}>
                <TouchableOpacity
                  style={[styles.submitButton, isSmall && { paddingVertical: 14 }, submitting && { opacity: 0.6 }]}
                  disabled={submitting}
                  onPress={handleSignIn}
                >
                  <Text style={[styles.submitButtonText, isSmall && { fontSize: 15 } ]}>
                    {submitting ? "Please wait…" : "Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Biometrics removed */}
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
    // Avoid flex:1 here so ScrollView can grow beyond viewport and remain scrollable
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: "center",
    marginTop: 24,
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
  noticeCard: {
    backgroundColor: "#fdf2f8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fbcfe8",
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#a21caf",
    marginBottom: 4,
  },
  noticeCopy: {
    fontSize: 13,
    color: "#831843",
    lineHeight: 18,
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
  signupLink: {
    marginTop: 4,
  },
  signupLinkText: {
    textAlign: "center",
    color: "#444",
    fontSize: 14,
  },
  signupLinkHighlight: {
    color: "#7c3aed",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  actionsContainer: {
    marginTop: 8,
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 0,
  },
  secondaryButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  footerBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
})

export default AuthScreen
