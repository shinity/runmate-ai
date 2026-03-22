import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { runAnalysisQueue, routeArtQueue } from '../lib/queue'
import { CreateRunSchema, PaginationSchema } from '@runmate/validators'

export async function runRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /runs - list user's runs (paginated)
  app.get('/', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { after, limit } = PaginationSchema.parse(request.query)

    const runs = await prisma.run.findMany({
      where: {
        userId,
        ...(after ? { id: { lt: after } } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: limit + 1,
      include: { splits: true },
    })

    const hasMore = runs.length > limit
    const items = hasMore ? runs.slice(0, limit) : runs

    return reply.send({
      data: items,
      meta: { hasMore, cursor: items[items.length - 1]?.id },
    })
  })

  // POST /runs - create a run
  app.post('/', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const body = CreateRunSchema.parse(request.body)
    const { datapoints, splits, ...runData } = body

    const run = await prisma.run.create({
      data: {
        userId,
        ...runData,
        bestPaceSecPerKm: runData.bestPaceSecPerKm ?? runData.avgPaceSecPerKm,
        splits: splits
          ? {
              create: splits.map((s) => ({
                splitNumber: s.splitNumber,
                splitType: s.splitType,
                durationSeconds: s.durationSeconds,
                paceSecPerKm: s.paceSecPerKm,
                heartRate: s.heartRate,
              })),
            }
          : undefined,
        datapoints: datapoints && datapoints.length > 0
          ? {
              create: datapoints.map((d) => ({
                timestamp: new Date(d.timestamp),
                lat: d.lat,
                lng: d.lng,
                altitudeM: d.altitudeM,
                heartRate: d.heartRate,
                paceSecPerKm: d.paceSecPerKm,
                cadenceSpm: d.cadenceSpm,
                powerWatts: d.powerWatts,
              })),
            }
          : undefined,
      },
      include: { splits: true },
    })

    // Queue async AI analysis (fire and forget)
    await runAnalysisQueue.add('analyze', { runId: run.id, userId })
    await routeArtQueue.add('generate', { runId: run.id, userId }, { delay: 5000 })

    return reply.code(201).send({ data: run })
  })

  // GET /runs/stats/weekly
  app.get('/stats/weekly', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const runs = await prisma.run.findMany({
      where: { userId, startedAt: { gte: sevenDaysAgo } },
      select: {
        distanceMeters: true,
        durationSeconds: true,
        avgPaceSecPerKm: true,
        trainingLoad: true,
      },
    })

    const totalDistance = runs.reduce((sum, r) => sum + r.distanceMeters, 0)
    const totalDuration = runs.reduce((sum, r) => sum + r.durationSeconds, 0)
    const totalLoad = runs.reduce((sum, r) => sum + r.trainingLoad, 0)
    const avgPace = runs.length
      ? runs.reduce((sum, r) => sum + r.avgPaceSecPerKm, 0) / runs.length
      : 0

    return reply.send({
      data: {
        totalRuns: runs.length,
        totalDistanceMeters: totalDistance,
        totalDurationSeconds: totalDuration,
        avgPaceSecPerKm: Math.round(avgPace),
        totalTrainingLoad: totalLoad,
        weekStart: sevenDaysAgo.toISOString(),
      },
    })
  })

  // GET /runs/personal-records
  app.get('/personal-records', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub

    // Find best pace for standard distances
    const distances = [
      { label: '5k', minMeters: 4800, maxMeters: 5200 },
      { label: '10k', minMeters: 9800, maxMeters: 10200 },
      { label: 'half_marathon', minMeters: 21000, maxMeters: 21300 },
      { label: 'marathon', minMeters: 42000, maxMeters: 42400 },
    ]

    const records = await Promise.all(
      distances.map(async ({ label, minMeters, maxMeters }) => {
        const best = await prisma.run.findFirst({
          where: { userId, distanceMeters: { gte: minMeters, lte: maxMeters } },
          orderBy: { avgPaceSecPerKm: 'asc' },
          select: { id: true, avgPaceSecPerKm: true, startedAt: true },
        })
        return best ? { distance: label, ...best } : null
      }),
    )

    return reply.send({ data: records.filter(Boolean) })
  })

  // GET /runs/:id
  app.get('/:id', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { id } = request.params as { id: string }

    const run = await prisma.run.findFirst({
      where: { id, userId },
      include: { splits: true },
    })

    if (!run) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Run not found' } })

    return reply.send({ data: run })
  })

  // PATCH /runs/:id
  app.patch('/:id', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { id } = request.params as { id: string }
    const body = request.body as { title?: string; notes?: string; isPublic?: boolean }

    const run = await prisma.run.findFirst({ where: { id, userId } })
    if (!run) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Run not found' } })

    const updated = await prisma.run.update({
      where: { id },
      data: {
        title: body.title,
        notes: body.notes,
        isPublic: body.isPublic,
      },
    })

    return reply.send({ data: updated })
  })

  // DELETE /runs/:id
  app.delete('/:id', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { id } = request.params as { id: string }

    const run = await prisma.run.findFirst({ where: { id, userId } })
    if (!run) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Run not found' } })

    await prisma.run.delete({ where: { id } })
    return reply.code(204).send()
  })
}
