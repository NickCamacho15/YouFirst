import type React from "react"
import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native"
import { Bell, User, LogOut } from "lucide-react-native"
import { getUnreadCount, markAllRead } from "../lib/notifications"
import { logout as supabaseLogout } from "../lib/auth"

interface TopHeaderProps { showShadow?: boolean; onLogout?: () => void }

const TopHeader: React.FC<TopHeaderProps> = ({ showShadow = false, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try { const c = await getUnreadCount(); if (mounted) setUnread(c) } catch {}
    })()
    return () => { mounted = false }
  }, [])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await supabaseLogout()
    } catch (e) {
      // no-op; we still reset local state below
    } finally {
      setMenuOpen(false)
      setLoggingOut(false)
      onLogout && onLogout()
    }
  }

  return (
    <View style={[styles.header, showShadow && styles.headerShadow]}> 
      <View style={styles.left}>
        <Text style={styles.brandText}>.uoY</Text>
      </View>

      <View style={styles.right}>
        <TouchableOpacity style={styles.iconButton} hitSlop={8} onPress={async ()=> { await markAllRead(); setUnread(0) }}>
          <View>
            <Bell color="#111" width={22} height={22} />
            {unread > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text></View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileButton} onPress={() => setMenuOpen(v => !v)} activeOpacity={0.8}>
          <User color="#fff" width={16} height={16} />
        </TouchableOpacity>
      </View>

      {menuOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuOpen(false)}>
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
  iconButton: { padding: 6, marginRight: 8 },
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
  badge: {
    position: "absolute",
    right: -4,
    top: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
})

export default TopHeader


