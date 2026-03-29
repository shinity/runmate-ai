import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import websocket from '@fastify/websocket'
import staticFiles from '@fastify/static'
import path from 'path'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'

import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { runRoutes } from './routes/runs'
import { coachingRoutes } from './routes/coaching'
import { matchRoutes } from './routes/matching'
import { syncRoutes } from './routes/sync'
import { messageRoutes } from './routes/messages'
import { wsRoutes } from './routes/ws'
import { runAnalysisQueue, planAdaptationQueue, embeddingUpdateQueue, routeArtQueue } from './lib/queue'
import { startRunAnalysisWorker } from './workers/runAnalysis.worker'
import { startRouteArtWorker } from './workers/routeArt.worker'
import { startEmbeddingUpdateWorker } from './workers/embeddingUpdate.worker'
import { AppError } from './lib/errors'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

async function bootstrap() {
  // ─── Plugins ───────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? true,
    credentials: true,
  })

  // Static file serving for route art SVGs
  const uploadsDir = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads')
  await app.register(staticFiles, {
    root: uploadsDir,
    prefix: '/uploads/',
  })

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    sign: { expiresIn: '15m' },
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await app.register(websocket)

  await app.register(swagger, {
    openapi: {
      info: { title: 'RunMate AI API', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  })

  // ─── Bull Board (queue dashboard) ─────────────────────────────────────────
  const serverAdapter = new FastifyAdapter()
  createBullBoard({
    queues: [
      new BullMQAdapter(runAnalysisQueue),
      new BullMQAdapter(planAdaptationQueue),
      new BullMQAdapter(embeddingUpdateQueue),
      new BullMQAdapter(routeArtQueue),
    ],
    serverAdapter,
  })
  serverAdapter.setBasePath('/admin/queues')
  await app.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' })

  // ─── Error handler ────────────────────────────────────────────────────────
  app.setErrorHandler((err: any, _request, reply) => {
    if (err.name === 'ZodError' || Array.isArray(err.issues)) {
      return reply.code(400).send({
        error: { ...AppError.VALIDATION_ERROR, details: err.issues },
      })
    }
    if (err.statusCode === 429) {
      return reply.code(429).send({ error: AppError.RATE_LIMIT_EXCEEDED })
    }
    app.log.error(err)
    return reply.code(err.statusCode ?? 500).send({
      error: {
        ...AppError.INTERNAL_ERROR,
        message: process.env.NODE_ENV === 'production' ? AppError.INTERNAL_ERROR.message : err.message,
      },
    })
  })

  // ─── Auth decorator ────────────────────────────────────────────────────────
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } })
    }
  })

  // ─── Routes ────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(userRoutes, { prefix: '/api/v1/users' })
  await app.register(runRoutes, { prefix: '/api/v1/runs' })
  await app.register(coachingRoutes, { prefix: '/api/v1/coaching' })
  await app.register(matchRoutes, { prefix: '/api/v1/match' })
  await app.register(syncRoutes, { prefix: '/api/v1/sync' })
  await app.register(messageRoutes, { prefix: '/api/v1/messages' })
  await app.register(wsRoutes)

  // ─── Health check ──────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // ─── Workers ───────────────────────────────────────────────────────────────
  const runAnalysisWorker = startRunAnalysisWorker()
  app.log.info('[Workers] runAnalysis worker started')

  const routeArtWorker = startRouteArtWorker()
  app.log.info('[Workers] routeArt worker started')

  const embeddingUpdateWorker = startEmbeddingUpdateWorker()
  app.log.info('[Workers] embeddingUpdate worker started')

  // ─── Start ─────────────────────────────────────────────────────────────────
  const port = Number(process.env.PORT ?? 3000)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`RunMate API running on http://localhost:${port}`)
  console.log(`Swagger docs:  http://localhost:${port}/docs`)
  console.log(`Queue dashboard: http://localhost:${port}/admin/queues`)

  // Graceful shutdown
  const shutdown = async () => {
    await runAnalysisWorker.close()
    await routeArtWorker.close()
    await embeddingUpdateWorker.close()
    await app.close()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
