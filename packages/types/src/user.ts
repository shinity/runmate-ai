export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite'

export type RunningGoal =
  | 'fitness'
  | '5k'
  | '10k'
  | 'half_marathon'
  | 'marathon'
  | 'ultra'

export type DeviceType =
  | 'apple_watch'
  | 'galaxy_watch'
  | 'garmin'
  | 'polar'
  | 'fitbit'
  | 'wahoo'

export interface ConnectedDevice {
  id: string
  userId: string
  deviceType: DeviceType
  deviceId: string
  syncedAt: string | null
  isActive: boolean
}

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null

  // Physical profile
  dateOfBirth: string | null
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null
  heightCm: number | null
  weightKg: number | null

  // Running profile
  experienceLevel: ExperienceLevel
  primaryGoal: RunningGoal
  weeklyTargetKm: number
  preferredPaceMinSecPerKm: number
  preferredPaceMaxSecPerKm: number

  // Location (city-level only for privacy)
  city: string | null
  countryCode: string | null
  timezone: string

  connectedDevices: ConnectedDevice[]

  // Onboarding
  onboardingCompleted: boolean

  // Matching preferences
  matchingEnabled: boolean
  preferGroupRuns: boolean
  maxMatchDistanceKm: number

  createdAt: string
  updatedAt: string
  lastActiveAt: string
}

export type CreateUserDto = Pick<
  User,
  | 'email'
  | 'displayName'
  | 'experienceLevel'
  | 'primaryGoal'
  | 'weeklyTargetKm'
  | 'timezone'
> &
  Partial<
    Pick<
      User,
      | 'dateOfBirth'
      | 'gender'
      | 'heightCm'
      | 'weightKg'
      | 'city'
      | 'countryCode'
      | 'preferredPaceMinSecPerKm'
      | 'preferredPaceMaxSecPerKm'
    >
  >

export type UpdateUserDto = Partial<
  Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt' | 'lastActiveAt' | 'connectedDevices'>
>
