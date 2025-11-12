import React, { useEffect, useMemo, useState } from "react"
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"

type Field = {
  key: string
  label?: string
  placeholder?: string
  multiline?: boolean
  type?: "text" | "date"
}

interface EditEntityModalProps {
  visible: boolean
  title: string
  accentColor?: string
  fields: Field[]
  initialValues?: Record<string, string | undefined>
  submitLabel?: string
  onClose: () => void
  onSubmit: (values: Record<string, string>) => Promise<void> | void
}

const EditEntityModal: React.FC<EditEntityModalProps> = ({ visible, title, accentColor = "#4A90E2", fields, initialValues, submitLabel = "Save", onClose, onSubmit }) => {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [openPickers, setOpenPickers] = useState<Record<string, boolean>>({})

  const toDateKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`
  }

  const parseDateKey = (s: string | undefined): Date | null => {
    if (!s) return null
    const m = /^\d{4}-\d{2}-\d{2}$/.test(s)
    if (!m) return null
    const [yy, mm, dd] = s.split("-").map(Number)
    return new Date(yy, (mm || 1) - 1, dd || 1)
  }

  useEffect(() => {
    const start: Record<string, string> = {}
    fields.forEach((f) => {
      const v = initialValues?.[f.key]
      start[f.key] = typeof v === "string" ? v : ""
    })
    setValues(start)
  }, [visible, fields, initialValues])

  const canSubmit = useMemo(() => {
    // at least one field must be non-empty
    return fields.some((f) => (values[f.key] || "").trim().length > 0)
  }, [fields, values])

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  const handleSubmit = async () => {
    if (saving) return
    setSaving(true)
    try {
      const cleaned: Record<string, string> = {}
      Object.keys(values).forEach((k) => (cleaned[k] = (values[k] || "").trim()))
      await onSubmit(cleaned)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {fields.map((f) => {
              const type = f.type || "text"
              if (type === "date") {
                const currentStr = values[f.key] || ""
                const parsed = parseDateKey(currentStr) || new Date()
                const open = !!openPickers[f.key]
                return (
                  <View key={f.key} style={{ marginBottom: 10 }}>
                    {!!f.label && <Text style={styles.label}>{f.label}</Text>}
                    <TouchableOpacity
                      onPress={() => setOpenPickers((prev) => ({ ...prev, [f.key]: !open }))}
                      style={[styles.input, { justifyContent: "center" }]}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: currentStr ? "#111827" : "#9CA3AF" }}>
                        {currentStr || f.placeholder || "Select date"}
                      </Text>
                    </TouchableOpacity>
                    {open && (
                      <View style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 10, marginTop: 6, overflow: "hidden" }}>
                        <DateTimePicker
                          value={parsed}
                          mode="date"
                          display={Platform.OS === "ios" ? "inline" : "default"}
                          onChange={(_, selectedDate) => {
                            if (Platform.OS !== "ios") setOpenPickers((prev) => ({ ...prev, [f.key]: false }))
                            const d = selectedDate || parsed
                            handleChange(f.key, toDateKey(d))
                          }}
                        />
                      </View>
                    )}
                  </View>
                )
              }
              return (
                <View key={f.key} style={{ marginBottom: 10 }}>
                  {!!f.label && <Text style={styles.label}>{f.label}</Text>}
                  <TextInput
                    value={values[f.key] || ""}
                    onChangeText={(t) => handleChange(f.key, t)}
                    placeholder={f.placeholder}
                    placeholderTextColor="#9CA3AF"
                    multiline={!!f.multiline}
                    style={[styles.input, f.multiline ? { height: 100, textAlignVertical: "top" } : null]}
                  />
                </View>
              )
            })}
            <View style={[styles.footer, { marginTop: 16 }]}>
              <TouchableOpacity onPress={onClose} style={[styles.footerBtn, styles.secondaryBtn]}>
                <Text style={[styles.footerBtnText, { color: "#111827" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit || saving} style={[styles.footerBtn, { backgroundColor: accentColor, opacity: !canSubmit || saving ? 0.7 : 1 }]}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerPrimaryText}>{submitLabel}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { width: "100%", maxWidth: 520, backgroundColor: "#fff", borderRadius: 16, padding: 20, maxHeight: "80%" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  label: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#111827" },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  footerBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", marginLeft: 8 },
  secondaryBtn: { backgroundColor: "#F3F4F6", marginLeft: 0, marginRight: 6 },
  footerBtnText: { color: "#fff", fontWeight: "700" },
  footerPrimaryText: { color: "#fff", fontWeight: "700" },
})

export default EditEntityModal


