"use client"

import React, { useEffect, useState } from "react"
import { SafeAreaView, StatusBar, ScrollView, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform } from "react-native"
import TopHeader from "../components/TopHeader"
import { getCurrentUser, updateEmail, updatePassword, updateUsername } from "../lib/auth"
import { uploadProfileImage } from "../lib/profile-image"
import { useUser } from "../lib/user-context"
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system'
import AvatarPreviewModal from "../components/AvatarPreviewModal"

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

  const { refresh, setUser } = useUser()

  useEffect(() => {
    ;(async () => {
      try {
        const u = await getCurrentUser()
        if (u) {
          setEmail(u.email || "")
          setUsername(u.username || "")
          // Validate profile image URL by checking if it loads
          if (u.profileImageUrl) {
            // Check if the URL returns a valid image (not 0 bytes)
            fetch(u.profileImageUrl, { method: 'HEAD' })
              .then(response => {
                const contentLength = response.headers.get('content-length')
                if (contentLength && parseInt(contentLength) > 0) {
                  setProfileImageUrl(u.profileImageUrl || null)
                } else {
                  console.warn('[ProfileScreen] Profile image is empty, ignoring')
                  setProfileImageUrl(null)
                }
              })
              .catch(() => {
                console.warn('[ProfileScreen] Failed to validate profile image')
                setProfileImageUrl(null)
              })
          }
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
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to upload a profile image.')
        return
      }

      // Launch image picker with free-form editing
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9
      })

      if (result.canceled || !result.assets?.length) {
        return
      }

      const asset = result.assets[0]
      
      // Show circular preview modal before upload
      setPreviewUri(asset.uri)
      setPreviewOpen(true)
    } catch (error: any) {
      console.error('[ProfileScreen] Image picker failed:', error)
      Alert.alert('Error', 'Failed to open image picker. Please try again.')
    }
  }

  const confirmUpload = async () => {
    if (!previewUri) {
      setPreviewOpen(false)
      return
    }

    setPreviewOpen(false)
    setUploading(true)

    try {
      console.log('[ProfileScreen] Starting image upload process')

      // Step 1: Get image dimensions
      const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(
          previewUri!,
          (w, h) => resolve({ width: w, height: h }),
          (error) => {
            console.error('[ProfileScreen] Failed to get image size:', error)
            resolve({ width: 1024, height: 1024 }) // Fallback
          }
        )
      })

      console.log('[ProfileScreen] Image dimensions:', { width, height })

      // Step 2: Crop to square and resize
      const side = Math.min(width, height)
      const manipResult = await ImageManipulator.manipulateAsync(
        previewUri,
        [
          {
            crop: {
              originX: Math.max(0, (width - side) / 2),
              originY: Math.max(0, (height - side) / 2),
              width: side,
              height: side
            }
          },
          { resize: { width: 1024, height: 1024 } }
        ],
        {
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG
        }
      )

      console.log('[ProfileScreen] Image manipulated:', manipResult.uri)

      // Step 3: Read file into blob
      const fileName = manipResult.uri.split('/').pop() || 'avatar.jpg'
      const contentType = 'image/jpeg'

      // React Native: Use FormData with the file URI directly
      console.log('[ProfileScreen] Reading file from:', manipResult.uri)
      const fileInfo = await FileSystem.getInfoAsync(manipResult.uri)
      console.log('[ProfileScreen] File info:', fileInfo)

      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('Image file is empty or does not exist')
      }

      // Read as base64 and convert to ArrayBuffer (Supabase accepts ArrayBuffer)
      const b64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64
      })
      
      console.log('[ProfileScreen] Base64 length:', b64.length)
      
      // Convert base64 to ArrayBuffer (not Uint8Array or Blob)
      const binaryString = atob(b64)
      const len = binaryString.length
      const arrayBuffer = new ArrayBuffer(len)
      const uint8Array = new Uint8Array(arrayBuffer)
      for (let i = 0; i < len; i++) {
        uint8Array[i] = binaryString.charCodeAt(i)
      }

      console.log('[ProfileScreen] ArrayBuffer created, size:', arrayBuffer.byteLength)
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Created buffer is empty. Please try selecting a different image.')
      }

      // Step 4: Upload to Supabase (pass ArrayBuffer)
      const displayUrl = await uploadProfileImage(arrayBuffer, contentType, fileName)

      console.log('[ProfileScreen] Upload successful, URL:', displayUrl)

      // Step 5: Update local UI state immediately
      setProfileImageUrl(displayUrl)

      // Step 6: Update global user context for header/nav
      setUser((prev) => {
        if (!prev) return prev
        return { ...prev, profileImageUrl: displayUrl }
      })

      // Step 7: Show success immediately
      Alert.alert('Success', 'Your profile picture has been updated!')

      // Step 8: Trigger a delayed background refresh to sync with database
      // Wait 2 seconds to give database update time to complete
      setTimeout(() => {
        refresh().catch((error) => {
          console.warn('[ProfileScreen] Background refresh failed (non-critical):', error)
        })
      }, 2000)
    } catch (error: any) {
      console.error('[ProfileScreen] Upload failed:', error)
      Alert.alert(
        'Upload Failed',
        error?.message || 'Failed to upload profile picture. Please try again.'
      )
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
                  onError={(error) => {
                    console.error('[ProfileScreen] Image load error:', error.nativeEvent)
                    setProfileImageUrl(null)
                  }}
                  onLoad={() => console.log('[ProfileScreen] Image loaded successfully')}
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


