import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useAuthStore } from '../../stores/auth'

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: '입문자', desc: '달리기를 막 시작했어요' },
  { value: 'intermediate', label: '중급자', desc: '꾸준히 달리고 있어요' },
  { value: 'advanced', label: '고급자', desc: '대회에 참가해요' },
  { value: 'elite', label: '엘리트', desc: '경쟁 수준으로 달려요' },
]

const GOAL_OPTIONS = [
  { value: 'fitness', label: '건강 유지', icon: '💪' },
  { value: 'five_k', label: '5km 완주', icon: '🎯' },
  { value: 'ten_k', label: '10km 완주', icon: '🏅' },
  { value: 'half_marathon', label: '하프 마라톤', icon: '🥈' },
  { value: 'marathon', label: '마라톤', icon: '🏆' },
  { value: 'ultra', label: '울트라', icon: '🦅' },
]

export default function ProfileSetupScreen() {
  const router = useRouter()
  const { updateUser, isLoading } = useAuthStore()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [experienceLevel, setExperienceLevel] = useState('')
  const [primaryGoal, setPrimaryGoal] = useState('')
  const [weeklyKm, setWeeklyKm] = useState('20')
  const [isSaving, setIsSaving] = useState(false)

  async function handleFinish() {
    const km = parseFloat(weeklyKm)
    if (isNaN(km) || km < 0 || km > 500) {
      Alert.alert('입력 오류', '주간 목표 거리를 올바르게 입력해주세요.')
      return
    }
    setIsSaving(true)
    try {
      await updateUser({ experienceLevel: experienceLevel as any, primaryGoal: primaryGoal as any, weeklyTargetKm: km })
      router.replace('/(tabs)')
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <Text style={styles.logo}>🏃</Text>
      <Text style={styles.title}>프로필 설정</Text>
      <Text style={styles.subtitle}>AI 코치가 맞춤 분석을 위해 필요해요</Text>

      {/* Progress */}
      <View style={styles.progress}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.progressDot, step >= s && styles.progressDotActive]} />
        ))}
      </View>

      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>현재 러닝 수준은?</Text>
          {EXPERIENCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, experienceLevel === opt.value && styles.optionCardActive]}
              onPress={() => setExperienceLevel(opt.value)}
            >
              <Text style={[styles.optionLabel, experienceLevel === opt.value && styles.optionLabelActive]}>
                {opt.label}
              </Text>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.btn, !experienceLevel && styles.btnDisabled]}
            onPress={() => setStep(2)}
            disabled={!experienceLevel}
          >
            <Text style={styles.btnText}>다음</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>목표가 뭔가요?</Text>
          <View style={styles.goalGrid}>
            {GOAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.goalCard, primaryGoal === opt.value && styles.optionCardActive]}
                onPress={() => setPrimaryGoal(opt.value)}
              >
                <Text style={styles.goalIcon}>{opt.icon}</Text>
                <Text style={[styles.optionLabel, primaryGoal === opt.value && styles.optionLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnBack} onPress={() => setStep(1)}>
              <Text style={styles.btnBackText}>이전</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnFlex, !primaryGoal && styles.btnDisabled]}
              onPress={() => setStep(3)}
              disabled={!primaryGoal}
            >
              <Text style={styles.btnText}>다음</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주간 목표 거리 (km)</Text>
          <Text style={styles.optionDesc}>현재 또는 목표하는 주당 달리기 거리를 입력하세요</Text>
          <TextInput
            style={styles.input}
            value={weeklyKm}
            onChangeText={setWeeklyKm}
            keyboardType="decimal-pad"
            placeholderTextColor="#475569"
          />
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnBack} onPress={() => setStep(2)}>
              <Text style={styles.btnBackText}>이전</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnFlex, isSaving && styles.btnDisabled]}
              onPress={handleFinish}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>시작하기 🚀</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { flexGrow: 1, padding: 24, paddingBottom: 48 },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8, marginTop: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#334155' },
  progressDotActive: { backgroundColor: '#3b82f6', width: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  optionCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  optionCardActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  optionLabel: { color: '#e2e8f0', fontWeight: '700', fontSize: 15 },
  optionLabelActive: { color: '#93c5fd' },
  optionDesc: { color: '#64748b', fontSize: 13, marginTop: 2 },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalCard: {
    width: '47%', backgroundColor: '#1e293b', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  goalIcon: { fontSize: 28, marginBottom: 6 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 16,
    color: '#f8fafc', fontSize: 22, fontWeight: '700', borderWidth: 1, borderColor: '#334155',
    textAlign: 'center', marginVertical: 8,
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnFlex: { flex: 1, marginTop: 0 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnBack: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center', paddingHorizontal: 20 },
  btnBackText: { color: '#94a3b8', fontWeight: '600', fontSize: 16 },
})
