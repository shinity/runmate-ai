import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../test/app'
import { prisma } from '../lib/prisma'

const mockVerifyIdToken = vi.hoisted(() => vi.fn())

vi.mock('../lib/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = mockVerifyIdToken
  },
}))

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

    it('Google OAuth로 가입된 계정은 OAUTH_ACCOUNT 401을 반환한다', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'google@test.com',
        passwordHash: null, // OAuth 계정 — passwordHash 없음
      } as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'google@test.com', password: 'any-password' },
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error.code).toBe('OAUTH_ACCOUNT')
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

  // ─── POST /api/v1/auth/google ─────────────────────────────────────────────

  describe('POST /api/v1/auth/google', () => {
    beforeEach(() => {
      process.env.GOOGLE_WEB_CLIENT_ID = 'test-client-id'
    })

    afterEach(() => {
      delete process.env.GOOGLE_WEB_CLIENT_ID
    })

    const mockPayload = {
      sub: 'google-sub-123',
      email: 'google@test.com',
      name: '구글유저',
      picture: 'https://example.com/avatar.jpg',
    }

    it('신규 Google 유저는 201과 토큰을 반환한다', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => mockPayload })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-g1',
        email: mockPayload.email,
        displayName: mockPayload.name,
        avatarUrl: mockPayload.picture,
        createdAt: new Date(),
      } as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: { idToken: 'valid-google-token' },
      })

      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.data.user.email).toBe(mockPayload.email)
      expect(body.data.tokens.accessToken).toBeDefined()
    })

    it('기존 이메일 유저는 200과 토큰을 반환한다', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => mockPayload })
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-existing',
        email: mockPayload.email,
        avatarUrl: null,
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-existing',
        email: mockPayload.email,
        displayName: '기존유저',
        avatarUrl: mockPayload.picture,
        createdAt: new Date(),
      } as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: { idToken: 'valid-google-token' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.tokens.accessToken).toBeDefined()
    })

    it('잘못된 Google idToken이면 401 INVALID_ID_TOKEN을 반환한다', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: { idToken: 'bad-token' },
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error.code).toBe('INVALID_ID_TOKEN')
    })
  })

  // ─── POST /api/v1/auth/forgot-password ───────────────────────────────────

  describe('POST /api/v1/auth/forgot-password', () => {
    it('등록된 이메일이면 코드를 발송하고 200을 반환한다', async () => {
      const { sendPasswordResetEmail } = await import('../lib/email')
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', email: 'test@test.com' } as any)
      vi.mocked(prisma.passwordResetToken.updateMany).mockResolvedValue({ count: 0 } as any)
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({ id: 'token-1' } as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'test@test.com' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.message).toBe('코드가 발송되었습니다')
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('test@test.com', expect.any(String))
    })

    it('존재하지 않는 이메일이어도 동일한 200을 반환한다 (이메일 열거 방지)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'nobody@test.com' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.message).toBe('코드가 발송되었습니다')
    })
  })

  // ─── POST /api/v1/auth/reset-password ────────────────────────────────────

  describe('POST /api/v1/auth/reset-password', () => {
    it('유효한 코드로 비밀번호를 변경하면 200을 반환한다', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', email: 'test@test.com' } as any)
      vi.mocked(prisma.passwordResetToken.findFirst).mockResolvedValue({
        id: 'token-1',
        token: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.passwordResetToken.update).mockResolvedValue({} as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: { email: 'test@test.com', code: '123456', newPassword: 'newpassword123' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.message).toBe('비밀번호가 변경되었습니다')
    })

    it('잘못된 코드이면 400 INVALID_CODE를 반환한다', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', email: 'test@test.com' } as any)
      vi.mocked(prisma.passwordResetToken.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: { email: 'test@test.com', code: '000000', newPassword: 'newpassword123' },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('INVALID_CODE')
    })

    it('존재하지 않는 이메일이면 400 INVALID_CODE를 반환한다', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: { email: 'nobody@test.com', code: '123456', newPassword: 'newpassword123' },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('INVALID_CODE')
    })

    it('코드가 6자리 미만이면 400 VALIDATION_ERROR를 반환한다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: { email: 'test@test.com', code: '123', newPassword: 'newpassword123' },
      })

      expect(res.statusCode).toBe(400)
    })
  })
})
