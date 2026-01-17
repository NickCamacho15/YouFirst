"use client"

import React, { useEffect, useState } from "react"
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl, Platform, TouchableOpacity, Modal, TextInput } from "react-native"
import { supabase } from "../lib/supabase"
import { useUser } from "../lib/user-context"
import { createGroupChallengeTemplate, listGroupChallengeTemplates, setChallengeTemplateStatus, type ChallengeTemplateRow, type ChallengeTemplateStartMode } from "../lib/challenge-templates"
import { Ionicons } from "@expo/vector-icons"

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
  const [templates, setTemplates] = useState<ChallengeTemplateRow[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState<40 | 70 | 100>(40)
  const [ruleInput, setRuleInput] = useState("")
  const [rules, setRules] = useState<string[]>([])
  const [startMode, setStartMode] = useState<ChallengeTemplateStartMode>("rolling")
  const [startDate, setStartDate] = useState("")
  const [joinDeadline, setJoinDeadline] = useState("")
  const [saving, setSaving] = useState(false)

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

      setTemplatesLoading(true)
      try {
        const t = await listGroupChallengeTemplates()
        setTemplates(t)
      } finally {
        setTemplatesLoading(false)
      }
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

  function addRule() {
    const trimmed = ruleInput.trim()
    if (!trimmed) return
    setRules((prev) => [...prev, trimmed])
    setRuleInput("")
  }

  function removeRule(idx: number) {
    setRules((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleCreate() {
    if (!user?.groupId) return
    if (!title.trim()) return
    if (startMode === "fixed" && !startDate.trim()) return
    setSaving(true)
    try {
      await createGroupChallengeTemplate({
        groupId: user.groupId,
        title: title.trim(),
        description: description.trim() || undefined,
        durationDays: duration,
        rules,
        startMode,
        startDate: startMode === "fixed" ? startDate.trim() : undefined,
        joinDeadline: startMode === "fixed" ? (joinDeadline.trim() || undefined) : undefined,
      })
      setShowCreate(false)
      setTitle("")
      setDescription("")
      setDuration(40)
      setRules([])
      setRuleInput("")
      setStartMode("rolling")
      setStartDate("")
      setJoinDeadline("")
      await load()
    } catch (e: any) {
      setError(e?.message || "Failed to create challenge template")
    } finally {
      setSaving(false)
    }
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

          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.sectionTitle}>Group Challenges</Text>
              <TouchableOpacity style={styles.smallBtn} onPress={() => setShowCreate(true)}>
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {templatesLoading ? (
              <ActivityIndicator size="small" color="#888" />
            ) : templates.length === 0 ? (
              <Text style={styles.muted}>No group challenges yet. Create one to publish an opt-in challenge.</Text>
            ) : (
              <View style={{ gap: 12, marginTop: 10 }}>
                {templates.map((t) => (
                  <View key={t.id} style={styles.templateRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.templateTitle}>{t.title}</Text>
                      {!!t.description && <Text style={styles.templateSubtitle}>{t.description}</Text>}
                      <Text style={styles.templateMeta}>{t.duration_days} days • {t.start_mode === "fixed" ? `fixed (${t.start_date || "n/a"})` : "rolling"} • {t.status.toUpperCase()}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                      {t.status === "published" ? (
                        <TouchableOpacity
                          style={[styles.pillBtn, styles.pillBtnDark]}
                          onPress={async () => { try { await setChallengeTemplateStatus(t.id, "draft"); await load() } catch(e:any) { setError(e?.message || "Failed") } }}
                        >
                          <Text style={styles.pillBtnTextDark}>Unpublish</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.pillBtn, styles.pillBtnPrimary]}
                          onPress={async () => { try { await setChallengeTemplateStatus(t.id, "published"); await load() } catch(e:any) { setError(e?.message || "Failed") } }}
                        >
                          <Text style={styles.pillBtnTextPrimary}>Publish</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      )}

      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView style={[styles.container]}> 
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: "700" }}>Create Group Challenge</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g., 40-Day Consistency" style={styles.input} />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder="What is the challenge about?" style={[styles.input, { height: 90, textAlignVertical: "top" }]} multiline />

            <Text style={styles.inputLabel}>Duration</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {[40, 70, 100].map((d) => (
                <TouchableOpacity key={d} onPress={() => setDuration(d as 40 | 70 | 100)} style={[styles.durationPill, duration === d && styles.durationPillActive]}>
                  <Text style={[styles.durationPillText, duration === d && styles.durationPillTextActive]}>{d} Days</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Start Mode</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {(["rolling", "fixed"] as const).map((m) => (
                <TouchableOpacity key={m} onPress={() => setStartMode(m)} style={[styles.durationPill, startMode === m && styles.durationPillActive]}>
                  <Text style={[styles.durationPillText, startMode === m && styles.durationPillTextActive]}>{m === "rolling" ? "Rolling" : "Fixed"}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {startMode === "fixed" ? (
              <>
                <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD) *</Text>
                <TextInput value={startDate} onChangeText={setStartDate} placeholder="2026-01-20" style={styles.input} autoCapitalize="none" />
                <Text style={styles.inputLabel}>Join Deadline (YYYY-MM-DD)</Text>
                <TextInput value={joinDeadline} onChangeText={setJoinDeadline} placeholder="2026-01-20" style={styles.input} autoCapitalize="none" />
              </>
            ) : null}

            <Text style={styles.inputLabel}>Rules</Text>
            <View style={styles.inputRow}>
              <TextInput value={ruleInput} onChangeText={setRuleInput} placeholder="Type a rule and press +" style={[styles.input, styles.ruleInput, { flex: 1, marginRight: 8 }]} onSubmitEditing={addRule} />
              <TouchableOpacity style={styles.addRuleButton} onPress={addRule}>
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {rules.map((r, idx) => (
              <View key={`${r}-${idx}`} style={styles.ruleChipRow}>
                <Text style={styles.ruleChipText}>{r}</Text>
                <TouchableOpacity onPress={() => removeRule(idx)} style={{ paddingLeft: 8 }}>
                  <Ionicons name="close" size={16} color="#777" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={[styles.primaryButton, { marginTop: 12, opacity: saving || !title.trim() ? 0.7 : 1 }]} disabled={saving || !title.trim()} onPress={handleCreate}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create Draft</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryButton, { marginTop: 10 }]} onPress={() => setShowCreate(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  smallBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  templateRow: { flexDirection: "row", alignItems: "flex-start" },
  templateTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  templateSubtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  templateMeta: { fontSize: 11, color: "#6b7280", marginTop: 6, fontWeight: "700" },
  pillBtn: { height: 34, paddingHorizontal: 12, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  pillBtnPrimary: { backgroundColor: "#4A90E2" },
  pillBtnTextPrimary: { color: "#fff", fontWeight: "900", fontSize: 12 },
  pillBtnDark: { backgroundColor: "#111827" },
  pillBtnTextDark: { color: "#fff", fontWeight: "900", fontSize: 12 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  inputRow: { flexDirection: "row", alignItems: "center" },
  ruleInput: { marginBottom: 0 },
  addRuleButton: { height: 44, width: 44, backgroundColor: "#4A90E2", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ruleChipRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 8 },
  ruleChipText: { color: "#111827", fontWeight: "600", flex: 1 },
  durationPill: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff" },
  durationPillActive: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  durationPillText: { color: "#374151", fontWeight: "600" },
  durationPillTextActive: { color: "#1d4ed8" },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4A90E2", height: 48, borderRadius: 12, marginBottom: 20 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryButton: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  secondaryButtonText: { color: "#111827", fontWeight: "700", fontSize: 16 },
})

export default AdminScreen


