export type DataSource = 'apple_health' | 'health_connect' | 'garmin_connect' | 'manual' | 'app_native'

export type SurfaceType = 'road' | 'trail' | 'track' | 'treadmill' | 'mixed'

export interface Run {
  id: string
  userId: string

  // Timing
  startedAt: string
  endedAt: string
  durationSeconds: number

  // Distance & elevation
  distanceMeters: number
  elevationGainMeters: number
  elevationLossMeters: number

  // Performance
  avgPaceSecPerKm: number
  bestPaceSecPerKm: number
  avgHeartRate: number | null
  maxHeartRate: number | null
  avgCadenceSpm: number | null
  avgPowerWatts: number | null

  // Derived
  vo2maxEstimate: number | null
  trainingLoad: number
  effortScore: number // 1-10

  // Conditions
  weatherTempC: number | null
  weatherHumidity: number | null
  weatherCondition: string | null
  surfaceType: SurfaceType | null

  // Source & media
  dataSource: DataSource
  rawGpxUrl: string | null
  routeArtUrl: string | null
  animatedRouteArtUrl: string | null

  // Social
  isPublic: boolean
  title: string | null
  notes: string | null

  splits: RunSplit[]

  createdAt: string
}

export interface RunSplit {
  id: string
  runId: string
  splitNumber: number
  splitType: 'km' | 'mile'
  durationSeconds: number
  paceSecPerKm: number
  heartRate: number | null
}

export interface RunDatapoint {
  runId: string
  timestamp: string
  lat: number | null
  lng: number | null
  altitudeM: number | null
  heartRate: number | null
  cadenceSpm: number | null
  paceSecPerKm: number | null
  powerWatts: number | null
}

export type CreateRunDto = Pick<
  Run,
  | 'startedAt'
  | 'endedAt'
  | 'durationSeconds'
  | 'distanceMeters'
  | 'elevationGainMeters'
  | 'elevationLossMeters'
  | 'avgPaceSecPerKm'
  | 'dataSource'
> &
  Partial<
    Pick<
      Run,
      | 'bestPaceSecPerKm'
      | 'avgHeartRate'
      | 'maxHeartRate'
      | 'avgCadenceSpm'
      | 'avgPowerWatts'
      | 'surfaceType'
      | 'weatherTempC'
      | 'weatherHumidity'
      | 'weatherCondition'
      | 'title'
      | 'notes'
      | 'isPublic'
      | 'effortScore'
    >
  > & {
    datapoints?: Omit<RunDatapoint, 'runId'>[]
    splits?: Omit<RunSplit, 'id' | 'runId'>[]
  }

export interface RunStats {
  totalRuns: number
  totalDistanceMeters: number
  totalDurationSeconds: number
  avgPaceSecPerKm: number
  avgWeeklyKm: number
  currentStreakDays: number
  longestStreakDays: number
}

export interface PersonalRecord {
  distance: '1k' | '5k' | '10k' | 'half_marathon' | 'marathon'
  paceSecPerKm: number
  runId: string
  achievedAt: string
}
