import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp, signToken } from '../test/app'
import { prisma } from '../lib/prisma'
import { sendToUser } from '../lib/websocket'

const USER_ID = 'user-1'
const OTHER_USER_ID = 'user-2'
const MATCH_ID = 'match-1'

const mockMatch = {
  id: MATCH_ID,
  requesterId: USER_ID,
  matchedUserId: OTHER_USER_ID,
  status: 'active',
}

const mockMessage = {
  id: 'msg-1',
  matchId: MATCH_ID,
  senderId: USER_ID,
  content: '안녕하세요!',
  readAt: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  sender: { id: USER_ID, displayName: '홍길동', avatarUrl: null },
}

describe('Message Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let token: string

  beforeEach(async () => {
    app = await buildApp()
    token = signToken(app, USER_ID)
    vi.clearAllMocks()
  })

  // ─── GET /api/v1/messages/:matchId ───────────────────────────────────────

  describe('GET /api/v1/messages/:matchId', () => {
    it('메시지 목록을 반환한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(mockMatch as any)
      vi.mocked(prisma.message.findMany).mockResolvedValue([mockMessage] as any)

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/messages/${MATCH_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(1)
      expect(res.json().meta.hasMore).toBe(false)
    })

    it('limit+1 기준으로 hasMore를 계산한다', async () => {
      const base = new Date('2024-01-01T10:00:00Z')
      const messages = Array.from({ length: 51 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
        createdAt: new Date(base.getTime() + i * 60_000),
      }))
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(mockMatch as any)
      vi.mocked(prisma.message.findMany).mockResolvedValue(messages as any)

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/messages/${MATCH_ID}?limit=50`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(50)
      expect(res.json().meta.hasMore).toBe(true)
      expect(res.json().meta.cursor).toBeTruthy()
    })

    it('매칭에 속하지 않으면 404를 반환한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/messages/${MATCH_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(404)
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/messages/${MATCH_ID}`,
      })

      expect(res.statusCode).toBe(401)
    })
  })

  // ─── POST /api/v1/messages/:matchId ──────────────────────────────────────

  describe('POST /api/v1/messages/:matchId', () => {
    it('메시지를 전송하고 201을 반환한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(mockMatch as any)
      vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as any)

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/messages/${MATCH_ID}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: '안녕하세요!' },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.content).toBe('안녕하세요!')
    })

    it('상대방에게 WebSocket 실시간 알림을 전송한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(mockMatch as any)
      vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as any)

      await app.inject({
        method: 'POST',
        url: `/api/v1/messages/${MATCH_ID}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: '반가워요!' },
      })

      expect(sendToUser).toHaveBeenCalledWith(OTHER_USER_ID, expect.objectContaining({ type: 'message' }))
    })

    it('빈 content이면 400을 반환한다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/messages/${MATCH_ID}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: '   ' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('매칭에 속하지 않으면 404를 반환한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/messages/${MATCH_ID}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: '안녕!' },
      })

      expect(res.statusCode).toBe(404)
    })
  })

  // ─── PATCH /api/v1/messages/:matchId/read ────────────────────────────────

  describe('PATCH /api/v1/messages/:matchId/read', () => {
    it('상대방 메시지를 읽음 처리하고 count를 반환한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(mockMatch as any)
      vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 3 } as any)

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/messages/${MATCH_ID}/read`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.updatedCount).toBe(3)
    })

    it('읽을 메시지가 없으면 count 0을 반환한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(mockMatch as any)
      vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 0 } as any)

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/messages/${MATCH_ID}/read`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.updatedCount).toBe(0)
    })

    it('매칭에 속하지 않으면 404를 반환한다', async () => {
      vi.mocked(prisma.runnerMatch.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/messages/${MATCH_ID}/read`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
