import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../components/Toast'
import { getErrorMessage } from '../lib/feedback'

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: '입문자' },
  { value: 'intermediate', label: '중급자' },
  { value: 'advanced', label: '고급자' },
  { value: 'elite', label: '엘리트' },
]

const GOAL_OPTIONS = [
  { value: 'fitness', label: '건강 유지' },
  { value: 'five_k', label: '5km 완주' },
  { value: 'ten_k', label: '10km 완주' },
  { value: 'half_marathon', label: '하프 마라톤' },
  { value: 'marathon', label: '마라톤' },
  { value: 'ultra', label: '울트라' },
]

export default function ProfileEditScreen() {
  const router = useRouter()
  const { user, updateUser } = useAuthStore()
  const { showToast } = useToast()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [weeklyKm, setWeeklyKm] = useState(String(user?.weeklyTargetKm ?? '20'))
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel ?? '')
  const [primaryGoal, setPrimaryGoal] = useState(user?.primaryGoal ?? '')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!displayName.trim()) {
      Alert.alert('입력 오류', '닉네임을 입력해주세요.')
      return
    }
    const km = parseFloat(weeklyKm)
    if (isNaN(km) || km < 0) {
      Alert.alert('입력 오류', '주간 목표 거리를 올바르게 입력해주세요.')
      return
    }
    setIsSaving(true)
    try {
      await updateUser({
        displayName: displayName.trim(),
        city: city.trim() || undefined,
        weeklyTargetKm: km,
        experienceLevel: experienceLevel as any || undefined,
        primaryGoal: primaryGoal as any || undefined,
      })
      router.back()
    } catch (e: any) {
      showToast('error', getErrorMessage(e))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: '프로필 수정', presentation: 'modal' }} />
      <Text style={styles.label}>닉네임</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="닉네임"
        placeholderTextColor="#475569"
      />

      <Text style={styles.label}>도시</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="예: 서울"
        placeholderTextColor="#475569"
      />

      <Text style={styles.label}>주간 목표 거리 (km)</Text>
      <TextInput
        style={styles.input}
        value={weeklyKm}
        onChangeText={setWeeklyKm}
        keyboardType="decimal-pad"
        placeholderTextColor="#475569"
      />

      <Text style={styles.label}>러닝 수준</Text>
      <View style={styles.chipRow}>
        {EXPERIENCE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, experienceLevel === opt.value && styles.chipActive]}
            onPress={() => setExperienceLevel(opt.value)}
          >
            <Text style={[styles.chipText, experienceLevel === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>목표</Text>
      <View style={styles.chipRow}>
        {GOAL_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, primaryGoal === opt.value && styles.chipActive]}
            onPress={() => setPrimaryGoal(opt.value)}
          >
            <Text style={[styles.chipText, primaryGoal === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, isSaving && styles.btnDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>저장</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    color: '#f8fafc', fontSize: 15, borderWidth: 1, borderColor: '#334155',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 14 },
  chipTextActive: { color: '#93c5fd', fontWeight: '600' },
  btn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
