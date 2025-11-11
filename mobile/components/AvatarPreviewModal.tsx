import React from "react"
import { Modal, View, Text, Image, TouchableOpacity, StyleSheet } from "react-native"

interface AvatarPreviewModalProps {
  visible: boolean
  uri: string | null
  onCancel: () => void
  onConfirm: () => void
}

const AvatarPreviewModal: React.FC<AvatarPreviewModalProps> = ({ visible, uri, onCancel, onConfirm }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Preview</Text>
          <View style={styles.circleFrame}>
            {!!uri && (
              <Image source={{ uri }} style={styles.avatarImage} resizeMode="cover" />
            )}
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelText}>Choose Another</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.confirm]} onPress={onConfirm}>
              <Text style={styles.confirmText}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  title: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  circleFrame: { width: 200, height: 200, borderRadius: 100, overflow: "hidden", alignSelf: "center", backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginVertical: 8 },
  avatarImage: { width: 220, height: 220 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  cancel: { backgroundColor: "#F3F4F6", marginRight: 8 },
  confirm: { backgroundColor: "#111827", marginLeft: 8 },
  cancelText: { color: "#111827", fontWeight: "700" },
  confirmText: { color: "#fff", fontWeight: "700" },
})

export default AvatarPreviewModal



