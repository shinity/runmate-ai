export type InsightType =
  | 'recovery_advice'
  | 'performance_analysis'
  | 'habit_pattern'
  | 'injury_risk_alert'
  | 'motivation'
  | 'plan_adjustment'

export type SessionType =
  | 'easy'
  | 'tempo'
  | 'interval'
  | 'long_run'
  | 'recovery'
  | 'race'
  | 'cross_train'
  | 'rest'

export type PlanStatus = 'active' | 'completed' | 'paused' | 'abandoned'

export interface PlannedSession {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
  sessionType: SessionType
  targetDistanceKm: number | null
  targetDurationMin: number | null
  targetPaceMinSecPerKm: number | null
  targetPaceMaxSecPerKm: number | null
  description: string
  completedRunId: string | null
}

export interface PlanWeek {
  weekNumber: number
  targetDistanceKm: number
  targetSessions: number
  theme: string
  sessions: PlannedSession[]
}

export interface CoachingPlan {
  id: string
  userId: string
  title: string
  description: string
  goal: string
  startDate: string
  endDate: string
  status: PlanStatus
  weeks: PlanWeek[]
  adherenceScore: number
  lastAdaptedAt: string | null
  adaptationCount: number
  createdAt: string
  updatedAt: string
}

export interface CoachingInsight {
  id: string
  userId: string
  runId: string | null
  planId: string | null
  type: InsightType
  content: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  metrics: Record<string, number | string>
  actionItems: string[]
  readAt: string | null
  dismissedAt: string | null
  createdAt: string
}

export interface RecoveryStatus {
  score: number // 0-100
  recommendation: 'rest' | 'easy' | 'moderate' | 'hard'
  reasons: string[]
  estimatedReadyAt: string
}

export interface GeneratePlanDto {
  goal: string
  targetDate: string
  availableDaysPerWeek: number[]
  currentFitnessLevel?: 'low' | 'moderate' | 'high'
}
