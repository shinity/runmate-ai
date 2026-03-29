import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { sendToUser } from '../lib/websocket'
import { AppError } from '../lib/errors'

export async function messageRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // 매칭 소유권 검증 헬퍼
  async function verifyMatchAccess(matchId: string, userId: string) {
    const match = await prisma.runnerMatch.findFirst({
      where: {
        id: matchId,
        OR: [{ requesterId: userId }, { matchedUserId: userId }],
      },
    })
    return match
  }

  // GET /messages/:matchId - 메시지 목록 (cursor 페이지네이션)
  app.get('/:matchId', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { matchId } = request.params as { matchId: string }
    const { cursor, limit = '50' } = request.query as { cursor?: string; limit?: string }

    const match = await verifyMatchAccess(matchId, userId)
    if (!match) {
      return reply.code(404).send({ error: AppError.NOT_FOUND })
    }

    const take = Math.min(Number(limit), 100)

    const messages = await prisma.message.findMany({
      where: {
        matchId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    })

    const hasMore = messages.length > take
    const items = hasMore ? messages.slice(0, take) : messages
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null

    return reply.send({
      data: items,
      meta: { hasMore, cursor: nextCursor },
    })
  })

  // POST /messages/:matchId - 메시지 전송 (REST 폴백)
  app.post('/:matchId', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { matchId } = request.params as { matchId: string }
    const { content } = request.body as { content: string }

    if (!content?.trim()) {
      return reply.code(400).send({ error: AppError.INVALID_CONTENT })
    }

    const match = await verifyMatchAccess(matchId, userId)
    if (!match) {
      return reply.code(404).send({ error: AppError.NOT_FOUND })
    }

    const message = await prisma.message.create({
      data: { matchId, senderId: userId, content: content.trim() },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    })

    // 상대방에게 실시간 알림
    const recipientId = match.requesterId === userId ? match.matchedUserId : match.requesterId
    sendToUser(recipientId, { type: 'message', data: message })

    return reply.code(201).send({ data: message })
  })

  // PATCH /messages/:matchId/read - 읽음 처리
  app.patch('/:matchId/read', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { matchId } = request.params as { matchId: string }

    const match = await verifyMatchAccess(matchId, userId)
    if (!match) {
      return reply.code(404).send({ error: AppError.NOT_FOUND })
    }

    // 상대방이 보낸 메시지 중 아직 읽지 않은 것들을 읽음 처리
    const { count } = await prisma.message.updateMany({
      where: {
        matchId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    })

    return reply.send({ data: { updatedCount: count } })
  })
}
