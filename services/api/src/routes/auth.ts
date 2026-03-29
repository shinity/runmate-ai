import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../lib/prisma'
import { LoginSchema, RegisterSchema, GoogleAuthSchema } from '@runmate/validators'
import { sendPasswordResetEmail } from '../lib/email'
import { AppError } from '../lib/errors'

const googleClient = new OAuth2Client()

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = RegisterSchema.parse(request.body)

    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      return reply.code(409).send({ error: AppError.EMAIL_TAKEN })
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
      return reply.code(401).send({ error: AppError.INVALID_CREDENTIALS })
    }

    if (!user.passwordHash) {
      return reply.code(401).send({ error: AppError.OAUTH_ACCOUNT })
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) {
      return reply.code(401).send({ error: AppError.INVALID_CREDENTIALS })
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
      return reply.code(401).send({ error: AppError.INVALID_TOKEN })
    }
  })

  app.post('/forgot-password', async (request, reply) => {
    const body = z.object({ email: z.string().email() }).parse(request.body)

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) {
      // 이메일 존재 여부를 노출하지 않기 위해 동일한 응답 반환
      return reply.send({ data: { message: '코드가 발송되었습니다' } })
    }

    // 기존 미사용 토큰 무효화
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    // 6자리 랜덤 숫자 코드 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15분 후

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: code, expiresAt },
    })

    await sendPasswordResetEmail(user.email, code)

    return reply.send({ data: { message: '코드가 발송되었습니다' } })
  })

  app.post('/google', async (request, reply) => {
    const body = GoogleAuthSchema.parse(request.body)

    const audience = process.env.GOOGLE_WEB_CLIENT_ID
    if (!audience) {
      app.log.error('GOOGLE_WEB_CLIENT_ID is not set')
      return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Google OAuth is not configured' } })
    }

    let payload
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: body.idToken,
        audience,
      })
      payload = ticket.getPayload()
    } catch (err) {
      return reply.code(401).send({ error: AppError.INVALID_ID_TOKEN })
    }

    if (!payload || !payload.sub || !payload.email) {
      return reply.code(401).send({ error: AppError.INVALID_ID_TOKEN })
    }

    const { sub: googleId, email, name, picture } = payload

    // 이미 동일 이메일로 가입된 유저가 있으면 googleId만 연결, 없으면 신규 생성
    const existingByEmail = await prisma.user.findUnique({ where: { email } })

    let user
    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId,
          avatarUrl: existingByEmail.avatarUrl ?? picture ?? null,
          lastActiveAt: new Date(),
        },
        select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
      })
    } else {
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          displayName: name ?? email.split('@')[0],
          avatarUrl: picture ?? null,
        },
        select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
      })
    }

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email })
    const refreshToken = app.jwt.sign({ sub: user.id, type: 'refresh' }, { expiresIn: '30d' })

    const statusCode = existingByEmail ? 200 : 201
    return reply.code(statusCode).send({
      data: { user, tokens: { accessToken, refreshToken, expiresIn: 900 } },
    })
  })

  app.post('/reset-password', async (request, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(8),
      })
      .parse(request.body)

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) {
      return reply.code(400).send({ error: AppError.INVALID_CODE })
    }

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: body.code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (!resetToken) {
      return reply.code(400).send({ error: AppError.INVALID_CODE })
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 12)

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ])

    return reply.send({ data: { message: '비밀번호가 변경되었습니다' } })
  })
}
