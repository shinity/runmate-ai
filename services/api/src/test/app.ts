import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { authRoutes } from '../routes/auth'
import { userRoutes } from '../routes/users'
import { runRoutes } from '../routes/runs'
import { coachingRoutes } from '../routes/coaching'
import { matchRoutes } from '../routes/matching'
import { messageRoutes } from '../routes/messages'
import { syncRoutes } from '../routes/sync'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  await app.register(jwt, {
    secret: 'test-secret',
    sign: { expiresIn: '15m' },
  })

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } })
    }
  })

  // Zod 유효성 오류 → 400 (라우트 등록 전에 설정해야 플러그인 스코프에 적용됨)
  app.setErrorHandler((err: any, _request, reply) => {
    const isZod = err.name === 'ZodError' || Array.isArray(err.issues) || err.cause?.name === 'ZodError'
    if (isZod) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: err.message } })
    }
    reply.code(err.statusCode ?? 500).send({ error: { code: 'INTERNAL_ERROR', message: err.message } })
  })

  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(userRoutes, { prefix: '/api/v1/users' })
  await app.register(runRoutes, { prefix: '/api/v1/runs' })
  await app.register(coachingRoutes, { prefix: '/api/v1/coaching' })
  await app.register(matchRoutes, { prefix: '/api/v1/match' })
  await app.register(messageRoutes, { prefix: '/api/v1/messages' })
  await app.register(syncRoutes, { prefix: '/api/v1/sync' })

  app.get('/health', async () => ({ status: 'ok' }))

  await app.ready()
  return app
}

/** 테스트용 JWT 발급 */
export function signToken(app: FastifyInstance, userId: string): string {
  return app.jwt.sign({ sub: userId, email: 'test@test.com' })
}
