import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatPace } from '../../lib/format'
import type { MatchSuggestion } from '@runmate/types'

function SuggestionCard({ suggestion }: { suggestion: MatchSuggestion }) {
  const qc = useQueryClient()
  const sendRequest = useMutation({
    mutationFn: () => api.post(`/match/request/${suggestion.user.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['match', 'suggestions'] }),
  })

  const overallPct = Math.round(suggestion.compatibility.overall * 100)

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {suggestion.user.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{suggestion.user.displayName}</Text>
          <Text style={styles.cardSub}>
            {suggestion.user.city ?? '위치 비공개'} · {suggestion.user.experienceLevel}
          </Text>
        </View>
        <View style={[styles.matchBadge, { backgroundColor: overallPct >= 80 ? '#166534' : '#1e3a5f' }]}>
          <Text style={[styles.matchPct, { color: overallPct >= 80 ? '#4ade80' : '#93c5fd' }]}>
            {overallPct}%
          </Text>
        </View>
      </View>

      <View style={styles.runStats}>
        <Text style={styles.statChip}>
          🏃 {formatPace(suggestion.matchProfile.avgPaceSecPerKm)}/km
        </Text>
        <Text style={styles.statChip}>
          📅 {suggestion.matchProfile.avgWeeklyKm.toFixed(0)}km/주
        </Text>
        <Text style={styles.statChip}>
          {suggestion.matchProfile.preferredRunTime === 'morning' ? '🌅 아침' :
           suggestion.matchProfile.preferredRunTime === 'evening' ? '🌆 저녁' : '⏰ 유연'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.matchBtn, sendRequest.isPending && styles.matchBtnDisabled]}
        onPress={() => sendRequest.mutate()}
        disabled={sendRequest.isPending}
      >
        <Text style={styles.matchBtnText}>
          {sendRequest.isPending ? '요청 중...' : sendRequest.isSuccess ? '요청 전송됨 ✓' : '러닝메이트 요청'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default function MatchScreen() {
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['match', 'suggestions'],
    queryFn: async () => {
      const { data } = await api.get<MatchSuggestion[]>('/match/suggestions')
      return data
    },
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>러닝메이트 찾기</Text>
      <Text style={styles.subheading}>비슷한 페이스와 스타일의 러너를 매칭해드려요</Text>

      {isLoading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
      ) : suggestions?.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>아직 런 기록이 없어요. 런을 완료하면 매칭이 시작돼요!</Text>
        </View>
      ) : (
        suggestions?.map((s) => (
          <SuggestionCard key={s.user.id} suggestion={s} />
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: '800', color: '#f8fafc', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { color: '#f8fafc', fontWeight: '700', fontSize: 16 },
  cardSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  matchBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  matchPct: { fontWeight: '800', fontSize: 15 },
  runStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statChip: { backgroundColor: '#334155', color: '#94a3b8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 13 },
  matchBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 12, alignItems: 'center' },
  matchBtnDisabled: { opacity: 0.6 },
  matchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 15, textAlign: 'center', lineHeight: 22 },
})
