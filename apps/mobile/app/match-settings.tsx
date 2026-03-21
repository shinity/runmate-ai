import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Switch,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

const STYLE_OPTIONS = [
  { value: 'social', label: '소셜', desc: '대화하며 달려요' },
  { value: 'competitive', label: '경쟁적', desc: '기록을 중시해요' },
  { value: 'meditative', label: '명상적', desc: '조용히 달려요' },
  { value: 'mixed', label: '혼합', desc: '상황에 따라 달라요' },
]

const LOOKING_FOR_OPTIONS = [
  { value: 'running_partner', label: '1:1 러닝 파트너' },
  { value: 'group', label: '그룹 런' },
  { value: 'solo_accountability', label: '서로 동기부여' },
  { value: 'any', label: '모두 좋아요' },
]

export default function MatchSettingsScreen() {
  const router = useRouter()
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['match', 'profile'],
    queryFn: async () => {
      const { data } = await api.get('/match/profile')
      return data
    },
  })

  const [runningStyle, setRunningStyle] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [matchingEnabled, setMatchingEnabled] = useState(true)

  useEffect(() => {
    if (!profile) return
    const p = profile as any
    setRunningStyle(p.runningStyle ?? '')
    setLookingFor(p.lookingFor ?? '')
    setMatchingEnabled(p.matchingEnabled ?? true)
  }, [profile])

  const updateProfile = useMutation({
    mutationFn: (data: any) => api.patch('/match/profile', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match'] })
      router.back()
    },
    onError: (e: any) => Alert.alert('저장 실패', e.message ?? '저장에 실패했습니다.'),
  })

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '매칭 설정', presentation: 'modal' }} />
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>매칭 활성화</Text>
          <Text style={styles.switchDesc}>비활성화 시 추천 목록에 노출되지 않아요</Text>
        </View>
        <Switch
          value={matchingEnabled}
          onValueChange={setMatchingEnabled}
          trackColor={{ true: '#3b82f6', false: '#334155' }}
          thumbColor="#fff"
        />
      </View>

      <Text style={styles.label}>러닝 스타일</Text>
      {STYLE_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.optionCard, runningStyle === opt.value && styles.optionCardActive]}
          onPress={() => setRunningStyle(opt.value)}
        >
          <Text style={[styles.optionLabel, runningStyle === opt.value && styles.optionLabelActive]}>
            {opt.label}
          </Text>
          <Text style={styles.optionDesc}>{opt.desc}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>찾고 있는 것</Text>
      <View style={styles.chipRow}>
        {LOOKING_FOR_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, lookingFor === opt.value && styles.chipActive]}
            onPress={() => setLookingFor(opt.value)}
          >
            <Text style={[styles.chipText, lookingFor === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, updateProfile.isPending && styles.btnDisabled]}
        onPress={() => updateProfile.mutate({ runningStyle, lookingFor })}
        disabled={updateProfile.isPending}
      >
        {updateProfile.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>저장</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, paddingBottom: 48 },
  loading: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24 },
  switchLabel: { color: '#f8fafc', fontWeight: '700', fontSize: 15 },
  switchDesc: { color: '#64748b', fontSize: 12, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 10, marginTop: 8 },
  optionCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  optionCardActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  optionLabel: { color: '#e2e8f0', fontWeight: '700', fontSize: 14 },
  optionLabelActive: { color: '#93c5fd' },
  optionDesc: { color: '#64748b', fontSize: 12, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 14 },
  chipTextActive: { color: '#93c5fd', fontWeight: '600' },
  btn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
