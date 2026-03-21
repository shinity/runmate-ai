import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native'
import * as Location from 'expo-location'
import { useRunStore } from '../../stores/run'
import { useCreateRun, useRuns } from '../../hooks/useRuns'
import { formatPace, formatDistance, formatDuration } from '../../lib/format'

export default function RunScreen() {
  const [tab, setTab] = useState<'active' | 'history'>('history')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const locationSubRef = useRef<Location.LocationSubscription | null>(null)

  const {
    isRunning, isPaused, elapsedSeconds, distanceMeters,
    currentPaceSecPerKm, avgPaceSecPerKm, currentHeartRate,
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
      // Start GPS tracking
      locationSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
        (loc) => {
          addDatapoint({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            altitudeM: loc.coords.altitude,
            timestamp: new Date(loc.timestamp).toISOString(),
            paceSecPerKm: loc.coords.speed && loc.coords.speed > 0
              ? Math.round(1000 / loc.coords.speed)
              : null,
          })
        },
      )
    } catch (e: any) {
      Alert.alert('위치 권한 필요', e.message)
    }
  }

  async function handleStop() {
    locationSubRef.current?.remove()
    const datapoints = stopRun()
    if (distanceMeters < 100) {
      setTab('history')
      return
    }
    await createRun.mutateAsync({
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: elapsedSeconds,
      distanceMeters,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      avgPaceSecPerKm: avgPaceSecPerKm ?? 360,
      dataSource: 'app_native',
      datapoints: datapoints.map((d) => ({
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
    setTab('history')
  }

  return (
    <View style={styles.container}>
      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'active' && styles.tabActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
            활성 런
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            기록
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'active' ? (
        <View style={styles.activeRun}>
          {/* Timer display */}
          <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>

          {/* Metrics row */}
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

          {currentHeartRate && (
            <Text style={styles.heartRate}>❤️ {currentHeartRate} bpm</Text>
          )}

          {/* Controls */}
          {!isRunning ? (
            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Text style={styles.startBtnText}>🏃 시작</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.pauseBtn}
                onPress={isPaused ? resumeRun : pauseRun}
              >
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
              <Text style={styles.emptyText}>첫 번째 런을 기록해보세요! 🏃</Text>
            </View>
          }
          renderItem={({ item }) => (
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
          )}
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
  heartRate: { color: '#f87171', fontSize: 18, marginBottom: 24 },
  startBtn: { backgroundColor: '#3b82f6', borderRadius: 80, width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  controls: { flexDirection: 'row', gap: 16 },
  pauseBtn: { backgroundColor: '#1e293b', borderRadius: 60, width: 120, height: 120, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3b82f6' },
  pauseBtnText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  stopBtn: { backgroundColor: '#ef4444', borderRadius: 60, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  stopBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  listContent: { padding: 16 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#64748b', fontSize: 16 },
  runCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12 },
  runCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  runTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 16 },
  runDate: { color: '#64748b', fontSize: 13 },
  runStats: { flexDirection: 'row', alignItems: 'center' },
  runStat: { color: '#94a3b8', fontSize: 14 },
  runStatDivider: { color: '#475569', marginHorizontal: 8 },
})
