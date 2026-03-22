/**
 * Android Health Connect 유틸리티 (Android 전용)
 *
 * 주의: 이 모듈은 Expo Go(managed workflow)에서 동작하지 않습니다.
 * Custom Dev Build 또는 bare workflow 환경에서만 사용 가능합니다.
 * 빌드 시 `react-native-health-connect` 네이티브 모듈이 링크되어야 합니다.
 * Android 14 미만에서는 Health Connect 앱이 별도로 설치되어 있어야 합니다.
 *
 * 참고: https://github.com/matinzd/react-native-health-connect
 */

import { Platform } from 'react-native'

// react-native-health-connect는 Android 전용 네이티브 모듈입니다.
let HealthConnect: {
  initialize: () => Promise<boolean>
  requestPermission: (permissions: any[]) => Promise<any>
  readRecords: (recordType: string, options: any) => Promise<{ records: any[] }>
} | null = null

if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    HealthConnect = require('react-native-health-connect')
  } catch {
    // Custom Dev Build가 아닌 Expo Go 환경에서는 모듈이 없을 수 있습니다.
    console.warn(
      '[HealthConnect] react-native-health-connect 모듈을 불러올 수 없습니다. ' +
      'Custom Dev Build가 필요합니다.'
    )
  }
}

export interface HealthRun {
  /** ISO 8601 형식 시작 시각 */
  startDate: string
  /** ISO 8601 형식 종료 시각 */
  endDate: string
  /** 운동 시간 (초) */
  durationSeconds: number
  /** 이동 거리 (미터) */
  distanceMeters: number
  /** 평균 심박수 (bpm, 선택) */
  heartRateAvg?: number
  /** 데이터 출처 ("Samsung Health", "Garmin" 등) */
  sourceName: string
}

/**
 * Health Connect 권한 목록
 * ExerciseSession과 Distance, HeartRate 읽기 권한을 요청합니다.
 */
const PERMISSIONS = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'HeartRate' },
]

/** Health Connect ExerciseSession의 러닝 운동 타입 상수 */
const EXERCISE_TYPE_RUNNING = 56

/**
 * Android Health Connect 초기화 및 권한을 요청합니다.
 * @returns 권한 허용 여부 (Android가 아닌 경우 false)
 */
export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false
  }

  if (!HealthConnect) {
    console.warn('[HealthConnect] 모듈이 초기화되지 않았습니다.')
    return false
  }

  try {
    const initialized = await HealthConnect.initialize()
    if (!initialized) {
      console.warn('[HealthConnect] 초기화 실패. Health Connect 앱이 설치되어 있는지 확인하세요.')
      return false
    }

    const grantedPermissions = await HealthConnect.requestPermission(PERMISSIONS)

    // ExerciseSession 읽기 권한이 허용되었는지 확인합니다.
    const hasExercisePermission = (grantedPermissions ?? []).some(
      (p: any) => p.recordType === 'ExerciseSession' && p.accessType === 'read'
    )

    return hasExercisePermission
  } catch (error) {
    console.warn('[HealthConnect] 권한 요청 중 오류:', error)
    return false
  }
}

/**
 * 최근 daysBefore일 이내의 러닝 워크아웃을 Health Connect에서 조회합니다.
 * Samsung Health, Garmin 등 외부 앱이 기록한 EXERCISE_TYPE_RUNNING 데이터를 포함합니다.
 *
 * @param daysBefore - 조회 기간 (일 수, 기본 7일)
 * @returns HealthRun 배열
 */
export async function fetchRecentWorkouts(daysBefore = 7): Promise<HealthRun[]> {
  if (Platform.OS !== 'android') {
    return []
  }

  if (!HealthConnect) {
    console.warn('[HealthConnect] 모듈이 초기화되지 않았습니다.')
    return []
  }

  try {
    const startTime = new Date()
    startTime.setDate(startTime.getDate() - daysBefore)

    const { records: sessions } = await HealthConnect.readRecords('ExerciseSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
      },
    })

    // 러닝 타입만 필터링합니다.
    const runningSessions = (sessions ?? []).filter(
      (s: any) => s.exerciseType === EXERCISE_TYPE_RUNNING
    )

    const healthRuns: HealthRun[] = await Promise.all(
      runningSessions.map(async (session: any): Promise<HealthRun | null> => {
        const start = new Date(session.startTime)
        const end = new Date(session.endTime)
        const durationSeconds = Math.round((end.getTime() - start.getTime()) / 1000)

        // 세션과 동일한 시간 범위의 Distance 기록을 조회합니다.
        let distanceMeters = 0
        try {
          const { records: distanceRecords } = await HealthConnect!.readRecords('Distance', {
            timeRangeFilter: {
              operator: 'between',
              startTime: session.startTime,
              endTime: session.endTime,
            },
          })
          distanceMeters = (distanceRecords ?? []).reduce(
            (sum: number, d: any) => sum + (d.distance?.inMeters ?? d.distanceMeters ?? 0),
            0
          )
        } catch {
          // Distance 조회 실패 시 세션 내 segments에서 거리를 추출합니다.
          if (session.segments) {
            distanceMeters = session.segments.reduce(
              (sum: number, seg: any) => sum + (seg.distance?.inMeters ?? 0),
              0
            )
          }
        }

        // 세션 시간 범위의 HeartRate 기록을 조회합니다.
        let heartRateAvg: number | undefined
        try {
          const { records: hrRecords } = await HealthConnect!.readRecords('HeartRate', {
            timeRangeFilter: {
              operator: 'between',
              startTime: session.startTime,
              endTime: session.endTime,
            },
          })

          const allSamples: number[] = (hrRecords ?? []).flatMap(
            (hr: any) => (hr.samples ?? []).map((s: any) => s.beatsPerMinute)
          )

          if (allSamples.length > 0) {
            heartRateAvg = Math.round(
              allSamples.reduce((a, b) => a + b, 0) / allSamples.length
            )
          }
        } catch {
          // HeartRate 조회 실패는 무시합니다.
        }

        if (durationSeconds <= 0 || distanceMeters <= 0) {
          return null
        }

        return {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          durationSeconds,
          distanceMeters: Math.round(distanceMeters),
          heartRateAvg,
          sourceName: session.metadata?.dataOrigin ?? session.dataOrigin ?? 'Health Connect',
        }
      })
    )

    // null(유효하지 않은 데이터) 제거
    return healthRuns.filter((r): r is HealthRun => r !== null)
  } catch (error) {
    console.warn('[HealthConnect] 워크아웃 조회 중 오류:', error)
    return []
  }
}
