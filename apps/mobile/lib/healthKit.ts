/**
 * Apple HealthKit 유틸리티 (iOS 전용)
 *
 * 주의: 이 모듈은 Expo Go(managed workflow)에서 동작하지 않습니다.
 * Custom Dev Build 또는 bare workflow 환경에서만 사용 가능합니다.
 * 빌드 시 `react-native-health` 네이티브 모듈이 링크되어야 합니다.
 *
 * 참고: https://github.com/agencyenterprise/react-native-health
 */

import { Platform } from 'react-native'

// react-native-health는 iOS 전용 네이티브 모듈입니다.
// Android에서는 import 자체를 피해야 하므로 동적으로 로드합니다.
let AppleHealthKit: any = null
let _warnedUnavailable = false

if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    AppleHealthKit = require('react-native-health').default
  } catch {
    // Custom Dev Build가 아닌 환경에서는 모듈이 없을 수 있습니다.
  }
}

function warnUnavailable() {
  if (!_warnedUnavailable) {
    _warnedUnavailable = true
    console.warn('[HealthKit] 모듈이 초기화되지 않았습니다. Custom Dev Build가 필요합니다.')
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
  /** 소모 칼로리 (kcal, 선택) */
  calories?: number
  /** 평균 심박수 (bpm, 선택) */
  heartRateAvg?: number
  /** 최대 심박수 (bpm, 선택) */
  heartRateMax?: number
  /** 데이터 출처 ("Apple Watch", "Garmin" 등) */
  sourceName: string
}

/** HealthKit 권한 요청에 필요한 퍼미션 목록 */
const PERMISSIONS = {
  permissions: {
    read: [
      'Workout',
      'DistanceWalkingRunning',
      'ActiveEnergyBurned',
      'HeartRate',
    ],
    write: [] as string[],
  },
}

/**
 * Apple HealthKit 권한을 요청합니다.
 * @returns 권한 허용 여부 (iOS가 아닌 경우 false)
 */
export async function requestHealthKitPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false
  }

  if (!AppleHealthKit) {
    warnUnavailable()
    return false
  }

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (error: string) => {
      if (error) {
        console.warn('[HealthKit] 권한 요청 실패:', error)
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}

/**
 * 최근 daysBefore일 이내의 러닝 워크아웃을 Apple HealthKit에서 조회합니다.
 * Apple Watch, Garmin 등 외부 앱이 기록한 HKWorkoutActivityTypeRunning 데이터를 포함합니다.
 *
 * @param daysBefore - 조회 기간 (일 수, 기본 7일)
 * @returns HealthRun 배열
 */
export async function fetchRecentWorkouts(daysBefore = 7): Promise<HealthRun[]> {
  if (Platform.OS !== 'ios') {
    return []
  }

  if (!AppleHealthKit) {
    warnUnavailable()
    return []
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBefore)

  const options = {
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString(),
    type: 'Running',
    ascending: false,
    limit: 100,
  }

  return new Promise((resolve) => {
    AppleHealthKit.getSamples(options, (error: string, results: any[]) => {
      if (error) {
        console.warn('[HealthKit] 워크아웃 조회 실패:', error)
        resolve([])
        return
      }

      const healthRuns: HealthRun[] = (results ?? []).map((workout: any) => {
        const start = new Date(workout.start ?? workout.startDate)
        const end = new Date(workout.end ?? workout.endDate)
        const durationSeconds = Math.round((end.getTime() - start.getTime()) / 1000)

        // react-native-health는 거리를 km 단위로 반환합니다.
        const distanceMeters = Math.round((workout.distance ?? 0) * 1000)

        return {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          durationSeconds: durationSeconds > 0 ? durationSeconds : (workout.duration ?? 0),
          distanceMeters,
          calories: workout.calories ?? workout.activeEnergyBurned ?? undefined,
          heartRateAvg: workout.heartRateAvg ?? undefined,
          heartRateMax: workout.heartRateMax ?? undefined,
          sourceName: workout.sourceName ?? workout.device?.name ?? 'Apple Health',
        }
      })

      // 거리 0 또는 시간 0인 데이터는 제외합니다.
      const validRuns = healthRuns.filter(
        (r) => r.distanceMeters > 0 && r.durationSeconds > 0
      )

      resolve(validRuns)
    })
  })
}
