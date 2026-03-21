import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { planAdaptationQueue } from '../lib/queue'
import { GeneratePlanSchema, PaginationSchema } from '@runmate/validators'
import { generateTrainingPlan } from '../workers/planGeneration'

export async function coachingRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /coaching/plans
  app.get('/plans', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub

    const plans = await prisma.coachingPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send({ data: plans })
  })

  // POST /coaching/plans/generate - AI generates a new plan
  app.post('/plans/generate', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const body = GeneratePlanSchema.parse(request.body)

    // Get user context for AI
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const recentRuns = await prisma.run.findMany({
      where: { userId, startedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { startedAt: 'desc' },
      take: 20,
    })

    const plan = await generateTrainingPlan({ user, recentRuns, input: body })

    const saved = await prisma.coachingPlan.create({ data: { ...plan, userId } })

    return reply.code(201).send({ data: saved })
  })

  // GET /coaching/plans/:id
  app.get('/plans/:id', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { id } = request.params as { id: string }

    const plan = await prisma.coachingPlan.findFirst({ where: { id, userId } })
    if (!plan) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Plan not found' } })

    return reply.send({ data: plan })
  })

  // PATCH /coaching/plans/:id - pause or change status
  app.patch('/plans/:id', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { id } = request.params as { id: string }
    const body = request.body as { status?: string }

    const plan = await prisma.coachingPlan.findFirst({ where: { id, userId } })
    if (!plan) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Plan not found' } })

    const updated = await prisma.coachingPlan.update({
      where: { id },
      data: { status: body.status as any },
    })

    return reply.send({ data: updated })
  })

  // GET /coaching/insights - feed of AI coaching insights
  app.get('/insights', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { after, limit } = PaginationSchema.parse(request.query)

    const insights = await prisma.coachingInsight.findMany({
      where: {
        userId,
        dismissedAt: null,
        ...(after ? { id: { lt: after } } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit + 1,
    })

    const hasMore = insights.length > limit
    const items = hasMore ? insights.slice(0, limit) : insights

    return reply.send({
      data: items,
      meta: { hasMore, cursor: items[items.length - 1]?.id },
    })
  })

  // POST /coaching/insights/:id/read
  app.post('/insights/:id/read', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { id } = request.params as { id: string }

    await prisma.coachingInsight.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    })

    return reply.code(204).send()
  })

  // GET /coaching/recovery - current recovery status
  app.get('/recovery', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const recentRuns = await prisma.run.findMany({
      where: { userId, startedAt: { gte: sevenDaysAgo } },
      orderBy: { startedAt: 'desc' },
      select: { trainingLoad: true, effortScore: true, startedAt: true },
    })

    // Simple recovery score: higher recent load = lower recovery
    const totalLoad = recentRuns.reduce((sum, r) => sum + r.trainingLoad, 0)
    const lastRunDaysAgo = recentRuns[0]
      ? (Date.now() - new Date(recentRuns[0].startedAt).getTime()) / (1000 * 60 * 60 * 24)
      : 7

    const baseScore = Math.min(100, 40 + lastRunDaysAgo * 20 - totalLoad * 0.1)
    const score = Math.max(0, Math.round(baseScore))

    const recommendation =
      score >= 80 ? 'hard' : score >= 60 ? 'moderate' : score >= 40 ? 'easy' : 'rest'

    return reply.send({
      data: {
        score,
        recommendation,
        reasons: [
          totalLoad > 200 ? 'High training load this week' : 'Normal training load',
          lastRunDaysAgo < 1 ? 'Ran today — muscles still recovering' : `Last run ${Math.round(lastRunDaysAgo)} day(s) ago`,
        ],
        estimatedReadyAt: new Date(Date.now() + (100 - score) * 60 * 60 * 1000).toISOString(),
      },
    })
  })
}
