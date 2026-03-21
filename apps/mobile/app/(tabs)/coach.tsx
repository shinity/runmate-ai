import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useCoachingPlans, useCoachingInsights, useMarkInsightRead } from '../../hooks/useCoaching'
import type { CoachingInsight } from '@runmate/types'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#22c55e',
}

const TYPE_ICONS: Record<string, string> = {
  recovery_advice: '🛌',
  performance_analysis: '📊',
  habit_pattern: '📅',
  injury_risk_alert: '⚠️',
  motivation: '🔥',
  plan_adjustment: '🔄',
}

function InsightCard({ insight }: { insight: CoachingInsight }) {
  const markRead = useMarkInsightRead()
  const priorityColor = PRIORITY_COLORS[insight.priority] ?? '#3b82f6'
  const icon = TYPE_ICONS[insight.type] ?? '💡'

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
        <Text style={styles.insightIcon}>{icon}</Text>
        <View style={styles.insightMeta}>
          <Text style={[styles.insightPriority, { color: priorityColor }]}>
            {insight.priority.toUpperCase()}
          </Text>
          {!insight.readAt && <View style={styles.unreadDot} />}
        </View>
      </View>
      <Text style={styles.insightContent}>{insight.content}</Text>
      {insight.actionItems?.length > 0 && (
        <View style={styles.actionItems}>
          {(insight.actionItems as string[]).map((item, i) => (
            <Text key={i} style={styles.actionItem}>• {item}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function CoachScreen() {
  const { data: insights, isLoading: insightsLoading } = useCoachingInsights()
  const { data: plans, isLoading: plansLoading } = useCoachingPlans()

  const activePlan = plans?.find((p) => p.status === 'active')

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>AI 코치</Text>

      {/* Active plan */}
      {activePlan ? (
        <View style={styles.planCard}>
          <Text style={styles.planLabel}>진행 중인 훈련 계획</Text>
          <Text style={styles.planTitle}>{activePlan.title}</Text>
          <Text style={styles.planGoal}>{activePlan.goal}</Text>
          <View style={styles.planProgress}>
            <View style={[styles.progressBar, { width: `${activePlan.adherenceScore}%` }]} />
          </View>
          <Text style={styles.progressText}>달성도 {Math.round(activePlan.adherenceScore)}%</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.generatePlanBtn}>
          <Text style={styles.generatePlanIcon}>🎯</Text>
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
  generatePlanIcon: { fontSize: 32, marginRight: 12 },
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
  insightIcon: { fontSize: 20 },
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
