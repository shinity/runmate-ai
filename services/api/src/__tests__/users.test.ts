import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp, signToken } from '../test/app'
import { prisma } from '../lib/prisma'

const USER_ID = 'user-1'

const mockUser = {
  id: USER_ID,
  email: 'test@test.com',
  displayName: '홍길동',
  avatarUrl: null,
  city: '서울',
  countryCode: 'KR',
  experienceLevel: 'intermediate',
  primaryGoal: 'half_marathon',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  devices: [],
}

describe('User Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let token: string

  beforeEach(async () => {
    app = await buildApp()
    token = signToken(app, USER_ID)
    vi.clearAllMocks()
  })

  // ─── GET /api/v1/users/me ─────────────────────────────────────────────────

  describe('GET /api/v1/users/me', () => {
    it('인증된 사용자 프로필과 활성 기기를 반환한다', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.id).toBe(USER_ID)
      expect(res.json().data.email).toBe('test@test.com')
    })

    it('사용자가 없으면 404를 반환한다', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(404)
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
      })

      expect(res.statusCode).toBe(401)
    })
  })

  // ─── PATCH /api/v1/users/me ───────────────────────────────────────────────

  describe('PATCH /api/v1/users/me', () => {
    it('프로필을 수정하고 업데이트된 사용자를 반환한다', async () => {
      const updated = { ...mockUser, displayName: '김철수', city: '부산' }
      vi.mocked(prisma.user.update).mockResolvedValue(updated as any)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/me',
        headers: { authorization: `Bearer ${token}` },
        payload: { displayName: '김철수', city: '부산' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.displayName).toBe('김철수')
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/me',
        payload: { displayName: '김철수' },
      })

      expect(res.statusCode).toBe(401)
    })
  })

  // ─── GET /api/v1/users/:id ────────────────────────────────────────────────

  describe('GET /api/v1/users/:id', () => {
    it('공개 프로필을 반환한다 (인증 불필요)', async () => {
      const publicProfile = {
        id: USER_ID,
        displayName: '홍길동',
        avatarUrl: null,
        city: '서울',
        countryCode: 'KR',
        experienceLevel: 'intermediate',
        primaryGoal: 'half_marathon',
        createdAt: new Date('2024-01-01'),
      }
      vi.mocked(prisma.user.findUnique).mockResolvedValue(publicProfile as any)

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${USER_ID}`,
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.displayName).toBe('홍길동')
    })

    it('존재하지 않는 유저는 404를 반환한다', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/nonexistent-id',
      })

      expect(res.statusCode).toBe(404)
    })
  })

  // ─── DELETE /api/v1/users/me ──────────────────────────────────────────────

  describe('DELETE /api/v1/users/me', () => {
    it('계정을 삭제하고 204를 반환한다', async () => {
      vi.mocked(prisma.user.delete).mockResolvedValue(mockUser as any)

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/me',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(204)
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } })
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/me',
      })

      expect(res.statusCode).toBe(401)
    })
  })
})
