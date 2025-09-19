"use client"

import { useEffect, useRef, useState } from "react"
import { login, register } from "../lib/auth"
import { supabase } from "../lib/supabase"
import { isBiometricLoginEnabled, enableBiometricLock, isBiometricHardwareAvailable, biometricSignIn } from "../lib/biometrics"
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
  Alert,
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

  // Role + group/access code (registration)
  const [registerRole, setRegisterRole] = useState<'admin' | 'user'>('user')
  const [groupName, setGroupName] = useState("")
  const [accessCode, setAccessCode] = useState("")

  // Refs to control focus order so fields scroll into view automatically
  const usernameRef = useRef<TextInput | null>(null)
  const emailRef = useRef<TextInput | null>(null)
  const passwordRef = useRef<TextInput | null>(null)
  const confirmRef = useRef<TextInput | null>(null)
  const groupNameRef = useRef<TextInput | null>(null)
  const accessCodeRef = useRef<TextInput | null>(null)
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
      // Offer to enable biometrics after a successful credential login
      try {
        const hasHardware = await isBiometricHardwareAvailable()
        const already = await isBiometricLoginEnabled()
        if (hasHardware && !already) {
          Alert.alert(
            'Enable Face ID?',
            'Would you like to enable Face ID for quicker sign-ins on this device?',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Enable', onPress: async () => { try { await enableBiometricLock() } catch {} } },
            ]
          )
        }
      } catch {}
      onLogin()
    } catch (e: any) {
      setError(e?.message || "Login failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleFaceIdLogin = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const enabled = await isBiometricLoginEnabled()
      const ok = await biometricSignIn()
      if (ok) {
        onLogin()
        return
      }
      const hasHardware = await isBiometricHardwareAvailable()
      if (!hasHardware) {
        setError('Face ID is not available on this device.')
        return
      }
      if (!enabled) {
        setError('Face ID sign-in is not enabled yet. Please sign in with email first, then enable Face ID when prompted.')
      } else {
        setError('Face ID sign-in could not complete. Try again or sign in with email.')
      }
    } catch (e: any) {
      setError(e?.message || 'Face ID sign-in failed')
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
    // Basic validation
    if (!email || !username || !password || password !== confirmPassword) {
      setError(!email || !username || !password ? "Please fill all fields" : "Passwords do not match")
      return
    }
    // Role-specific validation
    const normalizedCode = accessCode.trim().toUpperCase()
    const adminCodeValid = /^[A-Z0-9]{6,12}$/.test(normalizedCode)
    if (registerRole === 'admin') {
      if (!groupName.trim()) { setError("Group name is required") ; return }
      if (!adminCodeValid) { setError("Access code must be 6–12 uppercase letters/numbers") ; return }
    } else {
      if (!normalizedCode) { setError("Access code is required") ; return }
    }
    setSubmitting(true)
    setError(null)
    try {
      await register({ email, username, displayName: email.split("@")[0], password })
      // Ensure the auth session is definitely available before calling RPCs
      {
        let tries = 0
        while (tries < 10) {
          const { data: sess } = await supabase.auth.getSession()
          if (sess.session?.access_token) break
          await new Promise((r) => setTimeout(r, 150))
          tries++
        }
      }
      // Post-registration RPC based on role
      if (registerRole === 'admin') {
        const { data: grp, error: rpcErr } = await supabase.rpc('create_admin_group', { p_name: groupName.trim(), p_access_code: normalizedCode })
        if (rpcErr) throw new Error(rpcErr.message)
        if (!grp) throw new Error('Failed to create group. Please try again.')
      } else {
        const { data: grp, error: rpcErr } = await supabase.rpc('redeem_access_code', { p_access_code: normalizedCode })
        if (rpcErr) throw new Error(rpcErr.message)
        if (!grp) throw new Error('Invalid access code. Please check and try again.')
      }
      try {
        const hasHardware = await isBiometricHardwareAvailable()
        const already = await isBiometricLoginEnabled()
        if (hasHardware && !already) {
          await enableBiometricLock()
        }
      } catch {}
      onLogin()
    } catch (e: any) {
      setError(e?.message || "Registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  // No auto biometric here; gating will be in app shell

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentInset={{ bottom: 30 }}
          scrollIndicatorInsets={{ bottom: 24 }}
        >
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
                    textContentType={Platform.OS === "ios" ? "none" : "none"}
                    autoComplete="off"
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
                    textContentType={Platform.OS === "ios" ? "none" : "none"}
                    autoComplete="off"
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
                  textContentType={Platform.OS === "ios" ? (activeTab === 'register' ? 'oneTimeCode' : 'password') : 'none'}
                  autoComplete={activeTab === 'register' ? 'off' : 'password'}
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
                    textContentType={Platform.OS === "ios" ? "none" : "none"}
                    autoComplete="off"
                    ref={confirmRef}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    onFocus={scrollToBottom}
                  />
                </View>
              )}

              {activeTab === "register" && (
                <View style={{ gap: 12 }}>
                  <Text style={styles.inputLabel}>Role</Text>
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[styles.tab, registerRole === 'user' && styles.activeTab]}
                      onPress={() => setRegisterRole('user')}
                    >
                      <Text style={[styles.tabText, registerRole === 'user' && styles.activeTabText]}>User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, registerRole === 'admin' && styles.activeTab]}
                      onPress={() => setRegisterRole('admin')}
                    >
                      <Text style={[styles.tabText, registerRole === 'admin' && styles.activeTabText]}>Admin</Text>
                    </TouchableOpacity>
                  </View>

                  {registerRole === 'admin' && (
                    <View style={{ gap: 16 }}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Group Name</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g., Alpha Cohort"
                          placeholderTextColor="#999"
                          value={groupName}
                          onChangeText={setGroupName}
                          autoCapitalize="words"
                          autoCorrect={false}
                          ref={groupNameRef}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => accessCodeRef.current?.focus()}
                          onFocus={scrollToBottom}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Access Code</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="6–12 letters/numbers (UPPERCASE)"
                          placeholderTextColor="#999"
                          value={accessCode}
                          onChangeText={(v) => setAccessCode(v.toUpperCase())}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          maxLength={12}
                          ref={accessCodeRef}
                          returnKeyType="done"
                          onSubmitEditing={handleRegister}
                          onFocus={scrollToBottom}
                        />
                      </View>
                    </View>
                  )}

                  {registerRole === 'user' && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Access Code</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter code from your coach"
                        placeholderTextColor="#999"
                        value={accessCode}
                        onChangeText={(v) => setAccessCode(v.toUpperCase())}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        ref={accessCodeRef}
                        returnKeyType="done"
                        onSubmitEditing={handleRegister}
                        onFocus={scrollToBottom}
                      />
                    </View>
                  )}
                </View>
              )}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {/* Action buttons stacked; Face ID hidden on Register tab */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity style={[styles.submitButton, submitting && { opacity: 0.6 }]} disabled={submitting} onPress={activeTab === "login" ? handleSignIn : handleRegister}>
                  <Text style={styles.submitButtonText}>
                    {submitting ? "Please wait…" : activeTab === "login" ? "Sign In" : "Create Account"}
                  </Text>
                </TouchableOpacity>
                {activeTab === 'login' && (
                  <TouchableOpacity style={[styles.secondaryButton, submitting && { opacity: 0.6 }]} disabled={submitting} onPress={handleFaceIdLogin}>
                    <Text style={styles.secondaryButtonText}>Sign in with Face ID</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Biometric gating occurs in app shell when session exists */}
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
