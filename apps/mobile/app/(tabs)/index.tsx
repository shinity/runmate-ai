import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useWeeklyStats, useRuns } from '../../hooks/useRuns'
import { useRecoveryStatus, useCoachingInsights } from '../../hooks/useCoaching'
import { useAuthStore } from '../../stores/auth'
import { formatPace, formatDistance } from '../../lib/format'

export default function HomeScreen() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { data: stats } = useWeeklyStats()
  const { data: recovery } = useRecoveryStatus()
  const { data: insights } = useCoachingInsights()

  const { data: runs } = useRuns()
  const latestRouteArt = runs?.find((r) => !!r.routeArtUrl) ?? null

  const unreadInsights = insights?.filter((i) => !i.readAt).length ?? 0

  const recoveryColor =
    recovery?.recommendation === 'hard'
      ? '#22c55e'
      : recovery?.recommendation === 'moderate'
      ? '#3b82f6'
      : recovery?.recommendation === 'easy'
      ? '#f59e0b'
      : '#ef4444'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <Text style={styles.greeting}>안녕하세요, {user?.displayName ?? '러너'} 👋</Text>
      <Text style={styles.subtitle}>오늘도 달려볼까요?</Text>

      {/* Recovery Card */}
      {recovery && (
        <View style={[styles.card, { borderLeftColor: recoveryColor, borderLeftWidth: 4 }]}>
          <Text style={styles.cardLabel}>오늘의 컨디션</Text>
          <View style={styles.row}>
            <Text style={[styles.recoveryScore, { color: recoveryColor }]}>
              {recovery.score}점
            </Text>
            <View style={styles.ml}>
              <Text style={[styles.badge, { backgroundColor: recoveryColor }]}>
                {recovery.recommendation === 'hard'
                  ? '강도 훈련 OK'
                  : recovery.recommendation === 'moderate'
                  ? '적당한 운동'
                  : recovery.recommendation === 'easy'
                  ? '가벼운 조깅'
                  : '휴식 권장'}
              </Text>
              {recovery.reasons[0] && (
                <Text style={styles.recoveryReason}>{recovery.reasons[0]}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Weekly Stats */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>이번 주 요약</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats ? formatDistance(stats.totalDistanceMeters) : '--'}
            </Text>
            <Text style={styles.statLabel}>총 거리</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.totalRuns ?? 0}회</Text>
            <Text style={styles.statLabel}>런 횟수</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats?.avgPaceSecPerKm ? formatPace(stats.avgPaceSecPerKm) : '--'}
            </Text>
            <Text style={styles.statLabel}>평균 페이스</Text>
          </View>
        </View>
      </View>

      {/* Recent Route Art Card */}
      {latestRouteArt && (
        <TouchableOpacity
          style={styles.routeArtCard}
          onPress={() => router.push(`/route-art/${latestRouteArt.id}` as any)}
          activeOpacity={0.85}
        >
          <View style={styles.routeArtCardHeader}>
            <Text style={styles.cardLabel}>최근 라우트 아트</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </View>
          <Image
            source={{ uri: latestRouteArt.routeArtUrl! }}
            style={styles.routeArtImage}
            resizeMode="cover"
          />
          <Text style={styles.routeArtMeta}>
            {formatDistance(latestRouteArt.distanceMeters)} ·{' '}
            {new Date(latestRouteArt.startedAt).toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </TouchableOpacity>
      )}

      {/* AI Insights Banner */}
      {unreadInsights > 0 && (
        <TouchableOpacity style={styles.insightBanner} onPress={() => router.push('/(tabs)/coach')}>
          <Ionicons name="flash" size={20} color="#facc15" style={{ marginRight: 12 }} />
          <View>
            <Text style={styles.insightBannerTitle}>새 코칭 인사이트 {unreadInsights}개</Text>
            <Text style={styles.insightBannerSub}>AI 코치 탭에서 확인하세요</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Action */}
      <TouchableOpacity style={styles.startRunButton} onPress={() => router.navigate('/(tabs)/run')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="walk" size={22} color="#fff" />
          <Text style={styles.startRunButtonText}>런 시작하기</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 26, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 24 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  ml: { marginLeft: 16, flex: 1 },
  recoveryScore: { fontSize: 42, fontWeight: '800' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
    marginBottom: 4,
  },
  recoveryReason: { fontSize: 13, color: '#94a3b8' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#f8fafc' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  routeArtCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  routeArtCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeArtImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  routeArtMeta: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 10,
  },
  insightBanner: {
    backgroundColor: '#1e3a5f',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  insightBannerTitle: { color: '#93c5fd', fontWeight: '700', fontSize: 15 },
  insightBannerSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  startRunButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  startRunButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
