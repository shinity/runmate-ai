import { Worker, Job } from 'bullmq'
import { prisma } from '../lib/prisma'
import { EmbeddingUpdateJob } from '../lib/queue'

const redisConnection = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}

const AI_PIPELINE_URL = process.env.AI_PIPELINE_URL ?? 'http://localhost:8000'
const AI_PIPELINE_SECRET = process.env.AI_PIPELINE_SECRET ?? 'dev-secret'

export function startEmbeddingUpdateWorker() {
  const worker = new Worker<EmbeddingUpdateJob, void, string>(
    'embedding-update',
    async (job: Job<EmbeddingUpdateJob, void, string>) => {
      const { userId } = job.data
      console.log(`[EmbeddingUpdate] Processing embedding update for user ${userId}`)

      // 1. userId로 user + matchProfile 조회
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          experienceLevel: true,
          primaryGoal: true,
          city: true,
        },
      })

      if (!user) {
        console.warn(`[EmbeddingUpdate] User ${userId} not found, skipping`)
        return
      }

      const matchProfile = await prisma.matchProfile.findUnique({
        where: { userId },
      })

      if (!matchProfile) {
        console.warn(`[EmbeddingUpdate] MatchProfile for user ${userId} not found, skipping`)
        return
      }

      // 2. AI Pipeline /embeddings/update POST 호출
      const profilePayload = {
        user_id: userId,
        profile: {
          avgPaceSecPerKm: matchProfile.avgPaceSecPerKm,
          avgWeeklyKm: matchProfile.avgWeeklyKm,
          preferredDistanceKm: matchProfile.preferredDistanceKm,
          experienceLevel: user.experienceLevel ?? 'intermediate',
          primaryGoal: user.primaryGoal ?? 'fitness',
          city: user.city ?? '',
          runningStyle: matchProfile.runningStyle ?? 'mixed',
          preferredRunTime: matchProfile.preferredRunTime ?? 'morning',
          consistencyScore: matchProfile.consistencyScore ?? 50,
          lookingFor: matchProfile.lookingFor ?? 'any',
        },
      }

      const response = await fetch(`${AI_PIPELINE_URL}/embeddings/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pipeline-secret': AI_PIPELINE_SECRET,
        },
        body: JSON.stringify(profilePayload),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`AI Pipeline error: ${response.status} ${body}`)
      }

      console.log(`[EmbeddingUpdate] Done for user ${userId}`)
    },
    { connection: redisConnection, concurrency: 10 },
  )

  // 3. 에러 시 로그만 기록 (실패해도 매칭 기능은 동작)
  worker.on('failed', (job, err) => {
    console.error(`[EmbeddingUpdate] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
