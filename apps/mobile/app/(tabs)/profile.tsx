import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../stores/auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { PersonalRecord } from '@runmate/types'
import { formatPace } from '../../lib/format'
import { useHealthSync } from '../../hooks/useHealthSync'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const {
    isSyncing,
    lastSyncAt,
    syncError,
    syncedCount,
    syncWorkouts,
    requestPermissions,
  } = useHealthSync()

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

  const healthAppName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'
  const healthAppIcon = Platform.OS === 'ios' ? '' : ''

  function formatLastSyncAt(iso: string | null): string {
    if (!iso) return '동기화 기록 없음'
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}시간 전`
    const diffDay = Math.floor(diffHour / 24)
    return `${diffDay}일 전`
  }

  async function handleRequestPermissions() {
    const granted = await requestPermissions()
    if (granted) {
      Alert.alert('연동 완료', `${healthAppName}와 연동되었습니다. 이제 워크아웃을 동기화할 수 있습니다.`)
    } else {
      Alert.alert(
        '권한 필요',
        `${healthAppName} 연동을 위해 건강 데이터 읽기 권한이 필요합니다. 설정에서 권한을 허용해주세요.\n\n참고: Custom Dev Build 환경에서만 동작합니다.`,
        [{ text: '확인' }]
      )
    }
  }

  async function handleSyncWorkouts() {
    await syncWorkouts()
    if (syncError) {
      Alert.alert('동기화 실패', syncError)
    } else if (syncedCount > 0) {
      Alert.alert('동기화 완료', `${syncedCount}개의 런이 동기화되었습니다.`)
    } else {
      Alert.alert('동기화 완료', '새로 동기화할 런이 없습니다.')
    }
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
                <Text style={styles.prPace}>{formatPace(pr.paceSecPerKm)}/km</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 건강 앱 연동 */}
      <Text style={styles.sectionTitle}>건강 앱 연동</Text>
      <View style={styles.card}>
        {/* 연동 상태 및 권한 요청 */}
        <View style={styles.healthHeader}>
          <View style={styles.healthTitleRow}>
            <Ionicons name="heart" size={20} color={Platform.OS === 'ios' ? '#ef4444' : '#22c55e'} style={{ marginTop: 2 }} />
            <View>
              <Text style={styles.healthTitle}>{healthAppName} 연동</Text>
              <Text style={styles.healthSubtitle}>
                Apple Watch, Garmin 등 웨어러블 기기의{'\n'}러닝 데이터를 자동으로 가져옵니다
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleRequestPermissions}
            activeOpacity={0.8}
          >
            <Text style={styles.connectButtonText}>권한 허용</Text>
          </TouchableOpacity>
        </View>

        {/* 동기화 상태 정보 */}
        <View style={styles.syncStatusRow}>
          <View style={styles.syncStatusItem}>
            <Text style={styles.syncStatusLabel}>마지막 동기화</Text>
            <Text style={styles.syncStatusValue}>{formatLastSyncAt(lastSyncAt)}</Text>
          </View>
          {lastSyncAt && (
            <View style={styles.syncStatusItem}>
              <Text style={styles.syncStatusLabel}>최근 동기화</Text>
              <Text style={[styles.syncStatusValue, { color: '#22c55e' }]}>{syncedCount}개 런</Text>
            </View>
          )}
        </View>

        {/* 오류 메시지 */}
        {syncError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{syncError}</Text>
          </View>
        )}

        {/* 지금 동기화 버튼 */}
        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={handleSyncWorkouts}
          disabled={isSyncing}
          activeOpacity={0.8}
        >
          {isSyncing ? (
            <View style={styles.syncButtonContent}>
              <ActivityIndicator size="small" color="#f8fafc" style={{ marginRight: 8 }} />
              <Text style={styles.syncButtonText}>동기화 중...</Text>
            </View>
          ) : (
            <Text style={styles.syncButtonText}>지금 동기화</Text>
          )}
        </TouchableOpacity>

        {/* 안내 문구 */}
        <Text style={styles.healthNote}>
          * Custom Dev Build 또는 bare workflow 환경에서만 동작합니다.
        </Text>
      </View>

      {/* Settings */}
      <Text style={styles.sectionTitle}>설정</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('준비 중', '프로필 수정 기능은 곧 출시됩니다.')}>
          <Text style={styles.settingLabel}>프로필 수정</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingRow, styles.settingRowBorder]} onPress={() => Alert.alert('준비 중', '기기 연결 기능은 곧 출시됩니다.')}>
          <Text style={styles.settingLabel}>연결된 기기</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingRow, styles.settingRowBorder]} onPress={() => Alert.alert('준비 중', '매칭 설정 기능은 곧 출시됩니다.')}>
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

  // 건강 앱 연동 섹션
  healthHeader: { padding: 16, gap: 12 },
  healthTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  healthTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  healthSubtitle: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  connectButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  connectButtonText: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  syncStatusRow: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  syncStatusItem: { gap: 2 },
  syncStatusLabel: { color: '#64748b', fontSize: 11 },
  syncStatusValue: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#450a0a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: { color: '#ef4444', fontSize: 12 },
  syncButton: {
    margin: 16,
    marginTop: 4,
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  syncButtonDisabled: { backgroundColor: '#334155' },
  syncButtonContent: { flexDirection: 'row', alignItems: 'center' },
  syncButtonText: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  healthNote: {
    color: '#475569',
    fontSize: 11,
    paddingHorizontal: 16,
    paddingBottom: 14,
    lineHeight: 16,
  },
})
