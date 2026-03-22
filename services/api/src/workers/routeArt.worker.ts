import { Worker, Job } from 'bullmq'
import { prisma } from '../lib/prisma'
import { RouteArtJob } from '../lib/queue'

const redisConnection = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}

const AI_PIPELINE_URL = process.env.AI_PIPELINE_URL ?? 'http://localhost:8000'
const AI_PIPELINE_SECRET = process.env.AI_PIPELINE_SECRET ?? 'dev-secret'

export function startRouteArtWorker() {
  const worker = new Worker<RouteArtJob, void, string>(
    'route-art',
    async (job: Job<RouteArtJob, void, string>) => {
      const { runId, userId } = job.data
      console.log(`[RouteArt] Processing run ${runId}`)

      // 1. GPS 데이터포인트 조회
      const run = await prisma.run.findUniqueOrThrow({
        where: { id: runId },
        include: { datapoints: { orderBy: { timestamp: 'asc' } } },
      })

      if (run.datapoints.length < 2) {
        console.log(`[RouteArt] Skipped run ${runId}: insufficient datapoints (${run.datapoints.length})`)
        return
      }

      // 2. 유저 위치 정보 조회
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { city: true },
      })

      // 3. ai-pipeline 호출
      const response = await fetch(`${AI_PIPELINE_URL}/art/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pipeline-secret': AI_PIPELINE_SECRET,
        },
        body: JSON.stringify({
          run_id: runId,
          user_id: userId,
          datapoints: run.datapoints.map((d) => ({
            lat: d.lat,
            lng: d.lng,
            altitude_m: d.altitudeM,
            pace_sec_per_km: d.paceSecPerKm,
            heart_rate: d.heartRate,
          })),
          city: user?.city ?? null,
          weather_condition: run.weatherCondition ?? null,
          avg_pace_sec_per_km: run.avgPaceSecPerKm,
        }),
      })

      if (!response.ok) {
        throw new Error(`ai-pipeline error: ${response.status} ${await response.text()}`)
      }

      const result = (await response.json()) as {
        data: {
          status: string
          render_mode: string
          image_b64: string
          mime_type: string
          reason?: string
        }
      }

      if (result.data.status === 'skipped') {
        console.log(`[RouteArt] Skipped run ${runId}: ${result.data.reason}`)
        return
      }

      // 4. base64 이미지 → 로컬 파일 저장
      const imageBuffer = Buffer.from(result.data.image_b64, 'base64')
      const fileName = `route-art-${runId}.png`
      const filePath = `/app/uploads/${fileName}`

      const { writeFile, mkdir } = await import('fs/promises')
      await mkdir('/app/uploads', { recursive: true })
      await writeFile(filePath, imageBuffer)

      // 5. Run 레코드에 URL 업데이트
      const artUrl = `/uploads/${fileName}`
      await prisma.run.update({
        where: { id: runId },
        data: { routeArtUrl: artUrl },
      })

      console.log(`[RouteArt] Done for run ${runId} (${result.data.render_mode})`)
    },
    { connection: redisConnection, concurrency: 2 },
  )

  worker.on('failed', (job, err) => {
    console.error(`[RouteArt] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
