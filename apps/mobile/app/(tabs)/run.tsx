import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { useRunStore } from '../../stores/run'
import { useCreateRun, useRuns } from '../../hooks/useRuns'
import { formatPace, formatDistance, formatDuration } from '../../lib/format'
import RunDetailModal from '../../components/RunDetailModal'

interface RunSummary {
  startedAt: string
  endedAt: string
  durationSeconds: number
  distanceMeters: number
  avgPaceSecPerKm: number
  datapoints: Array<{
    lat: number; lng: number; altitudeM: number | null
    timestamp: string; paceSecPerKm: number | null
  }>
}

export default function RunScreen() {
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [effortScore, setEffortScore] = useState(5)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const locationSubRef = useRef<Location.LocationSubscription | null>(null)

  const {
    isRunning, isPaused, elapsedSeconds, distanceMeters,
    currentPaceSecPerKm, avgPaceSecPerKm,
    startRun, pauseRun, resumeRun, stopRun, addDatapoint, tick,
  } = useRunStore()

  const createRun = useCreateRun()
  const { data: runs } = useRuns()

  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(tick, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning, isPaused])

  async function handleStart() {
    try {
      await startRun()
      setTab('active')
      locationSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
        (loc) => {
          addDatapoint({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            altitudeM: loc.coords.altitude,
            timestamp: new Date(loc.timestamp).toISOString(),
            paceSecPerKm: loc.coords.speed && loc.coords.speed > 0.5 && loc.coords.speed < 12
              ? Math.round(1000 / loc.coords.speed)
              : null,
          })
        },
      )
    } catch (e: any) {
      Alert.alert('위치 권한 필요', e.message)
    }
  }

  function handleStop() {
    locationSubRef.current?.remove()

    const finalDistance = distanceMeters
    const finalDuration = elapsedSeconds
    const finalPace = avgPaceSecPerKm ?? 360
    const endedAt = new Date().toISOString()
    const startedAt = new Date(Date.now() - elapsedSeconds * 1000).toISOString()
    const datapoints = stopRun()

    if (finalDistance < 100) {
      setTab('history')
      return
    }

    setSummary({ startedAt, endedAt, durationSeconds: finalDuration, distanceMeters: finalDistance, avgPaceSecPerKm: finalPace, datapoints })
    setEffortScore(5)
  }

  async function handleSaveSummary() {
    if (!summary) return
    try {
      await createRun.mutateAsync({
        startedAt: summary.startedAt,
        endedAt: summary.endedAt,
        durationSeconds: summary.durationSeconds,
        distanceMeters: summary.distanceMeters,
        elevationGainMeters: 0,
        elevationLossMeters: 0,
        avgPaceSecPerKm: summary.avgPaceSecPerKm,
        effortScore,
        dataSource: 'app_native',
        datapoints: summary.datapoints.map((d) => ({
          timestamp: d.timestamp,
          lat: d.lat,
          lng: d.lng,
          altitudeM: d.altitudeM,
          paceSecPerKm: d.paceSecPerKm,
          heartRate: null,
          cadenceSpm: null,
          powerWatts: null,
        })),
      })
      setSummary(null)
      setTab('history')
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? '런 저장에 실패했습니다.')
    }
  }

  // Run summary screen
  if (summary) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.summaryContent}>
        <Text style={styles.summaryTitle}>런 완료!</Text>
        <Ionicons name="trophy" size={64} color="#facc15" style={{ textAlign: 'center', marginVertical: 16 }} />

        <View style={styles.summaryMetrics}>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricValue}>{formatDistance(summary.distanceMeters)}</Text>
            <Text style={styles.summaryMetricLabel}>거리</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricValue}>{formatDuration(summary.durationSeconds)}</Text>
            <Text style={styles.summaryMetricLabel}>시간</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricValue}>{formatPace(summary.avgPaceSecPerKm)}</Text>
            <Text style={styles.summaryMetricLabel}>평균 페이스</Text>
          </View>
        </View>

        <View style={styles.effortSection}>
          <Text style={styles.effortLabel}>운동 강도 (1~10)</Text>
          <Text style={styles.effortValue}>{effortScore}</Text>
          <View style={styles.effortRow}>
            {[1,2,3,4,5,6,7,8,9,10].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.effortBtn, effortScore === v && styles.effortBtnActive]}
                onPress={() => setEffortScore(v)}
              >
                <Text style={[styles.effortBtnText, effortScore === v && styles.effortBtnTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.effortHints}>
            <Text style={styles.effortHint}>매우 쉬움</Text>
            <Text style={styles.effortHint}>최대 강도</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveSummaryBtn, createRun.isPending && styles.btnDisabledOpacity]}
          onPress={handleSaveSummary}
          disabled={createRun.isPending}
        >
          {createRun.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveSummaryBtnText}>저장하기 💾</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.discardBtn}
          onPress={() =>
            Alert.alert('기록 삭제', '이 런 기록을 저장하지 않을까요?', [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive', onPress: () => { setSummary(null); setTab('active') } },
            ])
          }
        >
          <Text style={styles.discardBtnText}>저장 안 함</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'active' && styles.tabActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>활성 런</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>기록</Text>
        </TouchableOpacity>
      </View>

      {tab === 'active' ? (
        <View style={styles.activeRun}>
          <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{formatDistance(distanceMeters)}</Text>
              <Text style={styles.metricLabel}>거리</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {avgPaceSecPerKm ? formatPace(avgPaceSecPerKm) : '--:--'}
              </Text>
              <Text style={styles.metricLabel}>평균 페이스</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {currentPaceSecPerKm ? formatPace(currentPaceSecPerKm) : '--:--'}
              </Text>
              <Text style={styles.metricLabel}>현재 페이스</Text>
            </View>
          </View>

          {!isRunning ? (
            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Text style={styles.startBtnText}>시작</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.controls}>
              <TouchableOpacity style={styles.pauseBtn} onPress={isPaused ? resumeRun : pauseRun}>
                <Text style={styles.pauseBtnText}>{isPaused ? '▶ 재개' : '⏸ 일시정지'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                <Text style={styles.stopBtnText}>⏹ 완료</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={runs ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="walk" size={64} color="#334155" />
              <Text style={styles.emptyText}>아직 기록이 없어요</Text>
              <TouchableOpacity onPress={() => setTab('active')}>
                <Text style={styles.emptyAction}>활성 런 탭에서 시작하기 →</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedRunId(item.id)}
            >
              <View style={styles.runCard}>
                <View style={styles.runCardHeader}>
                  <Text style={styles.runTitle}>{item.title ?? '런'}</Text>
                  <Text style={styles.runDate}>
                    {new Date(item.startedAt).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                <View style={styles.runStats}>
                  <Text style={styles.runStat}>{formatDistance(item.distanceMeters)}</Text>
                  <Text style={styles.runStatDivider}>·</Text>
                  <Text style={styles.runStat}>{formatPace(item.avgPaceSecPerKm)}/km</Text>
                  <Text style={styles.runStatDivider}>·</Text>
                  <Text style={styles.runStat}>{formatDuration(item.durationSeconds)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {selectedRunId && (
        <RunDetailModal
          runId={selectedRunId}
          onClose={() => setSelectedRunId(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  tabs: { flexDirection: 'row', backgroundColor: '#1e293b', margin: 16, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { color: '#64748b', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  activeRun: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  timer: { fontSize: 72, fontWeight: '800', color: '#f8fafc', letterSpacing: -2 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: 32 },
  metric: { alignItems: 'center' },
  metricValue: { fontSize: 24, fontWeight: '700', color: '#f8fafc' },
  metricLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  startBtn: { backgroundColor: '#3b82f6', borderRadius: 80, width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  controls: { flexDirection: 'row', gap: 16 },
  pauseBtn: { backgroundColor: '#1e293b', borderRadius: 60, width: 120, height: 120, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3b82f6' },
  pauseBtnText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  stopBtn: { backgroundColor: '#ef4444', borderRadius: 60, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  stopBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  listContent: { padding: 16 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 16, marginBottom: 12 },
  emptyAction: { color: '#3b82f6', fontSize: 15, fontWeight: '600' },
  runCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12 },
  runCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  runTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 16 },
  runDate: { color: '#64748b', fontSize: 13 },
  runStats: { flexDirection: 'row', alignItems: 'center' },
  runStat: { color: '#94a3b8', fontSize: 14 },
  runStatDivider: { color: '#475569', marginHorizontal: 8 },
  // Summary styles
  summaryContent: { flexGrow: 1, padding: 24, paddingBottom: 48, alignItems: 'center' },
  summaryTitle: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginTop: 24 },
  summaryMetrics: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', backgroundColor: '#1e293b', borderRadius: 20, padding: 24, marginBottom: 24 },
  summaryMetric: { alignItems: 'center' },
  summaryMetricValue: { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
  summaryMetricLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  effortSection: { width: '100%', backgroundColor: '#1e293b', borderRadius: 20, padding: 20, marginBottom: 24 },
  effortLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  effortValue: { color: '#3b82f6', fontSize: 36, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  effortRow: { flexDirection: 'row', justifyContent: 'space-between' },
  effortBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  effortBtnActive: { backgroundColor: '#3b82f6' },
  effortBtnText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  effortBtnTextActive: { color: '#fff' },
  effortHints: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  effortHint: { color: '#475569', fontSize: 11 },
  saveSummaryBtn: { backgroundColor: '#3b82f6', borderRadius: 16, padding: 18, alignItems: 'center', width: '100%', marginBottom: 12 },
  saveSummaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  discardBtn: { padding: 12, alignItems: 'center' },
  discardBtnText: { color: '#475569', fontSize: 14 },
  btnDisabledOpacity: { opacity: 0.6 },
})
