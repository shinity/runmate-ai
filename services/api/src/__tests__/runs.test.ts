import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp, signToken } from '../test/app'
import { prisma } from '../lib/prisma'
import { runAnalysisQueue, routeArtQueue } from '../lib/queue'

const MOCK_USER_ID = 'user-1'
const OTHER_USER_ID = 'user-2'

const mockRun = {
  id: 'run-1',
  userId: MOCK_USER_ID,
  startedAt: new Date('2026-03-21T08:00:00Z'),
  endedAt: new Date('2026-03-21T08:35:00Z'),
  durationSeconds: 2100,
  distanceMeters: 7000,
  avgPaceSecPerKm: 300,
  bestPaceSecPerKm: 280,
  elevationGainMeters: 0,
  elevationLossMeters: 0,
  trainingLoad: 50,
  effortScore: 7,
  dataSource: 'app_native',
  isPublic: false,
  splits: [],
  createdAt: new Date(),
}

const minimalRunPayload = {
  startedAt: '2026-03-21T08:00:00Z',
  endedAt: '2026-03-21T08:35:00Z',
  durationSeconds: 2100,
  distanceMeters: 7000,
  avgPaceSecPerKm: 300,
  dataSource: 'app_native',
  effortScore: 7,
}

describe('Run Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let token: string

  beforeEach(async () => {
    app = await buildApp()
    token = signToken(app, MOCK_USER_ID)
    vi.clearAllMocks()
  })

  // ─── POST /api/v1/runs ────────────────────────────────────────────────────

  describe('POST /api/v1/runs', () => {
    it('런을 저장하고 AI 분석 큐에 등록한다', async () => {
      vi.mocked(prisma.run.create).mockResolvedValue(mockRun as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
        payload: minimalRunPayload,
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.id).toBe('run-1')
      expect(runAnalysisQueue.add).toHaveBeenCalledWith('analyze', { runId: 'run-1', userId: MOCK_USER_ID })
      expect(routeArtQueue.add).toHaveBeenCalledWith('generate', { runId: 'run-1', userId: MOCK_USER_ID }, { delay: 5000 })
    })

    it('스플릿 데이터를 포함한 런을 저장한다', async () => {
      const mockRunWithSplits = {
        ...mockRun,
        splits: [
          { id: 'split-1', splitNumber: 1, splitType: 'km', durationSeconds: 300, paceSecPerKm: 300, heartRate: 150 },
          { id: 'split-2', splitNumber: 2, splitType: 'km', durationSeconds: 310, paceSecPerKm: 310, heartRate: 155 },
        ],
      }
      vi.mocked(prisma.run.create).mockResolvedValue(mockRunWithSplits as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          ...minimalRunPayload,
          splits: [
            { splitNumber: 1, splitType: 'km', durationSeconds: 300, paceSecPerKm: 300, heartRate: 150 },
            { splitNumber: 2, splitType: 'km', durationSeconds: 310, paceSecPerKm: 310, heartRate: 155 },
          ],
        },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.splits).toHaveLength(2)
      expect(prisma.run.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            splits: expect.objectContaining({ create: expect.any(Array) }),
          }),
        }),
      )
    })

    it('GPS 데이터포인트를 포함한 런을 저장한다', async () => {
      vi.mocked(prisma.run.create).mockResolvedValue(mockRun as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          ...minimalRunPayload,
          datapoints: [
            { timestamp: '2026-03-21T08:00:00Z', lat: 37.5665, lng: 126.9780, altitudeM: 50, heartRate: 140 },
            { timestamp: '2026-03-21T08:01:00Z', lat: 37.5670, lng: 126.9785, altitudeM: 52, heartRate: 145 },
          ],
        },
      })

      expect(res.statusCode).toBe(201)
      expect(prisma.run.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            datapoints: expect.objectContaining({ create: expect.any(Array) }),
          }),
        }),
      )
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        payload: minimalRunPayload,
      })

      expect(res.statusCode).toBe(401)
    })

    it('필수 필드(distanceMeters) 누락 시 400을 반환한다', async () => {
      const { distanceMeters: _omit, ...payloadWithoutDistance } = minimalRunPayload

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
        payload: payloadWithoutDistance,
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('VALIDATION_ERROR')
    })

    it('필수 필드(durationSeconds) 누락 시 400을 반환한다', async () => {
      const { durationSeconds: _omit, ...payloadWithoutDuration } = minimalRunPayload

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
        payload: payloadWithoutDuration,
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('VALIDATION_ERROR')
    })

    it('dataSource가 유효하지 않으면 400을 반환한다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
        payload: { ...minimalRunPayload, dataSource: 'invalid_source' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('bestPaceSecPerKm 미제공 시 avgPaceSecPerKm으로 대체한다', async () => {
      vi.mocked(prisma.run.create).mockResolvedValue(mockRun as any)

      await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
        payload: minimalRunPayload, // bestPaceSecPerKm 없음
      })

      expect(prisma.run.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bestPaceSecPerKm: minimalRunPayload.avgPaceSecPerKm,
          }),
        }),
      )
    })

    it('빈 datapoints 배열은 datapoints 필드를 생성하지 않는다', async () => {
      vi.mocked(prisma.run.create).mockResolvedValue(mockRun as any)

      await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
        payload: { ...minimalRunPayload, datapoints: [] },
      })

      expect(prisma.run.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            datapoints: undefined,
          }),
        }),
      )
    })
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
      expect(body.meta.cursor).toBe('run-1')
    })

    it('limit 파라미터를 문자열로 전달해도 숫자로 coerce 처리한다', async () => {
      vi.mocked(prisma.run.findMany).mockResolvedValue([mockRun] as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs?limit=5',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      // limit=5 이면 take: 6 (limit+1)으로 호출
      expect(prisma.run.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 6 }),
      )
    })

    it('limit이 최대값(100)을 초과하면 400을 반환한다', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs?limit=200',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(400)
    })

    it('hasMore가 true이면 응답에 cursor가 포함된다', async () => {
      // limit 기본값 20, take: 21개를 반환하면 hasMore = true
      const twentyOneRuns = Array.from({ length: 21 }, (_, i) => ({
        ...mockRun,
        id: `run-${i + 1}`,
      }))
      vi.mocked(prisma.run.findMany).mockResolvedValue(twentyOneRuns as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
      })

      const body = res.json()
      expect(body.meta.hasMore).toBe(true)
      expect(body.data).toHaveLength(20)
      expect(body.meta.cursor).toBe('run-20')
    })

    it('다른 유저의 런은 조회되지 않는다', async () => {
      // userId 필터가 쿼리에 반드시 포함됨을 검증
      vi.mocked(prisma.run.findMany).mockResolvedValue([])

      const otherToken = signToken(app, OTHER_USER_ID)
      await app.inject({
        method: 'GET',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${otherToken}` },
      })

      expect(prisma.run.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: OTHER_USER_ID }),
        }),
      )
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/runs' })
      expect(res.statusCode).toBe(401)
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
      expect(data.totalTrainingLoad).toBe(80)
      expect(data.avgPaceSecPerKm).toBe(300)
      expect(data.weekStart).toBeDefined()
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
      expect(data.totalDistanceMeters).toBe(0)
      expect(data.totalDurationSeconds).toBe(0)
      expect(data.avgPaceSecPerKm).toBe(0)
      expect(data.totalTrainingLoad).toBe(0)
    })

    it('7일 이내 런만 조회한다 (startedAt 필터 확인)', async () => {
      vi.mocked(prisma.run.findMany).mockResolvedValue([])

      await app.inject({
        method: 'GET',
        url: '/api/v1/runs/stats/weekly',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(prisma.run.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: MOCK_USER_ID,
            startedAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      )
    })

    it('런 생성 후 주간 통계에 반영된다', async () => {
      // 런 생성
      vi.mocked(prisma.run.create).mockResolvedValue(mockRun as any)
      await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: { authorization: `Bearer ${token}` },
        payload: minimalRunPayload,
      })

      // 주간 통계 조회 시 생성된 런 반환
      vi.mocked(prisma.run.findMany).mockResolvedValue([
        {
          distanceMeters: mockRun.distanceMeters,
          durationSeconds: mockRun.durationSeconds,
          avgPaceSecPerKm: mockRun.avgPaceSecPerKm,
          trainingLoad: mockRun.trainingLoad,
        },
      ] as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs/stats/weekly',
        headers: { authorization: `Bearer ${token}` },
      })

      const { data } = res.json()
      expect(data.totalRuns).toBe(1)
      expect(data.totalDistanceMeters).toBe(mockRun.distanceMeters)
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/runs/stats/weekly' })
      expect(res.statusCode).toBe(401)
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

    it('다른 유저의 런에 접근하면 404를 반환한다', async () => {
      // findFirst는 userId 필터를 포함하므로 다른 유저 런은 null 반환
      vi.mocked(prisma.run.findFirst).mockResolvedValue(null)

      const otherToken = signToken(app, OTHER_USER_ID)
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs/run-1',
        headers: { authorization: `Bearer ${otherToken}` },
      })

      expect(res.statusCode).toBe(404)
      expect(res.json().error.code).toBe('NOT_FOUND')
    })

    it('userId 필터가 쿼리에 포함된다', async () => {
      vi.mocked(prisma.run.findFirst).mockResolvedValue(mockRun as any)

      await app.inject({
        method: 'GET',
        url: '/api/v1/runs/run-1',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(prisma.run.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1', userId: MOCK_USER_ID },
        }),
      )
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

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/runs/run-1' })
      expect(res.statusCode).toBe(401)
    })
  })

  // ─── PATCH /api/v1/runs/:id ───────────────────────────────────────────────

  describe('PATCH /api/v1/runs/:id', () => {
    it('런 제목과 메모를 수정한다', async () => {
      const updatedRun = { ...mockRun, title: '아침 러닝', notes: '컨디션 좋음' }
      vi.mocked(prisma.run.findFirst).mockResolvedValue(mockRun as any)
      vi.mocked(prisma.run.update).mockResolvedValue(updatedRun as any)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/runs/run-1',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: '아침 러닝', notes: '컨디션 좋음' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.title).toBe('아침 러닝')
      expect(res.json().data.notes).toBe('컨디션 좋음')
    })

    it('isPublic 상태를 변경한다', async () => {
      const updatedRun = { ...mockRun, isPublic: true }
      vi.mocked(prisma.run.findFirst).mockResolvedValue(mockRun as any)
      vi.mocked(prisma.run.update).mockResolvedValue(updatedRun as any)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/runs/run-1',
        headers: { authorization: `Bearer ${token}` },
        payload: { isPublic: true },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.isPublic).toBe(true)
    })

    it('존재하지 않는 런이면 404를 반환한다', async () => {
      vi.mocked(prisma.run.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/runs/not-exist',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: '수정 시도' },
      })

      expect(res.statusCode).toBe(404)
      expect(res.json().error.code).toBe('NOT_FOUND')
    })

    it('다른 유저의 런은 수정할 수 없다', async () => {
      vi.mocked(prisma.run.findFirst).mockResolvedValue(null) // userId 불일치

      const otherToken = signToken(app, OTHER_USER_ID)
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/runs/run-1',
        headers: { authorization: `Bearer ${otherToken}` },
        payload: { title: '수정 시도' },
      })

      expect(res.statusCode).toBe(404)
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/runs/run-1',
        payload: { title: '수정 시도' },
      })

      expect(res.statusCode).toBe(401)
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
      expect(prisma.run.delete).toHaveBeenCalledWith({ where: { id: 'run-1' } })
    })

    it('다른 유저의 런은 삭제할 수 없다', async () => {
      vi.mocked(prisma.run.findFirst).mockResolvedValue(null) // userId 불일치

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/runs/other-run',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(404)
      expect(prisma.run.delete).not.toHaveBeenCalled()
    })

    it('존재하지 않는 런이면 404를 반환한다', async () => {
      vi.mocked(prisma.run.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/runs/not-exist',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(404)
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/v1/runs/run-1' })
      expect(res.statusCode).toBe(401)
    })
  })

  // ─── GET /api/v1/runs/personal-records ───────────────────────────────────

  describe('GET /api/v1/runs/personal-records', () => {
    it('기록이 있는 거리의 개인 최고 기록을 반환한다', async () => {
      const mock5kRecord = {
        id: 'run-5k',
        avgPaceSecPerKm: 270,
        startedAt: new Date('2026-03-10T08:00:00Z'),
      }
      vi.mocked(prisma.run.findFirst)
        .mockResolvedValueOnce(mock5kRecord as any) // 5k
        .mockResolvedValueOnce(null)               // 10k
        .mockResolvedValueOnce(null)               // half
        .mockResolvedValueOnce(null)               // full

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs/personal-records',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const { data } = res.json()
      expect(data).toHaveLength(1)
      expect(data[0].distance).toBe('5k')
      expect(data[0].avgPaceSecPerKm).toBe(270)
    })

    it('기록이 없으면 빈 배열을 반환한다', async () => {
      vi.mocked(prisma.run.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/runs/personal-records',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(0)
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/runs/personal-records' })
      expect(res.statusCode).toBe(401)
    })
  })
})
