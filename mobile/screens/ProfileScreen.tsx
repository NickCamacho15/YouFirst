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
import AvatarPreviewModal from "../components/AvatarPreviewModal"
import { apiCall } from "../lib/api-utils"

interface ScreenProps { onBack?: () => void; onLogout?: () => void }

const ProfileScreen: React.FC<ScreenProps> = ({ onBack, onLogout }) => {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

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
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to upload a profile image.')
        setUploading(false)
        return
      }

      // Launch image picker with NO ASPECT RATIO (free-form selection)
      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ['images'], 
        allowsEditing: true, 
        // Removed aspect ratio constraint to allow free-form cropping
        quality: 0.9 
      })

      if (result.canceled || !result.assets?.length) { 
        setUploading(false)
        return 
      }

      const asset = result.assets[0]
      const originalUri = asset.uri

      // Show a circular preview before upload
      setPreviewUri(originalUri)
      setPreviewOpen(true)

      // Defer actual upload until user confirms
      setUploading(false)
      return

      // Wrap the entire upload process with timeout protection
      await apiCall(
        async () => {
          // Normalize image: crop to square, resize and convert to JPEG
          const manip = await ImageManipulator.manipulateAsync(
            originalUri,
            [
              // Crop to square from center
              { 
                crop: { 
                  originX: Math.max(0, (asset.width - Math.min(asset.width, asset.height)) / 2),
                  originY: Math.max(0, (asset.height - Math.min(asset.width, asset.height)) / 2),
                  width: Math.min(asset.width, asset.height),
                  height: Math.min(asset.width, asset.height)
                } 
              },
              // Resize to reasonable size
              { resize: { width: 1024, height: 1024 } }
            ],
            { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
          )

          const uri = manip.uri
          const fileName = (asset.fileName || uri.split('/').pop() || 'avatar').replace(/\.(heic|heif|png)$/i, '') + '.jpg'
          const mime = 'image/jpeg'

          // Read file with timeout protection
          const response = await Promise.race([
            fetch(uri),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Local file read timed out')), 10000)),
          ]) as Response
          
          let blob = await response.blob()

          // Fallback for iOS/iCloud assets that yield 0-byte blobs
          if (!blob || (blob as any).size === 0) {
            const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
            const binary = atob(b64)
            const len = binary.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
            blob = new Blob([bytes], { type: mime })
          }

          // Upload to storage (has its own timeout in auth.ts)
          const { publicUrl } = await uploadProfileImage(blob as any, mime, fileName)
          
          if (publicUrl) {
            try { await RNImage.prefetch(publicUrl) } catch {}
            setProfileImageUrl(publicUrl)
          }

          // Refresh user context with timeout protection
          await apiCall(
            () => refresh(),
            {
              timeoutMs: 10000,
              maxRetries: 1,
              timeoutMessage: 'Failed to refresh user data'
            }
          )

          return publicUrl
        },
        {
          timeoutMs: 30000, // 30 second total timeout for entire upload process
          maxRetries: 1,
          timeoutMessage: 'Profile image upload timed out. Please check your connection and try again.'
        }
      )

      Alert.alert('Success', 'Your profile picture has been updated!')
    } catch (e: any) {
      console.error('[ProfileScreen] Upload failed:', e)
      Alert.alert('Upload Failed', e?.message || 'Failed to upload profile picture. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const confirmUpload = async () => {
    if (!previewUri) { setPreviewOpen(false); return }
    setPreviewOpen(false)
    setUploading(true)
    try {
      // We still center-crop to square and resize for storage efficiency
      const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
        Image.getSize(previewUri!, (w, h) => resolve({ width: w, height: h }), () => resolve({ width: 1024, height: 1024 }))
      })
      const side = Math.min(width, height)
      const manip = await ImageManipulator.manipulateAsync(
        previewUri,
        [
          { crop: { originX: Math.max(0, (width - side) / 2), originY: Math.max(0, (height - side) / 2), width: side, height: side } },
          { resize: { width: 1024, height: 1024 } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      )
      const uri = manip.uri
      const fileName = (uri.split('/').pop() || 'avatar')
      const mime = 'image/jpeg'

      const response = await Promise.race([
        fetch(uri),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Local file read timed out')), 10000)),
      ]) as Response
      let blob = await response.blob()
      if (!blob || (blob as any).size === 0) {
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        blob = new Blob([bytes], { type: mime })
      }
      const { publicUrl } = await uploadProfileImage(blob as any, mime, fileName)
      if (publicUrl) {
        try { await RNImage.prefetch(publicUrl) } catch {}
        setProfileImageUrl(publicUrl)
      }
      try { await apiCall(() => refresh(), { timeoutMs: 10000, maxRetries: 1 }) } catch {}
      Alert.alert('Success', 'Your profile picture has been updated!')
    } catch (e: any) {
      console.error('[ProfileScreen] Upload failed:', e)
      Alert.alert('Upload Failed', e?.message || 'Failed to upload profile picture. Please try again.')
    } finally {
      setUploading(false)
      setPreviewUri(null)
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
      <AvatarPreviewModal visible={previewOpen} uri={previewUri} onCancel={() => { setPreviewOpen(false); setPreviewUri(null) }} onConfirm={confirmUpload} />
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


