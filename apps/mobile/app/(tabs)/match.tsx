import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
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
          <Text style={styles.avatarText}>{suggestion.user.displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{suggestion.user.displayName}</Text>
          <Text style={styles.cardSub}>{suggestion.user.city ?? '위치 비공개'} · {suggestion.user.experienceLevel}</Text>
        </View>
        <View style={[styles.matchBadge, { backgroundColor: overallPct >= 80 ? '#166534' : '#1e3a5f' }]}>
          <Text style={[styles.matchPct, { color: overallPct >= 80 ? '#4ade80' : '#93c5fd' }]}>{overallPct}%</Text>
        </View>
      </View>
      <View style={styles.runStats}>
        <Text style={styles.statChip}>{formatPace(suggestion.matchProfile.avgPaceSecPerKm)}/km</Text>
        <Text style={styles.statChip}>📅 {suggestion.matchProfile.avgWeeklyKm.toFixed(0)}km/주</Text>
        <Text style={styles.statChip}>
          {suggestion.matchProfile.preferredRunTime === 'morning' ? '🌅 아침' :
           suggestion.matchProfile.preferredRunTime === 'evening' ? '🌆 저녁' : '⏰ 유연'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.matchBtn, sendRequest.isPending && styles.matchBtnDisabled]}
        onPress={() => sendRequest.mutate()}
        disabled={sendRequest.isPending || sendRequest.isSuccess}
      >
        <Text style={styles.matchBtnText}>
          {sendRequest.isPending ? '요청 중...' : sendRequest.isSuccess ? '요청 전송됨 ✓' : '러닝메이트 요청'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function RequestsTab() {
  const qc = useQueryClient()
  const { data: requests, isLoading } = useQuery({
    queryKey: ['match', 'requests'],
    queryFn: async () => {
      const { data } = await api.get<any[]>('/match/requests')
      return data
    },
  })
  const respond = useMutation({
    mutationFn: ({ matchId, status }: { matchId: string; status: 'accepted' | 'declined' }) =>
      api.patch(`/match/${matchId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match', 'requests'] })
      qc.invalidateQueries({ queryKey: ['match', 'active'] })
    },
  })

  if (isLoading) return <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />

  if (!requests?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>받은 매칭 요청이 없어요</Text>
      </View>
    )
  }

  return (
    <>
      {requests.map((r: any) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{r.requester?.displayName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{r.requester?.displayName ?? '러너'}</Text>
              <Text style={styles.cardSub}>러닝메이트 요청을 보냈어요</Text>
            </View>
          </View>
          <View style={styles.respondRow}>
            <TouchableOpacity
              style={[styles.respondBtn, styles.declineBtn]}
              onPress={() => respond.mutate({ matchId: r.id, status: 'declined' })}
            >
              <Text style={styles.declineBtnText}>거절</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.respondBtn, styles.acceptBtn]}
              onPress={() => respond.mutate({ matchId: r.id, status: 'accepted' })}
            >
              <Text style={styles.acceptBtnText}>수락 ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  )
}

function ActiveMatchesTab() {
  const router = useRouter()
  const { data: matches, isLoading } = useQuery({
    queryKey: ['match', 'active'],
    queryFn: async () => {
      const { data } = await api.get<any[]>('/match/active')
      return data
    },
  })

  if (isLoading) return <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />

  if (!matches?.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="people" size={64} color="#334155" />
        <Text style={styles.emptyText}>아직 활성 매칭이 없어요{'\n'}추천 탭에서 러닝메이트를 찾아보세요</Text>
      </View>
    )
  }

  return (
    <>
      {matches.map((m: any) => {
        const partner = m.requester ?? m.matchedUser
        return (
          <View key={m.id} style={[styles.card, styles.activeCard]}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, styles.activeAvatar]}>
                <Text style={styles.avatarText}>{partner?.displayName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{partner?.displayName ?? '러너'}</Text>
                <Text style={[styles.cardSub, { color: '#4ade80' }]}>✓ 매칭 완료</Text>
              </View>
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => router.push(`/chat/${m.id}` as any)}
              >
                <Text style={styles.chatBtnText}>채팅</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      })}
    </>
  )
}

export default function MatchScreen() {
  const [tab, setTab] = useState<'suggestions' | 'requests' | 'active'>('suggestions')
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

      <View style={styles.tabs}>
        {(['suggestions', 'requests', 'active'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === 'suggestions' ? '추천' : t === 'requests' ? '받은 요청' : '활성 매칭'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'suggestions' && (
        isLoading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
        ) : suggestions?.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>아직 런 기록이 없어요. 런을 완료하면 매칭이 시작돼요!</Text>
          </View>
        ) : (
          suggestions?.map((s) => <SuggestionCard key={s.user.id} suggestion={s} />)
        )
      )}

      {tab === 'requests' && <RequestsTab />}
      {tab === 'active' && <ActiveMatchesTab />}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: '800', color: '#f8fafc', marginBottom: 16 },
  tabs: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#3b82f6' },
  tabBtnText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  tabBtnTextActive: { color: '#fff' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  activeCard: { borderWidth: 1, borderColor: '#166534' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activeAvatar: { backgroundColor: '#166534' },
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
  respondRow: { flexDirection: 'row', gap: 12 },
  respondBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  declineBtn: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  acceptBtn: { backgroundColor: '#166534' },
  declineBtnText: { color: '#94a3b8', fontWeight: '700', fontSize: 14 },
  acceptBtnText: { color: '#4ade80', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  chatBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
})
