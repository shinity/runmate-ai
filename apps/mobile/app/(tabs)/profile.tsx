import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useAuthStore } from '../../stores/auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { PersonalRecord } from '@runmate/types'
import { formatPace } from '../../lib/format'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()

  const { data: prs } = useQuery({
    queryKey: ['runs', 'personal-records'],
    queryFn: async () => {
      const { data } = await api.get<PersonalRecord[]>('/runs/personal-records')
      return data
    },
  })

  const GOAL_LABELS: Record<string, string> = {
    fitness: '건강 유지',
    '5k': '5km 완주',
    '10k': '10km 완주',
    half_marathon: '하프 마라톤',
    marathon: '마라톤',
    ultra: '울트라 마라톤',
  }

  const LEVEL_LABELS: Record<string, string> = {
    beginner: '입문자',
    intermediate: '중급자',
    advanced: '고급자',
    elite: '엘리트',
  }

  const DISTANCE_LABELS: Record<string, string> = {
    '5k': '5km',
    '10k': '10km',
    half_marathon: '하프 마라톤',
    marathon: '마라톤',
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{LEVEL_LABELS[user?.experienceLevel ?? ''] ?? '입문자'}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{GOAL_LABELS[user?.primaryGoal ?? ''] ?? '건강 유지'}</Text>
          </View>
        </View>
      </View>

      {/* Personal Records */}
      {prs && prs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>개인 최고 기록</Text>
          <View style={styles.card}>
            {prs.map((pr: any, i: number) => (
              <View key={pr.distance} style={[styles.prRow, i > 0 && styles.prRowBorder]}>
                <Text style={styles.prDistance}>{DISTANCE_LABELS[pr.distance] ?? pr.distance}</Text>
                <Text style={styles.prPace}>{formatPace(pr.avgPaceSecPerKm)}/km</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Settings */}
      <Text style={styles.sectionTitle}>설정</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow}>
          <Text style={styles.settingLabel}>프로필 수정</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingRow, styles.settingRowBorder]}>
          <Text style={styles.settingLabel}>연결된 기기</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingRow, styles.settingRowBorder]}>
          <Text style={styles.settingLabel}>매칭 설정</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingRow, styles.settingRowBorder]}
          onPress={() => Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: logout },
          ])}
        >
          <Text style={[styles.settingLabel, { color: '#ef4444' }]}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  name: { color: '#f8fafc', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  email: { color: '#64748b', fontSize: 14, marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: '#94a3b8', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  prRowBorder: { borderTopWidth: 1, borderTopColor: '#334155' },
  prDistance: { color: '#94a3b8', fontSize: 15 },
  prPace: { color: '#f8fafc', fontWeight: '700', fontSize: 15 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  settingRowBorder: { borderTopWidth: 1, borderTopColor: '#334155' },
  settingLabel: { color: '#e2e8f0', fontSize: 15 },
  settingArrow: { color: '#64748b', fontSize: 20 },
})
