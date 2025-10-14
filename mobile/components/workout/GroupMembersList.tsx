import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, AppState } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { listGroupMembers, type GroupMember } from '../../lib/workout-assignments'
import { apiCall } from '../../lib/api-utils'

interface GroupMembersListProps {
  onMemberPress?: (member: GroupMember) => void
}

const GroupMembersList: React.FC<GroupMembersListProps> = ({ onMemberPress }) => {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    loadMembers()

    // Refresh when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[GroupMembersList] App came to foreground, refreshing...')
        loadMembers()
      }
      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [])

  const loadMembers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiCall(
        () => listGroupMembers(),
        {
          timeoutMs: 15000, // 15 second timeout
          maxRetries: 2,
          timeoutMessage: 'Failed to load members. Please check your connection and try again.'
        }
      )
      setMembers(data)
    } catch (err: any) {
      console.error('Failed to load group members:', err)
      setError(err.message || 'Failed to load members. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading members...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadMembers}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (members.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="people-outline" size={40} color="#ccc" />
        <Text style={styles.emptyText}>No members yet</Text>
        <Text style={styles.emptySubtext}>Share your access code to invite members</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {members.map((member) => (
        <TouchableOpacity
          key={member.id}
          style={styles.memberCard}
          onPress={() => onMemberPress?.(member)}
          disabled={!onMemberPress}
        >
          <View style={styles.memberAvatar}>
            <Text style={styles.memberInitial}>
              {member.username?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.username || 'No username'}</Text>
            <Text style={styles.memberEmail}>{member.email}</Text>
          </View>
          {member.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#999',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: '#666',
  },
  adminBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
})

export default GroupMembersList

