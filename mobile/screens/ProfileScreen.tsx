"use client"

import React, { useEffect, useState } from "react"
import { SafeAreaView, StatusBar, ScrollView, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform } from "react-native"
import TopHeader from "../components/TopHeader"
import { getCurrentUser, updateEmail, updatePassword, updateUsername, uploadProfileImage } from "../lib/auth"
import { Image as RNImage } from "react-native"
import { useUser } from "../lib/user-context"
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system'

interface ScreenProps { onBack?: () => void; onLogout?: () => void }

const ProfileScreen: React.FC<ScreenProps> = ({ onBack, onLogout }) => {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { refresh } = useUser()

  useEffect(() => {
    ;(async () => {
      try {
        const u = await getCurrentUser()
        if (u) {
          setEmail(u.email || "")
          setUsername(u.username || "")
          setProfileImageUrl(u.profileImageUrl || null)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const current = await getCurrentUser()
      if (!current) throw new Error("Not signed in")
      if (email.trim() && email.trim() !== current.email) {
        await updateEmail(email.trim())
      }
      if (username.trim() && username.trim() !== (current.username || "")) {
        await updateUsername(username.trim())
      }
      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          throw new Error("Password must be at least 6 characters")
        }
        await updatePassword(newPassword.trim())
        setNewPassword("")
      }
      Alert.alert("Saved", "Your profile has been updated.")
    } catch (e: any) {
      Alert.alert("Update failed", e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const handlePickImage = async () => {
    try {
      setUploading(true)
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to upload a profile image.')
        setUploading(false)
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.9 })
      if (result.canceled || !result.assets?.length) { setUploading(false); return }
      const asset = result.assets[0]
      const originalUri = asset.uri
      // Normalize image: resize and convert to JPEG to avoid HEIC/PNG/iCloud edge cases
      const manip = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      )
      const uri = manip.uri
      const fileName = (asset.fileName || uri.split('/').pop() || 'avatar').replace(/\.(heic|heif|png)$/i, '') + '.jpg'
      const mime = 'image/jpeg'

      // Prefer Blob upload to avoid base64 decoding pitfalls and guard for stalls
      const response = await Promise.race([
        fetch(uri),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Local file read timed out')), 12000)),
      ]) as Response
      let blob = await response.blob()
      // Fallback path for iOS/iCloud assets that sometimes yield 0-byte blobs
      if (!blob || (blob as any).size === 0) {
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
        const binary = atob(b64)
        const len = binary.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
        blob = new Blob([bytes], { type: mime })
      }
      const { publicUrl } = await uploadProfileImage(blob as any, mime, fileName)
      if (publicUrl) {
        try { await RNImage.prefetch(publicUrl) } catch {}
      }
      setProfileImageUrl(publicUrl || null)
      // Refresh user context so header picks up new URL immediately
      try { await refresh() } catch {}
      Alert.alert('Updated', 'Your profile picture has been updated.')
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || String(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      {/* Header rendered persistently in App */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>My Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} disabled={uploading}>
            <View style={[styles.avatarCircle, { overflow: 'hidden', opacity: uploading ? 0.7 : 1 }]}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={{ width: 96, height: 96 }}
                  resizeMode="cover"
                  onError={() => setProfileImageUrl(null)}
                />
              ) : (
                <Text style={styles.avatarInitial}>{(username || email || "U").slice(0,1).toUpperCase()}</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={{ marginTop: 8, color: '#6b7280' }}>{uploading ? 'Uploading…' : 'Tap to change photo'}</Text>
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            inputMode="email"
            autoCapitalize="none"
            placeholder="you@example.com"
            style={styles.input}
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={(t) => setUsername(t.replace(/\s+/g, "").toLowerCase())}
            autoCapitalize="none"
            placeholder="username"
            style={styles.input}
          />

          <Text style={styles.label}>New Password</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]} disabled={saving} onPress={handleSave}>
            <Text style={styles.saveText}>{saving ? "Saving…" : "Save Changes"}</Text>
          </TouchableOpacity>
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
  scroll: { flex: 1 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  label: { marginTop: 8, marginBottom: 6, color: "#374151", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff" },
  saveBtn: { marginTop: 16, backgroundColor: "#111827", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
  avatarContainer: { alignItems: "center", marginTop: 6, marginBottom: 6 },
  avatarCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontSize: 36, fontWeight: "800" },
})

export default ProfileScreen


