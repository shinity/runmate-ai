import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { registerConnection, removeConnection, sendToUser } from '../lib/websocket'

export async function wsRoutes(app: FastifyInstance) {
  // GET /ws - WebSocket 업그레이드 엔드포인트
  app.get('/ws', { websocket: true }, async (socket, request) => {
    const { token } = request.query as { token?: string }

    // JWT 토큰 검증
    if (!token) {
      socket.send(JSON.stringify({ type: 'error', code: 'UNAUTHORIZED', message: 'Token is required' }))
      socket.close(1008, 'Unauthorized')
      return
    }

    let userId: string
    try {
      const decoded = app.jwt.verify<{ sub: string }>(token)
      userId = decoded.sub
    } catch {
      socket.send(JSON.stringify({ type: 'error', code: 'UNAUTHORIZED', message: 'Invalid token' }))
      socket.close(1008, 'Unauthorized')
      return
    }

    // 연결 등록
    registerConnection(userId, socket)
    app.log.info(`[WS] User ${userId} connected`)

    socket.send(JSON.stringify({ type: 'connected', userId }))

    // 메시지 수신 처리
    socket.on('message', async (rawData: Buffer) => {
      let payload: { type: string; matchId?: string; content?: string }

      try {
        payload = JSON.parse(rawData.toString())
      } catch {
        socket.send(JSON.stringify({ type: 'error', code: 'INVALID_FORMAT', message: 'Invalid JSON format' }))
        return
      }

      if (payload.type === 'message') {
        const { matchId, content } = payload

        if (!matchId || !content?.trim()) {
          socket.send(JSON.stringify({ type: 'error', code: 'INVALID_PAYLOAD', message: 'matchId and content are required' }))
          return
        }

        // 매칭 소유권 검증
        const match = await prisma.runnerMatch.findFirst({
          where: {
            id: matchId,
            OR: [{ requesterId: userId }, { matchedUserId: userId }],
          },
        })

        if (!match) {
          socket.send(JSON.stringify({ type: 'error', code: 'NOT_FOUND', message: 'Match not found' }))
          return
        }

        // DB에 메시지 저장
        const message = await prisma.message.create({
          data: { matchId, senderId: userId, content: content.trim() },
          include: {
            sender: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        })

        // 발신자에게 확인 응답
        socket.send(JSON.stringify({ type: 'message_sent', data: message }))

        // 수신자에게 실시간 전송
        const recipientId = match.requesterId === userId ? match.matchedUserId : match.requesterId
        sendToUser(recipientId, { type: 'message', data: message })
      }
    })

    // 연결 종료 처리
    socket.on('close', () => {
      removeConnection(userId, socket)
      app.log.info(`[WS] User ${userId} disconnected`)
    })

    socket.on('error', (err: Error) => {
      app.log.error(`[WS] Error for user ${userId}: ${err.message}`)
      removeConnection(userId, socket)
    })
  })
}
