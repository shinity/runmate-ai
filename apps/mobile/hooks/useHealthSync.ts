/**
 * 건강 앱 동기화 훅
 * iOS: Apple HealthKit / Android: Health Connect
 *
 * 주의: Custom Dev Build 또는 bare workflow 환경에서만 정상 동작합니다.
 * Expo Go에서는 네이티브 모듈이 없어 권한 요청 및 데이터 조회가 동작하지 않습니다.
 */

import { useState, useCallback, useEffect } from 'react'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { HealthRun as HealthKitRun } from '../lib/healthKit'
import type { HealthRun as HealthConnectRun } from '../lib/healthConnect'

// 동기화된 런 ID를 AsyncStorage에 저장하는 키
const SYNCED_IDS_KEY = 'health_synced_run_ids'
const LAST_SYNC_KEY = 'health_last_sync_at'

type HealthRun = HealthKitRun | HealthConnectRun

/**
 * HealthRun을 POST /runs에 전송할 본문으로 변환합니다.
 * avgPaceSecPerKm = durationSeconds / (distanceMeters / 1000)
 */
function toRunPayload(run: HealthRun, dataSource: 'apple_health' | 'health_connect') {
  const avgPaceSecPerKm = Math.round(run.durationSeconds / (run.distanceMeters / 1000))

  return {
    startedAt: run.startDate,
    distanceMeters: run.distanceMeters,
    durationSeconds: run.durationSeconds,
    avgPaceSecPerKm,
    // 칼로리는 apple_health에만 존재합니다.
    calories: 'calories' in run ? run.calories : undefined,
    heartRateAvg: run.heartRateAvg,
    heartRateMax: 'heartRateMax' in run ? run.heartRateMax : undefined,
    dataSource,
    sourceName: run.sourceName,
  }
}

/**
 * HealthRun을 고유하게 식별하는 키를 생성합니다.
 * startDate + distanceMeters 조합으로 중복 동기화를 방지합니다.
 */
function runToSyncId(run: HealthRun): string {
  return `${run.startDate}_${run.distanceMeters}`
}

/**
 * AsyncStorage에서 동기화된 런 ID 목록을 불러옵니다.
 */
async function loadSyncedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SYNCED_IDS_KEY)
    if (!raw) return new Set()
    const ids: string[] = JSON.parse(raw)
    return new Set(ids)
  } catch {
    return new Set()
  }
}

/**
 * 동기화된 런 ID를 AsyncStorage에 저장합니다.
 */
async function saveSyncedIds(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNCED_IDS_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // 저장 실패 시 다음 동기화에서 중복 전송될 수 있지만 치명적이지 않습니다.
  }
}

export interface UseHealthSyncResult {
  /** 동기화 진행 여부 */
  isSyncing: boolean
  /** 마지막 동기화 시각 (ISO 문자열, 없으면 null) */
  lastSyncAt: string | null
  /** 마지막 동기화 오류 메시지 (없으면 null) */
  syncError: string | null
  /** 동기화된 런 수 (마지막 동기화 기준) */
  syncedCount: number
  /**
   * 건강 앱에서 최근 7일 워크아웃을 가져와 서버로 전송합니다.
   * 이미 전송된 런은 스킵합니다.
   */
  syncWorkouts: () => Promise<void>
  /**
   * 플랫폼에 맞는 건강 앱 권한을 요청합니다.
   * @returns 권한 허용 여부
   */
  requestPermissions: () => Promise<boolean>
}

export function useHealthSync(): UseHealthSyncResult {
  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncedCount, setSyncedCount] = useState(0)

  // 마운트 시 마지막 동기화 시각 복원
  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNC_KEY).then((val) => {
      if (val) setLastSyncAt(val)
    }).catch(() => {})
  }, [])

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      const { requestHealthKitPermissions } = await import('../lib/healthKit')
      return requestHealthKitPermissions()
    } else if (Platform.OS === 'android') {
      const { requestHealthConnectPermissions } = await import('../lib/healthConnect')
      return requestHealthConnectPermissions()
    }
    return false
  }, [])

  const syncWorkouts = useCallback(async (): Promise<void> => {
    if (isSyncing) return

    setIsSyncing(true)
    setSyncError(null)
    setSyncedCount(0)

    try {
      // 플랫폼에 맞게 워크아웃 데이터를 가져옵니다.
      let workouts: HealthRun[] = []
      let dataSource: 'apple_health' | 'health_connect'

      if (Platform.OS === 'ios') {
        const { fetchRecentWorkouts } = await import('../lib/healthKit')
        workouts = await fetchRecentWorkouts(7)
        dataSource = 'apple_health'
      } else if (Platform.OS === 'android') {
        const { fetchRecentWorkouts } = await import('../lib/healthConnect')
        workouts = await fetchRecentWorkouts(7)
        dataSource = 'health_connect'
      } else {
        // iOS/Android 이외 플랫폼은 지원하지 않습니다.
        setSyncError('지원하지 않는 플랫폼입니다.')
        return
      }

      if (workouts.length === 0) {
        const now = new Date().toISOString()
        setLastSyncAt(now)
        await AsyncStorage.setItem(LAST_SYNC_KEY, now)
        return
      }

      // 이미 동기화된 런 ID를 불러옵니다.
      const syncedIds = await loadSyncedIds()

      // 새로 동기화할 런만 필터링합니다.
      const newWorkouts = workouts.filter((run) => !syncedIds.has(runToSyncId(run)))

      let successCount = 0
      const newlySyncedIds = new Set<string>()

      // 순차적으로 전송합니다 (병렬 전송 시 서버 부하 및 rate limit 방지).
      for (const workout of newWorkouts) {
        try {
          const payload = toRunPayload(workout, dataSource)
          await api.post('/runs', payload)
          const syncId = runToSyncId(workout)
          newlySyncedIds.add(syncId)
          syncedIds.add(syncId)
          successCount++
        } catch (err) {
          // 개별 런 전송 실패 시 다음 런으로 계속합니다.
          console.warn('[HealthSync] 런 전송 실패:', err)
        }
      }

      // 새로 동기화된 ID를 저장합니다.
      if (newlySyncedIds.size > 0) {
        await saveSyncedIds(syncedIds)
      }

      setSyncedCount(successCount)

      const now = new Date().toISOString()
      setLastSyncAt(now)
      await AsyncStorage.setItem(LAST_SYNC_KEY, now)

      // 런 목록 및 통계 캐시를 갱신합니다.
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['runs'] })
        queryClient.invalidateQueries({ queryKey: ['coaching', 'insights'] })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '동기화 중 오류가 발생했습니다.'
      setSyncError(message)
      console.warn('[HealthSync] 동기화 오류:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, queryClient])

  return {
    isSyncing,
    lastSyncAt,
    syncError,
    syncedCount,
    syncWorkouts,
    requestPermissions,
  }
}
