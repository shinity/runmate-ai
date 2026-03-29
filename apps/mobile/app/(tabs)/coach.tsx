import { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCoachingPlans, useCoachingInsights, useMarkInsightRead, useGeneratePlan } from '../../hooks/useCoaching'
import type { CoachingInsight, CoachingPlan } from '@runmate/types'
import { useToast } from '../../components/Toast'
import { getErrorMessage } from '../../lib/feedback'

const SESSION_TYPE_LABELS: Record<string, string> = {
  easy: '🟢 Easy',
  tempo: '🟡 Tempo',
  interval: '🔴 인터벌',
  long_run: '🔵 Long Run',
  recovery: '⚪ 회복',
  cross_train: '🟣 크로스 트레이닝',
  rest: '💤 휴식',
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function PlanDetailModal({ plan, onClose }: { plan: CoachingPlan; onClose: () => void }) {
  const weeks = plan.weeks ?? []

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={detailStyles.container}>
        <View style={detailStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={detailStyles.title}>{plan.title}</Text>
            <Text style={detailStyles.goal}>{plan.goal}</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text style={detailStyles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={detailStyles.progress}>
          <View style={[detailStyles.progressBar, { width: `${plan.adherenceScore}%` }]} />
        </View>
        <Text style={detailStyles.progressText}>달성도 {Math.round(plan.adherenceScore)}%</Text>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {weeks.length === 0 ? (
            <Text style={detailStyles.empty}>세션 데이터가 없습니다.</Text>
          ) : (
            weeks.map((week: any) => (
              <View key={week.weekNumber} style={detailStyles.weekCard}>
                <View style={detailStyles.weekHeader}>
                  <Text style={detailStyles.weekTitle}>{week.weekNumber}주차</Text>
                  <Text style={detailStyles.weekTheme}>{week.theme}</Text>
                  <Text style={detailStyles.weekKm}>{week.targetDistanceKm}km</Text>
                </View>
                {(week.sessions ?? []).map((session: any, i: number) => (
                  <View key={i} style={detailStyles.session}>
                    <Text style={detailStyles.sessionDay}>{DAY_LABELS[session.dayOfWeek]}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={detailStyles.sessionType}>
                        {SESSION_TYPE_LABELS[session.sessionType] ?? session.sessionType}
                      </Text>
                      <Text style={detailStyles.sessionDesc}>{session.description}</Text>
                    </View>
                    <Text style={detailStyles.sessionKm}>
                      {session.targetDistanceKm ? `${session.targetDistanceKm}km` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#22c55e',
}

const TYPE_ICONS: Record<string, string> = {
  recovery_advice: 'bulb',
  performance_analysis: 'bar-chart',
  habit_pattern: 'leaf',
  injury_risk_alert: 'warning',
  motivation: 'flame',
  plan_adjustment: 'calendar',
}

function InsightCard({ insight }: { insight: CoachingInsight }) {
  const markRead = useMarkInsightRead()
  const priorityColor = PRIORITY_COLORS[insight.priority] ?? '#3b82f6'
  const icon = TYPE_ICONS[insight.type] ?? 'bulb'

  return (
    <TouchableOpacity
      style={[
        styles.insightCard,
        !insight.readAt && styles.insightCardUnread,
        { borderLeftColor: priorityColor },
      ]}
      onPress={() => !insight.readAt && markRead.mutate(insight.id)}
    >
      <View style={styles.insightHeader}>
        <Ionicons name={icon as any} size={20} color="#3b82f6" />
        <View style={styles.insightMeta}>
          <Text style={[styles.insightPriority, { color: priorityColor }]}>
            {insight.priority.toUpperCase()}
          </Text>
          {!insight.readAt && <View style={styles.unreadDot} />}
        </View>
      </View>
      <Text style={styles.insightContent}>{insight.content}</Text>
      {(insight.actionItems?.length ?? 0) > 0 && (
        <View style={styles.actionItems}>
          {(insight.actionItems ?? []).map((item, i) => (
            <Text key={i} style={styles.actionItem}>• {item}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

function GeneratePlanModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [goal, setGoal] = useState('')
  const [weeks, setWeeks] = useState('8')
  const [days, setDays] = useState('4')
  const generatePlan = useGeneratePlan()
  const { showToast } = useToast()

  const GOAL_OPTIONS = [
    { label: '5km 완주', value: '5km 완주를 목표로 달리기 시작하기' },
    { label: '10km 도전', value: '10km 레이스 완주하기' },
    { label: '하프 마라톤', value: '하프 마라톤 완주하기' },
    { label: '체력 향상', value: '전반적인 러닝 체력과 지구력 향상' },
  ]

  async function handleGenerate() {
    if (!goal) {
      Alert.alert('목표 선택', '훈련 목표를 선택해주세요.')
      return
    }
    const weeksNum = parseInt(weeks, 10)
    const daysNum = parseInt(days, 10)
    if (isNaN(weeksNum) || weeksNum < 4 || weeksNum > 52) {
      Alert.alert('입력 오류', '훈련 기간은 4~52주 사이로 입력해주세요.')
      return
    }
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 7) {
      Alert.alert('입력 오류', '주당 훈련 일수는 1~7일 사이로 입력해주세요.')
      return
    }
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + weeksNum * 7)

    try {
      await generatePlan.mutateAsync({
        goal,
        targetDate: targetDate.toISOString(),
        availableDaysPerWeek: Array.from({ length: daysNum }, (_, i) => i + 1),
        currentFitnessLevel: 'moderate',
      })
      onClose()
      showToast('success', 'AI가 훈련 계획을 생성했습니다!')
    } catch (e: any) {
      showToast('error', getErrorMessage(e))
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>훈련 계획 생성</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={modalStyles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={modalStyles.label}>훈련 목표</Text>
        <View style={modalStyles.goalGrid}>
          {GOAL_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[modalStyles.goalChip, goal === opt.value && modalStyles.goalChipActive]}
              onPress={() => setGoal(opt.value)}
            >
              <Text style={[modalStyles.goalChipText, goal === opt.value && modalStyles.goalChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={modalStyles.label}>훈련 기간 (주)</Text>
        <TextInput
          style={modalStyles.input}
          value={weeks}
          onChangeText={setWeeks}
          keyboardType="number-pad"
          placeholderTextColor="#475569"
        />

        <Text style={modalStyles.label}>주당 훈련 일수</Text>
        <TextInput
          style={modalStyles.input}
          value={days}
          onChangeText={setDays}
          keyboardType="number-pad"
          placeholderTextColor="#475569"
        />

        <TouchableOpacity
          style={[modalStyles.btn, generatePlan.isPending && modalStyles.btnDisabled]}
          onPress={handleGenerate}
          disabled={generatePlan.isPending}
        >
          {generatePlan.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={modalStyles.btnText}>🤖 AI 계획 생성하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

export default function CoachScreen() {
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const { data: insights, isLoading: insightsLoading } = useCoachingInsights()
  const { data: plans, isLoading: plansLoading } = useCoachingPlans()

  const activePlan = plans?.find((p) => p.status === 'active')

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GeneratePlanModal visible={showModal} onClose={() => setShowModal(false)} />
      {activePlan && showDetail && (
        <PlanDetailModal plan={activePlan} onClose={() => setShowDetail(false)} />
      )}
      <Text style={styles.heading}>AI 코치</Text>

      {/* Active plan */}
      {plansLoading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginBottom: 20 }} />
      ) : activePlan ? (
        <TouchableOpacity style={styles.planCard} onPress={() => setShowDetail(true)}>
          <Text style={styles.planLabel}>진행 중인 훈련 계획 · 탭하여 상세 보기</Text>
          <Text style={styles.planTitle}>{activePlan.title}</Text>
          <Text style={styles.planGoal}>{activePlan.goal}</Text>
          <View style={styles.planProgress}>
            <View style={[styles.progressBar, { width: `${activePlan.adherenceScore}%` }]} />
          </View>
          <Text style={styles.progressText}>달성도 {Math.round(activePlan.adherenceScore)}%</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.generatePlanBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="flag" size={48} color="#3b82f6" style={{ marginRight: 12 }} />
          <View>
            <Text style={styles.generatePlanTitle}>훈련 계획 생성하기</Text>
            <Text style={styles.generatePlanSub}>AI가 맞춤 훈련 계획을 만들어드려요</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Insights feed */}
      <Text style={styles.sectionTitle}>코칭 인사이트</Text>

      {insightsLoading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 24 }} />
      ) : insights?.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🤖</Text>
          <Text style={styles.emptyText}>런을 완료하면 AI 코치가 분석을 보내드려요</Text>
        </View>
      ) : (
        insights?.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: '800', color: '#f8fafc', marginBottom: 20 },
  planCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 20 },
  planLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  planTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  planGoal: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  planProgress: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressBar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#64748b' },
  generatePlanBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  generatePlanTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 16 },
  generatePlanSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  insightCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  insightCardUnread: { backgroundColor: '#1e2d45' },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  insightMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightPriority: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
  insightContent: { color: '#cbd5e1', fontSize: 14, lineHeight: 22 },
  actionItems: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  actionItem: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 15, textAlign: 'center' },
})

const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, marginTop: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
  goal: { fontSize: 13, color: '#64748b', marginTop: 2 },
  close: { color: '#64748b', fontSize: 24, padding: 4 },
  progress: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressBar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#64748b', marginBottom: 20 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 15 },
  weekCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  weekTitle: { color: '#f8fafc', fontWeight: '800', fontSize: 15 },
  weekTheme: { flex: 1, color: '#64748b', fontSize: 13 },
  weekKm: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
  session: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#334155', gap: 12 },
  sessionDay: { color: '#94a3b8', fontWeight: '700', width: 20, fontSize: 13 },
  sessionType: { color: '#e2e8f0', fontWeight: '600', fontSize: 13 },
  sessionDesc: { color: '#64748b', fontSize: 12, marginTop: 2 },
  sessionKm: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
})

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
  close: { color: '#64748b', fontSize: 24, padding: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, marginTop: 16 },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  goalChipActive: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  goalChipText: { color: '#94a3b8', fontSize: 14 },
  goalChipTextActive: { color: '#93c5fd', fontWeight: '600' },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
