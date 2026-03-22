import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../test/app'
import { prisma } from '../lib/prisma'

describe('Auth Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeEach(async () => {
    app = await buildApp()
    vi.clearAllMocks()
  })

  // ─── POST /api/v1/auth/register ───────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('신규 유저를 등록하고 토큰을 반환한다', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        displayName: '테스터',
        createdAt: new Date(),
      } as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'test@test.com', password: 'password123', displayName: '테스터' },
      })

      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.data.user.email).toBe('test@test.com')
      expect(body.data.tokens.accessToken).toBeDefined()
      expect(body.data.tokens.refreshToken).toBeDefined()
    })

    it('이미 존재하는 이메일이면 409를 반환한다', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'taken@test.com', password: 'password123', displayName: '중복' },
      })

      expect(res.statusCode).toBe(409)
      expect(res.json().error.code).toBe('EMAIL_TAKEN')
    })

    it('필수 필드 누락 시 400을 반환한다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'test@test.com' },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  // ─── POST /api/v1/auth/login ──────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('올바른 자격증명으로 로그인하면 토큰을 반환한다', async () => {
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('password123', 12)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        displayName: '테스터',
        passwordHash: hash,
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'test@test.com', password: 'password123' },
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data.tokens.accessToken).toBeDefined()
    })

    it('존재하지 않는 이메일이면 401을 반환한다', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'none@test.com', password: 'password123' },
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
    })

    it('비밀번호가 틀리면 401을 반환한다', async () => {
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('correct-password', 12)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: hash,
      } as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'test@test.com', password: 'wrong-password' },
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
    })
  })

  // ─── POST /api/v1/auth/refresh ────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('유효한 refresh token으로 새 access token을 발급한다', async () => {
      const refreshToken = app.jwt.sign({ sub: 'user-1', type: 'refresh' })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.accessToken).toBeDefined()
    })

    it('잘못된 토큰이면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: 'invalid.token.here' },
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error.code).toBe('INVALID_TOKEN')
    })

    it('access token을 refresh token으로 사용하면 401을 반환한다', async () => {
      const accessToken = app.jwt.sign({ sub: 'user-1' }) // type 없음

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: accessToken },
      })

      expect(res.statusCode).toBe(401)
    })
  })
})
