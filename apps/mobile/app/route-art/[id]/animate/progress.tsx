import { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAnimateStatus } from '../../../../hooks/useRuns'

function getStepMessage(step: string | null): string {
  switch (step) {
    case 'generating_background':
      return '배경 생성 중...'
    case 'rendering_frames':
      return '프레임 렌더링 중...'
    case 'encoding_gif':
      return '애니메이션 생성 중...'
    default:
      return '생성 중...'
  }
}

export default function AnimateProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const { data: statusData, isError } = useAnimateStatus(id ?? null, true)

  useEffect(() => {
    if (statusData?.status === 'completed') {
      router.replace(`/route-art/${id}/animate/result` as any)
    }
  }, [statusData?.status, id, router])

  function handleCancel() {
    router.replace(`/route-art/${id}` as any)
  }

  function handleRetry() {
    router.replace(`/route-art/${id}/animate` as any)
  }

  const isFailed = statusData?.status === 'failed' || isError

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
        <Text style={styles.headerTitle}>애니메이션 만들기</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.centerContent}>
        {isFailed ? (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle-outline" size={72} color="#ef4444" />
            </View>
            <Text style={styles.statusTitle}>생성 실패</Text>
            <Text style={styles.statusSubtitle}>
              애니메이션 생성 중 오류가 발생했습니다.{'\n'}다시 시도해주세요.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
              <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLinkBtn} onPress={handleCancel} activeOpacity={0.7}>
              <Text style={styles.cancelLinkText}>라우트 아트로 돌아가기</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.iconContainer}>
              <Text style={styles.runnerEmoji}>🏃</Text>
            </View>
            <ActivityIndicator size="large" color="#3b82f6" style={styles.indicator} />
            <Text style={styles.statusTitle}>
              {getStepMessage(statusData?.step ?? null)}
            </Text>
            <Text style={styles.statusSubtitle}>
              잠시만 기다려주세요.{'\n'}애니메이션을 열심히 만들고 있어요!
            </Text>
            <View style={styles.stepIndicators}>
              <StepDot
                label="배경 생성"
                active={statusData?.step === 'generating_background'}
                done={
                  statusData?.step === 'rendering_frames' ||
                  statusData?.step === 'encoding_gif'
                }
              />
              <View style={styles.stepLine} />
              <StepDot
                label="프레임 렌더링"
                active={statusData?.step === 'rendering_frames'}
                done={statusData?.step === 'encoding_gif'}
              />
              <View style={styles.stepLine} />
              <StepDot
                label="GIF 생성"
                active={statusData?.step === 'encoding_gif'}
                done={false}
              />
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

function StepDot({
  label,
  active,
  done,
}: {
  label: string
  active: boolean
  done: boolean
}) {
  return (
    <View style={stepStyles.container}>
      <View
        style={[
          stepStyles.dot,
          active && stepStyles.dotActive,
          done && stepStyles.dotDone,
        ]}
      >
        {done && <Ionicons name="checkmark" size={12} color="#fff" />}
        {active && !done && <View style={stepStyles.dotInner} />}
      </View>
      <Text style={[stepStyles.label, (active || done) && stepStyles.labelActive]}>
        {label}
      </Text>
    </View>
  )
}

const stepStyles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: '#3b82f6' },
  dotDone: { backgroundColor: '#22c55e' },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  label: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  labelActive: { color: '#94a3b8' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: { width: 36 },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  iconContainer: {
    marginBottom: 8,
  },
  runnerEmoji: {
    fontSize: 72,
  },
  indicator: {
    marginVertical: 8,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  stepIndicators: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0,
    marginTop: 8,
    marginBottom: 8,
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: '#334155',
    marginTop: 11,
    marginHorizontal: 4,
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelLinkBtn: {
    paddingVertical: 10,
  },
  cancelLinkText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
})
