import type React from "react"
import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Image } from "react-native"
import { User, LogOut } from "lucide-react-native"
import { logout as supabaseLogout } from "../lib/auth"
import { forceClearAuthStorage } from "../lib/supabase"
import { useUser } from "../lib/user-context"

interface TopHeaderProps { showShadow?: boolean; onLogout?: () => void; onOpenProfile?: () => void }

const TopHeader: React.FC<TopHeaderProps> = ({ showShadow = false, onLogout, onOpenProfile }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { user, refresh } = useUser()
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [profileInitial, setProfileInitial] = useState<string>('')

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      // Race sign-out with a timeout to ensure UI never hangs
      await Promise.race([
        supabaseLogout(),
        new Promise<void>((resolve) => setTimeout(() => resolve(), 2500)),
      ])
    } catch {
      // ignore; proceed to local logout state regardless
    } finally {
      try { await forceClearAuthStorage() } catch {}
      // Fire-and-forget refresh to avoid blocking UI during logout
      try { setTimeout(() => { refresh().catch(()=>{}) }, 0) } catch {}
      // Close UI and force local logout state immediately
      try { setMenuOpen(false) } catch {}
      try { setLoggingOut(false) } catch {}
      onLogout && onLogout()
    }
  }

  useEffect(() => {
    const url = user?.profileImageUrl || null
    console.log('[TopHeader] Profile image URL updated:', url)
    setProfileImageUrl(url)
    
    const init = (user?.username || user?.email || 'U').slice(0,1).toUpperCase()
    setProfileInitial(init)
  }, [user])

  return (
    <View style={[styles.header, showShadow && styles.headerShadow]}> 
      <View style={styles.left}>
        <Text style={styles.brandText}>.uoY</Text>
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={async () => { setMenuOpen(v => !v); try { await refresh(); } catch {} }}
          activeOpacity={0.8}
        >
          {profileImageUrl ? (
            <Image 
              source={{ uri: profileImageUrl }} 
              style={{ width: 32, height: 32, borderRadius: 16 }} 
              onError={(error) => {
                console.error('[TopHeader] Image load error:', error.nativeEvent)
                setProfileImageUrl(null)
              }}
              onLoad={() => console.log('[TopHeader] Image loaded successfully')}
            />
          ) : profileInitial ? (
            <Text style={styles.profileInitial}>{profileInitial}</Text>
          ) : (
            <User color="#fff" width={16} height={16} />
          )}
        </TouchableOpacity>
      </View>

      {menuOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={() => { setMenuOpen(false) }} />
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); onOpenProfile && onOpenProfile() }}>
              <User color="#111" width={18} height={18} />
              <Text style={styles.menuText}>My Profile</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout} disabled={loggingOut}>
              <LogOut color="#ef4444" width={18} height={18} />
              <Text style={[styles.menuText, { color: "#ef4444" }]}>{loggingOut ? "Logging out…" : "Log Out"}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f8f9fa",
    zIndex: 10,
  },
  headerShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  left: { flex: 1 },
  brandText: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#111",
  },
  right: { flexDirection: "row", alignItems: "center" },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: { color: "#fff", fontWeight: "700" },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  menu: {
    position: "absolute",
    right: 16,
    top: 54,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    width: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuText: { marginLeft: 8, color: "#111", fontSize: 14, fontWeight: "600" },
  menuDivider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 4 },
})

export default TopHeader


