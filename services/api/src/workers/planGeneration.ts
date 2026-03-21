import { generateTrainingPlanWithClaude } from './claude'

export async function generateTrainingPlan(input: {
  user: {
    experienceLevel: string
    primaryGoal: string
    weeklyTargetKm: number
  }
  recentRuns: Array<{
    distanceMeters: number
    durationSeconds: number
    avgPaceSecPerKm: number
    startedAt: Date
  }>
  input: {
    goal: string
    targetDate: string
    availableDaysPerWeek: number[]
    currentFitnessLevel?: string
  }
}) {
  const { user, recentRuns, input: dto } = input

  // Summarize recent runs for context
  const totalKm = recentRuns.reduce((s, r) => s + r.distanceMeters / 1000, 0)
  const avgPace =
    recentRuns.length > 0
      ? recentRuns.reduce((s, r) => s + r.avgPaceSecPerKm, 0) / recentRuns.length
      : 360
  const paceMin = Math.floor(avgPace / 60)
  const paceSec = Math.round(avgPace % 60)
  const recentRunsSummary = `${recentRuns.length} runs in last 30 days, ${totalKm.toFixed(0)}km total, avg pace ${paceMin}:${String(paceSec).padStart(2, '0')}/km`

  const planData = (await generateTrainingPlanWithClaude({
    user,
    goal: dto.goal,
    targetDate: dto.targetDate,
    availableDays: dto.availableDaysPerWeek,
    currentFitnessLevel: dto.currentFitnessLevel ?? 'moderate',
    recentRunsSummary,
  })) as any

  return {
    title: planData.title ?? `Training Plan: ${dto.goal}`,
    description: planData.description ?? '',
    goal: dto.goal,
    startDate: new Date(),
    endDate: new Date(dto.targetDate),
    status: 'active' as const,
    weeks: planData.weeks ?? [],
    adherenceScore: 0,
    adaptationCount: 0,
  }
}
