export type RunningStyle = 'social' | 'competitive' | 'meditative' | 'mixed'
export type PreferredRunTime = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'
export type LookingFor = 'solo_accountability' | 'running_partner' | 'group' | 'any'
export type MatchStatus = 'pending' | 'accepted' | 'declined' | 'active' | 'ended'

export interface MatchProfile {
  id: string
  userId: string

  // Computed running characteristics (updated after each run)
  avgPaceSecPerKm: number
  avgWeeklyKm: number
  consistencyScore: number // 0-100
  preferredRunTime: PreferredRunTime
  preferredRunDays: number[] // [1,3,6] = Mon,Wed,Sat
  preferredDistanceKm: number

  // Compatibility dimensions
  runningStyle: RunningStyle
  communicationPref: 'chatty' | 'quiet' | 'results_only'

  // Match settings
  lookingFor: LookingFor
  maxPaceDifferenceSecPerKm: number
  preferVirtualOnly: boolean

  // Location
  city: string | null
  isLocationPublic: boolean

  embeddingUpdatedAt: string
  updatedAt: string
}

export interface CompatibilityBreakdown {
  pace: number // 0-1
  schedule: number
  goal: number
  style: number
  overall: number
}

export interface RunnerMatch {
  id: string
  requesterId: string
  matchedUserId: string
  matchType: 'partner' | 'group'
  groupId: string | null
  similarityScore: number
  compatibilityBreakdown: CompatibilityBreakdown
  status: MatchStatus
  matchedAt: string
  respondedAt: string | null
}

export interface MatchSuggestion {
  user: {
    id: string
    displayName: string
    avatarUrl: string | null
    city: string | null
    experienceLevel: string
  }
  matchProfile: Pick<MatchProfile, 'avgPaceSecPerKm' | 'avgWeeklyKm' | 'runningStyle' | 'preferredRunTime'>
  compatibility: CompatibilityBreakdown
}

export interface RunnerGroup {
  id: string
  name: string
  description: string
  createdBy: string
  memberCount: number
  maxMembers: number
  isPublic: boolean
  tags: string[]
  avgPaceSecPerKm: number
  createdAt: string
}
