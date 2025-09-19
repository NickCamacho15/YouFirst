"use client"

import React, { useEffect, useState } from "react"
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl, Platform } from "react-native"
import { supabase } from "../lib/supabase"
import { useUser } from "../lib/user-context"

type GroupRow = {
  id: string
  name: string
  access_code: string
  created_by: string
  created_at: string
}

type MemberRow = {
  id: string
  email: string
  display_name: string | null
  username: string | null
  role: 'admin' | 'user' | null
  created_at: string
}

const AdminScreen: React.FC = () => {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [group, setGroup] = useState<GroupRow | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])

  const canView = user?.role === 'admin' && !!user?.groupId

  const load = async () => {
    if (!canView) { setLoading(false); return }
    setError(null)
    try {
      const [grp, mbrs] = await Promise.all([
        supabase.from<GroupRow>('groups').select('id, name, access_code, created_by, created_at').eq('id', user!.groupId as string).maybeSingle(),
        supabase.from<MemberRow>('users').select('id, email, display_name, username, role, created_at').eq('group_id', user!.groupId as string).order('role', { ascending: false }).order('display_name', { ascending: true }),
      ])
      if (grp.error) throw new Error(grp.error.message)
      if (mbrs.error) throw new Error(mbrs.error.message)
      setGroup(grp.data || null)
      setMembers(mbrs.data || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.groupId])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (!canView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.muted}>Admin access required.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.center}> 
          <ActivityIndicator size="small" color="#888" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}> 
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Group</Text>
            {group ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{group.name}</Text>
                <Text style={styles.label}>Access Code</Text>
                <Text style={styles.valueMono}>{group.access_code}</Text>
              </View>
            ) : (
              <Text style={styles.muted}>No group found.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Members</Text>
            {members.length === 0 ? (
              <Text style={styles.muted}>No members yet.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {members.map(m => (
                  <View key={m.id} style={styles.memberRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{m.display_name || m.username || m.email}</Text>
                      <Text style={styles.memberSub}>{m.email}{m.username ? ` • @${m.username}` : ''}</Text>
                    </View>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleText}>{(m.role || 'user').toUpperCase()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111', marginBottom: 12 },
  label: { fontSize: 12, color: '#666' },
  value: { fontSize: 16, color: '#111', marginBottom: 8 },
  valueMono: { fontSize: 16, color: '#111', marginBottom: 8, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  muted: { color: '#666' },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: { fontSize: 16, color: '#111' },
  memberSub: { fontSize: 12, color: '#666', marginTop: 2 },
  roleBadge: { backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  error: { color: '#EF4444', textAlign: 'center' },
})

export default AdminScreen


