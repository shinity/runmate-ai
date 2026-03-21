import { Worker, Job } from 'bullmq'

const redisConnection = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}
import { prisma } from '../lib/prisma'
import { RunAnalysisJob } from '../lib/queue'
import { analyzeRunWithClaude } from './claude'

export function startRunAnalysisWorker() {
  const worker = new Worker<RunAnalysisJob, void, string>(
    'run-analysis',
    async (job: Job<RunAnalysisJob, void, string>) => {
      const { runId, userId } = job.data
      console.log(`[RunAnalysis] Processing run ${runId} for user ${userId}`)

      // 1. Fetch run data
      const run = await prisma.run.findUniqueOrThrow({
        where: { id: runId },
        include: { splits: true },
      })

      // 2. Fetch user context
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
      const activePlan = await prisma.coachingPlan.findFirst({
        where: { userId, status: 'active' },
      })

      // 3. Fetch last 90 days of runs for context
      const historicalRuns = await prisma.run.findMany({
        where: {
          userId,
          startedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          id: { not: runId },
        },
        orderBy: { startedAt: 'desc' },
        take: 30,
        select: {
          distanceMeters: true,
          durationSeconds: true,
          avgPaceSecPerKm: true,
          avgHeartRate: true,
          trainingLoad: true,
          startedAt: true,
        },
      })

      // 4. Compute training load for this run
      const trainingLoad = computeTrainingLoad(run)
      await prisma.run.update({
        where: { id: runId },
        data: { trainingLoad },
      })

      // 5. Call Claude for insight
      const insight = await analyzeRunWithClaude({
        run: { ...run, trainingLoad },
        user,
        historicalRuns,
        activePlan,
      })

      // 6. Save insight
      await prisma.coachingInsight.create({
        data: {
          userId,
          runId,
          planId: activePlan?.id ?? null,
          type: insight.type as any,
          content: insight.content,
          priority: insight.priority as any,
          metrics: insight.metrics ?? {},
          actionItems: insight.actionItems ?? [],
        },
      })

      // 7. Update match profile (async, non-blocking)
      await updateMatchProfile(userId, historicalRuns, run)

      console.log(`[RunAnalysis] Done for run ${runId}`)
    },
    { connection: redisConnection, concurrency: 5 },
  )

  worker.on('failed', (job, err) => {
    console.error(`[RunAnalysis] Job ${job?.id} failed:`, err.message)
  })

  return worker
}

function computeTrainingLoad(run: { durationSeconds: number; avgHeartRate: number | null; effortScore: number }) {
  // Simplified TRIMP (Training Impulse) calculation
  // Full implementation uses HR zones
  const durationMin = run.durationSeconds / 60
  const effortMultiplier = run.effortScore / 5
  return Math.round(durationMin * effortMultiplier)
}

async function updateMatchProfile(
  userId: string,
  historicalRuns: Array<{ distanceMeters: number; avgPaceSecPerKm: number; startedAt: Date }>,
  latestRun: { avgPaceSecPerKm: number; distanceMeters: number },
) {
  const allRuns = [latestRun, ...historicalRuns]
  const avgPace = allRuns.reduce((s, r) => s + r.avgPaceSecPerKm, 0) / allRuns.length
  const avgDist = allRuns.reduce((s, r) => s + r.distanceMeters, 0) / allRuns.length / 1000

  // Weekly km from last 4 weeks
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
  const recentRuns = historicalRuns.filter((r) => new Date(r.startedAt) >= fourWeeksAgo)
  const weeklyKm = recentRuns.reduce((s, r) => s + r.distanceMeters / 1000, 0) / 4

  await prisma.matchProfile.upsert({
    where: { userId },
    update: {
      avgPaceSecPerKm: Math.round(avgPace),
      avgWeeklyKm: Math.round(weeklyKm * 10) / 10,
      preferredDistanceKm: Math.round(avgDist * 10) / 10,
    },
    create: {
      userId,
      avgPaceSecPerKm: Math.round(avgPace),
      avgWeeklyKm: Math.round(weeklyKm * 10) / 10,
      preferredDistanceKm: Math.round(avgDist * 10) / 10,
    },
  })
}
