import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp, signToken } from '../test/app'
import { prisma } from '../lib/prisma'

vi.mock('../workers/planGeneration', () => ({
  generateTrainingPlan: vi.fn().mockResolvedValue({
    title: '10K 훈련 계획',
    description: '12주 훈련 계획',
    goal: '10k',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-06-24'),
    weeks: [],
  }),
}))

const MOCK_USER_ID = 'user-1'

const mockInsight = {
  id: 'insight-1',
  userId: MOCK_USER_ID,
  type: 'recovery_advice',
  content: '오늘은 가볍게 달리세요.',
  priority: 'medium',
  metrics: {},
  actionItems: ['10분 걷기'],
  readAt: null,
  dismissedAt: null,
  createdAt: new Date(),
}

const mockPlan = {
  id: 'plan-1',
  userId: MOCK_USER_ID,
  title: '10K 훈련 계획',
  description: '12주 훈련 계획',
  goal: '10k',
  startDate: new Date('2026-04-01'),
  endDate: new Date('2026-06-24'),
  status: 'active',
  weeks: [],
  adherenceScore: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('Coaching Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let token: string

  beforeEach(async () => {
    app = await buildApp()
    token = signToken(app, MOCK_USER_ID)
    vi.clearAllMocks()
  })

  // ─── GET /api/v1/coaching/insights ───────────────────────────────────────

  describe('GET /api/v1/coaching/insights', () => {
    it('인사이트 피드를 반환한다', async () => {
      vi.mocked(prisma.coachingInsight.findMany).mockResolvedValue([mockInsight] as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/coaching/insights',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data).toHaveLength(1)
      expect(body.data[0].type).toBe('recovery_advice')
      expect(body.meta.hasMore).toBe(false)
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/coaching/insights' })
      expect(res.statusCode).toBe(401)
    })
  })

  // ─── POST /api/v1/coaching/insights/:id/read ─────────────────────────────

  describe('POST /api/v1/coaching/insights/:id/read', () => {
    it('인사이트를 읽음 처리한다', async () => {
      vi.mocked(prisma.coachingInsight.updateMany).mockResolvedValue({ count: 1 } as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/coaching/insights/insight-1/read',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(204)
      expect(prisma.coachingInsight.updateMany).toHaveBeenCalledWith({
        where: { id: 'insight-1', userId: MOCK_USER_ID },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      })
    })
  })

  // ─── GET /api/v1/coaching/recovery ───────────────────────────────────────

  describe('GET /api/v1/coaching/recovery', () => {
    it('런이 없을 때 높은 회복 점수를 반환한다', async () => {
      vi.mocked(prisma.run.findMany).mockResolvedValue([])

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/coaching/recovery',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const { data } = res.json()
      expect(data.score).toBeGreaterThan(70)
      expect(data.recommendation).toBe('hard')
    })

    it('최근 높은 훈련 부하가 있으면 낮은 점수를 반환한다', async () => {
      vi.mocked(prisma.run.findMany).mockResolvedValue([
        { trainingLoad: 300, effortScore: 9, startedAt: new Date() }, // 오늘 달림
      ] as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/coaching/recovery',
        headers: { authorization: `Bearer ${token}` },
      })

      const { data } = res.json()
      expect(data.score).toBeLessThan(60)
    })

    it('recommendation이 유효한 값만 반환한다', async () => {
      vi.mocked(prisma.run.findMany).mockResolvedValue([])

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/coaching/recovery',
        headers: { authorization: `Bearer ${token}` },
      })

      const { data } = res.json()
      expect(['hard', 'moderate', 'easy', 'rest']).toContain(data.recommendation)
    })
  })

  // ─── GET /api/v1/coaching/plans ──────────────────────────────────────────

  describe('GET /api/v1/coaching/plans', () => {
    it('훈련 계획 목록을 반환한다', async () => {
      vi.mocked(prisma.coachingPlan.findMany).mockResolvedValue([mockPlan] as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/coaching/plans',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(1)
    })
  })

  // ─── POST /api/v1/coaching/plans/generate ────────────────────────────────

  describe('POST /api/v1/coaching/plans/generate', () => {
    it('AI 훈련 계획을 생성하고 저장한다', async () => {
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ id: MOCK_USER_ID } as any)
      vi.mocked(prisma.run.findMany).mockResolvedValue([])
      vi.mocked(prisma.coachingPlan.create).mockResolvedValue(mockPlan as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/coaching/plans/generate',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          goal: '10km 완주를 목표로 하는 훈련 계획',
          targetDate: '2026-06-24T00:00:00Z',
          availableDaysPerWeek: [1, 3, 5, 6],
          currentFitnessLevel: 'moderate',
        },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.title).toBe('10K 훈련 계획')
    })
  })

  // ─── PATCH /api/v1/coaching/plans/:id ────────────────────────────────────

  describe('PATCH /api/v1/coaching/plans/:id', () => {
    it('계획 상태를 변경한다', async () => {
      vi.mocked(prisma.coachingPlan.findFirst).mockResolvedValue(mockPlan as any)
      vi.mocked(prisma.coachingPlan.update).mockResolvedValue({ ...mockPlan, status: 'paused' } as any)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/coaching/plans/plan-1',
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'paused' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.status).toBe('paused')
    })

    it('존재하지 않는 계획이면 404를 반환한다', async () => {
      vi.mocked(prisma.coachingPlan.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/coaching/plans/not-exist',
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'paused' },
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
