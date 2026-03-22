import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp, signToken } from '../test/app'
import { prisma } from '../lib/prisma'
import { embeddingUpdateQueue } from '../lib/queue'

const MOCK_USER_ID = 'user-1'
const TARGET_USER_ID = 'user-2'

const mockProfile = {
  id: 'profile-1',
  userId: MOCK_USER_ID,
  avgPaceSecPerKm: 300,
  avgWeeklyKm: 25,
  consistencyScore: 0.8,
  preferredRunTime: 'morning',
  preferredRunDays: [1, 3, 5],
  preferredDistanceKm: 7,
  runningStyle: 'competitive',
  communicationPref: 'results_only',
  lookingFor: 'any',
  maxPaceDifferenceSecPerKm: 60,
  preferVirtualOnly: false,
  isLocationPublic: true,
  embeddingUpdatedAt: null,
  updatedAt: new Date(),
}

describe('Matching Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let token: string

  beforeEach(async () => {
    app = await buildApp()
    token = signToken(app, MOCK_USER_ID)
    vi.clearAllMocks()
  })

  // ─── GET /api/v1/match/profile ────────────────────────────────────────────

  describe('GET /api/v1/match/profile', () => {
    it('기존 프로필을 반환한다', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockProfile as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/match/profile',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.avgPaceSecPerKm).toBe(300)
    })

    it('프로필이 없으면 런 기록 기반으로 자동 생성한다', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ id: MOCK_USER_ID } as any)
      vi.mocked(prisma.run.findMany).mockResolvedValue([
        { avgPaceSecPerKm: 300, distanceMeters: 7000, startedAt: new Date() },
      ] as any)
      vi.mocked(prisma.matchProfile.create).mockResolvedValue(mockProfile as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/match/profile',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(prisma.matchProfile.create).toHaveBeenCalled()
    })
  })

  // ─── PATCH /api/v1/match/profile ─────────────────────────────────────────

  describe('PATCH /api/v1/match/profile', () => {
    it('프로필을 수정하고 임베딩 업데이트 큐에 등록한다', async () => {
      vi.mocked(prisma.matchProfile.upsert).mockResolvedValue({
        ...mockProfile,
        runningStyle: 'social',
      } as any)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/match/profile',
        headers: { authorization: `Bearer ${token}` },
        payload: { runningStyle: 'social' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.runningStyle).toBe('social')
      expect(embeddingUpdateQueue.add).toHaveBeenCalledWith('update', { userId: MOCK_USER_ID })
    })
  })

  // ─── GET /api/v1/match/suggestions ───────────────────────────────────────

  describe('GET /api/v1/match/suggestions', () => {
    it('페이스 유사도 기반 추천 러너를 반환한다', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(mockProfile as any)
      vi.mocked(prisma.matchProfile.findMany).mockResolvedValue([
        {
          ...mockProfile,
          id: 'profile-2',
          userId: TARGET_USER_ID,
          avgPaceSecPerKm: 310,
          runningStyle: 'competitive',
          user: { id: TARGET_USER_ID, displayName: '러너2', avatarUrl: null, city: 'Seoul', experienceLevel: 'intermediate' },
        },
      ] as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/match/suggestions',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const { data } = res.json()
      expect(data).toHaveLength(1)
      expect(data[0].compatibility.overall).toBeGreaterThan(0)
    })

    it('프로필이 없으면 빈 배열을 반환한다', async () => {
      vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/match/suggestions',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(0)
    })
  })

  // ─── POST /api/v1/match/request/:targetId ────────────────────────────────

  describe('POST /api/v1/match/request/:targetId', () => {
    it('매칭 요청을 생성한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.runnerMatch.create).mockResolvedValue({
        id: 'match-1',
        requesterId: MOCK_USER_ID,
        matchedUserId: TARGET_USER_ID,
        status: 'pending',
      } as any)

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/match/request/${TARGET_USER_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.status).toBe('pending')
    })

    it('자기 자신에게 매칭 요청하면 400을 반환한다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/match/request/${MOCK_USER_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('INVALID_REQUEST')
    })

    it('이미 매칭이 존재하면 409를 반환한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue({ id: 'existing-match' } as any)

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/match/request/${TARGET_USER_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(409)
      expect(res.json().error.code).toBe('ALREADY_MATCHED')
    })
  })

  // ─── PATCH /api/v1/match/:matchId ────────────────────────────────────────

  describe('PATCH /api/v1/match/:matchId', () => {
    it('매칭 요청을 수락한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue({
        id: 'match-1',
        matchedUserId: MOCK_USER_ID,
        status: 'pending',
      } as any)
      vi.mocked(prisma.runnerMatch.update).mockResolvedValue({
        id: 'match-1',
        status: 'accepted',
      } as any)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/match/match-1',
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'accepted' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.status).toBe('accepted')
    })

    it('요청을 받지 않은 매칭이면 404를 반환한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/match/not-exist',
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'accepted' },
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
