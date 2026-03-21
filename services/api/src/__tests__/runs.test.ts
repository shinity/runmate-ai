import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp, signToken } from '../test/app'
import { prisma } from '../lib/prisma'
import { runAnalysisQueue, routeArtQueue } from '../lib/queue'

const MOCK_USER_ID = 'user-1'

const mockRun = {
  id: 'run-1',
  userId: MOCK_USER_ID,
  startedAt: new Date('2026-03-21T08:00:00Z'),
  endedAt: new Date('2026-03-21T08:35:00Z'),
  durationSeconds: 2100,
  distanceMeters: 7000,
  avgPaceSecPerKm: 300,
  bestPaceSecPerKm: 280,
  trainingLoad: 50,
  effortScore: 7,
  dataSource: 'app_native',
  isPublic: false,
  splits: [],
  createdAt: new Date(),
}

describe('Run Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let token: string

  beforeEach(async () => {
    app = await buildApp()
    token = signToken(app, MOCK_USER_ID)
    vi.clearAllMocks()
  })

  // ─── GET /api/v1/runs ─────────────────────────────────────────────────────

  describe('GET /api/v1/runs', () => {
    it('런 목록을 cursor 페이지네이션으로 반환한다', async () => {
      vi.mocked(prisma.run.findMany).mockResolvedValue([mockRun] as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data).toHaveLength(1)
      expect(body.meta.hasMore).toBe(false)
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/runs' })
      expect(res.statusCode).toBe(401)
    })
  })

  // ─── POST /api/v1/runs ────────────────────────────────────────────────────

  describe('POST /api/v1/runs', () => {
    it('런을 저장하고 AI 분석 큐에 등록한다', async () => {
      vi.mocked(prisma.run.create).mockResolvedValue(mockRun as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          startedAt: '2026-03-21T08:00:00Z',
          endedAt: '2026-03-21T08:35:00Z',
          durationSeconds: 2100,
          distanceMeters: 7000,
          avgPaceSecPerKm: 300,
          dataSource: 'app_native',
          effortScore: 7,
        },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.id).toBe('run-1')
      expect(runAnalysisQueue.add).toHaveBeenCalledWith('analyze', { runId: 'run-1', userId: MOCK_USER_ID })
      expect(routeArtQueue.add).toHaveBeenCalledWith('generate', { runId: 'run-1', userId: MOCK_USER_ID }, { delay: 5000 })
    })
  })

  // ─── GET /api/v1/runs/stats/weekly ───────────────────────────────────────

  describe('GET /api/v1/runs/stats/weekly', () => {
    it('최근 7일 통계를 반환한다', async () => {
      vi.mocked(prisma.run.findMany).mockResolvedValue([
        { distanceMeters: 5000, durationSeconds: 1500, avgPaceSecPerKm: 300, trainingLoad: 30 },
        { distanceMeters: 7000, durationSeconds: 2100, avgPaceSecPerKm: 300, trainingLoad: 50 },
      ] as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs/stats/weekly',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const { data } = res.json()
      expect(data.totalRuns).toBe(2)
      expect(data.totalDistanceMeters).toBe(12000)
      expect(data.totalDurationSeconds).toBe(3600)
    })

    it('런이 없으면 0 통계를 반환한다', async () => {
      vi.mocked(prisma.run.findMany).mockResolvedValue([])

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs/stats/weekly',
        headers: { authorization: `Bearer ${token}` },
      })

      const { data } = res.json()
      expect(data.totalRuns).toBe(0)
      expect(data.avgPaceSecPerKm).toBe(0)
    })
  })

  // ─── GET /api/v1/runs/:id ─────────────────────────────────────────────────

  describe('GET /api/v1/runs/:id', () => {
    it('런 상세를 반환한다', async () => {
      vi.mocked(prisma.run.findFirst).mockResolvedValue(mockRun as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs/run-1',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.id).toBe('run-1')
    })

    it('존재하지 않는 런이면 404를 반환한다', async () => {
      vi.mocked(prisma.run.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs/not-exist',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(404)
      expect(res.json().error.code).toBe('NOT_FOUND')
    })
  })

  // ─── DELETE /api/v1/runs/:id ──────────────────────────────────────────────

  describe('DELETE /api/v1/runs/:id', () => {
    it('런을 삭제한다', async () => {
      vi.mocked(prisma.run.findFirst).mockResolvedValue(mockRun as any)
      vi.mocked(prisma.run.delete).mockResolvedValue(mockRun as any)

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/runs/run-1',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(204)
    })

    it('다른 유저의 런은 삭제할 수 없다', async () => {
      vi.mocked(prisma.run.findFirst).mockResolvedValue(null) // userId 불일치

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/runs/other-run',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
