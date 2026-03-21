import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { LoginSchema, RegisterSchema } from '@runmate/validators'

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = RegisterSchema.parse(request.body)

    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      return reply.code(409).send({ error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } })
    }

    const passwordHash = await bcrypt.hash(body.password, 12)
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        displayName: body.displayName,
      },
      select: { id: true, email: true, displayName: true, createdAt: true },
    })

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email })
    const refreshToken = app.jwt.sign({ sub: user.id, type: 'refresh' }, { expiresIn: '30d' })

    return reply.code(201).send({
      data: { user, tokens: { accessToken, refreshToken, expiresIn: 900 } },
    })
  })

  app.post('/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body)

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) {
      return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } })
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) {
      return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } })
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email })
    const refreshToken = app.jwt.sign({ sub: user.id, type: 'refresh' }, { expiresIn: '30d' })

    return reply.send({
      data: {
        user: { id: user.id, email: user.email, displayName: user.displayName },
        tokens: { accessToken, refreshToken, expiresIn: 900 },
      },
    })
  })

  app.post('/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string() }).parse(request.body)
    try {
      const payload = app.jwt.verify<{ sub: string; type: string }>(body.refreshToken)
      if (payload.type !== 'refresh') throw new Error('Not a refresh token')

      const accessToken = app.jwt.sign({ sub: payload.sub })
      return reply.send({ data: { accessToken, expiresIn: 900 } })
    } catch {
      return reply.code(401).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' } })
    }
  })
}
