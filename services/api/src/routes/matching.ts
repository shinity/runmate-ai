import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { embeddingUpdateQueue } from '../lib/queue'
import { findSimilarRunnersFromPinecone } from '../workers/embeddingSearch'
import { UpdateMatchProfileSchema, CreateGroupSchema } from '@runmate/validators'
import { sendToUser } from '../lib/push'

export async function matchRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /match/profile
  app.get('/profile', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub

    let profile = await prisma.matchProfile.findUnique({ where: { userId } })

    if (!profile) {
      // Auto-create from user's run history
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
      const recentRuns = await prisma.run.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: { avgPaceSecPerKm: true, distanceMeters: true, startedAt: true },
      })

      const avgPace = recentRuns.length
        ? recentRuns.reduce((s, r) => s + r.avgPaceSecPerKm, 0) / recentRuns.length
        : 360
      const avgDist = recentRuns.length
        ? recentRuns.reduce((s, r) => s + r.distanceMeters, 0) / recentRuns.length / 1000
        : 5

      profile = await prisma.matchProfile.create({
        data: {
          userId,
          avgPaceSecPerKm: Math.round(avgPace),
          avgWeeklyKm: avgDist * 3,
          preferredDistanceKm: avgDist,
        },
      })
    }

    return reply.send({ data: profile })
  })

  // PATCH /match/profile
  app.patch('/profile', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const body = UpdateMatchProfileSchema.parse(request.body)

    const profile = await prisma.matchProfile.upsert({
      where: { userId },
      update: body,
      create: { userId, avgPaceSecPerKm: 360, avgWeeklyKm: 15, preferredDistanceKm: 5, ...body },
    })

    await embeddingUpdateQueue.add('update', { userId })

    return reply.send({ data: profile })
  })

  // GET /match/suggestions - ranked suggestions based on similarity
  app.get('/suggestions', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub

    const myProfile = await prisma.matchProfile.findUnique({ where: { userId } })
    if (!myProfile) {
      return reply.send({ data: [] })
    }

    // Pinecone 우선 시도 → 실패/미설정 시 DB 폴백
    const pineconeResults = await findSimilarRunnersFromPinecone(userId, 20)

    if (pineconeResults !== null && pineconeResults.length > 0) {
      // Pinecone 결과: userId 배열 → DB에서 user + matchProfile 조회
      const similarUserIds = pineconeResults.map((r) => r.userId)

      const profilesFromDb = await prisma.matchProfile.findMany({
        where: { userId: { in: similarUserIds } },
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true, city: true, experienceLevel: true },
          },
        },
      })

      // Pinecone 순서(유사도 순) 보존을 위해 similarityScore 매핑
      const scoreMap = new Map(pineconeResults.map((r) => [r.userId, r.similarityScore]))

      const suggestions = profilesFromDb
        .map((c) => {
          const similarityScore = scoreMap.get(c.userId) ?? 0
          return {
            user: c.user,
            matchProfile: {
              avgPaceSecPerKm: c.avgPaceSecPerKm,
              avgWeeklyKm: c.avgWeeklyKm,
              runningStyle: c.runningStyle,
              preferredRunTime: c.preferredRunTime,
            },
            compatibility: {
              pace: Math.round(similarityScore * 100) / 100,
              schedule: 0.7,
              goal: 0.8,
              style: c.runningStyle === myProfile.runningStyle ? 1 : 0.5,
              overall: Math.round(similarityScore * 0.85 * 100) / 100,
            },
          }
        })
        .sort((a, b) => b.compatibility.overall - a.compatibility.overall)
        .slice(0, 5)

      return reply.send({ data: suggestions })
    }

    // DB 폴백: 페이스 차이 기반 매칭
    const candidates = await prisma.matchProfile.findMany({
      where: {
        userId: { not: userId },
        avgPaceSecPerKm: {
          gte: myProfile.avgPaceSecPerKm - myProfile.maxPaceDifferenceSecPerKm,
          lte: myProfile.avgPaceSecPerKm + myProfile.maxPaceDifferenceSecPerKm,
        },
      },
      take: 20,
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true, city: true, experienceLevel: true },
        },
      },
    })

    const suggestions = candidates
      .map((c) => {
        const paceDiff = Math.abs(c.avgPaceSecPerKm - myProfile.avgPaceSecPerKm)
        const paceSimilarity = 1 - paceDiff / myProfile.maxPaceDifferenceSecPerKm
        return {
          user: c.user,
          matchProfile: {
            avgPaceSecPerKm: c.avgPaceSecPerKm,
            avgWeeklyKm: c.avgWeeklyKm,
            runningStyle: c.runningStyle,
            preferredRunTime: c.preferredRunTime,
          },
          compatibility: {
            pace: Math.round(paceSimilarity * 100) / 100,
            schedule: 0.7,
            goal: 0.8,
            style: c.runningStyle === myProfile.runningStyle ? 1 : 0.5,
            overall: Math.round(paceSimilarity * 0.85 * 100) / 100,
          },
        }
      })
      .sort((a, b) => b.compatibility.overall - a.compatibility.overall)
      .slice(0, 5)

    return reply.send({ data: suggestions })
  })

  // POST /match/request/:userId
  app.post('/request/:targetId', { ...authenticate }, async (request, reply) => {
    const requesterId = (request.user as any).sub
    const { targetId } = request.params as { targetId: string }

    if (requesterId === targetId) {
      return reply.code(400).send({ error: { code: 'INVALID_REQUEST', message: 'Cannot match with yourself' } })
    }

    const existing = await prisma.runnerMatch.findFirst({
      where: {
        OR: [
          { requesterId, matchedUserId: targetId },
          { requesterId: targetId, matchedUserId: requesterId },
        ],
      },
    })

    if (existing) {
      return reply.code(409).send({ error: { code: 'ALREADY_MATCHED', message: 'Match already exists' } })
    }

    const match = await prisma.runnerMatch.create({
      data: { requesterId, matchedUserId: targetId },
    })

    // Notify target user about the new match request (non-blocking)
    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { displayName: true },
    })
    sendToUser(targetId, {
      title: '새 러닝메이트 요청',
      body: `${requester?.displayName ?? '누군가'}님이 러닝메이트를 요청했습니다`,
      data: { type: 'match_request', matchId: match.id },
      sound: 'default',
    }).catch((err) => console.error('[Match] Push notification failed:', err))

    return reply.code(201).send({ data: match })
  })

  // PATCH /match/:matchId - accept or decline
  app.patch('/:matchId', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { matchId } = request.params as { matchId: string }
    const { status } = request.body as { status: 'accepted' | 'declined' }

    const match = await prisma.runnerMatch.findFirst({
      where: { id: matchId, matchedUserId: userId, status: 'pending' },
    })

    if (!match) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Match request not found' } })
    }

    const updated = await prisma.runnerMatch.update({
      where: { id: matchId },
      data: { status, respondedAt: new Date() },
    })

    // Notify requester if request was accepted (non-blocking)
    if (status === 'accepted') {
      const responder = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      })
      sendToUser(match.requesterId, {
        title: '러닝메이트 요청 수락',
        body: `${responder?.displayName ?? '상대방'}님이 러닝메이트 요청을 수락했습니다`,
        data: { type: 'match_accepted', matchId },
        sound: 'default',
      }).catch((err) => console.error('[Match] Push notification failed:', err))
    }

    return reply.send({ data: updated })
  })

  // GET /match/requests - received pending requests
  app.get('/requests', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub

    const requests = await prisma.runnerMatch.findMany({
      where: { matchedUserId: userId, status: 'pending' },
      include: {
        requester: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { matchedAt: 'desc' },
    })

    return reply.send({ data: requests })
  })

  // GET /match/active
  app.get('/active', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub

    const matches = await prisma.runnerMatch.findMany({
      where: {
        status: 'active',
        OR: [{ requesterId: userId }, { matchedUserId: userId }],
      },
      include: {
        requester: { select: { id: true, displayName: true, avatarUrl: true } },
        matchedUser: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    })

    return reply.send({ data: matches })
  })

  // ─── Groups ──────────────────────────────────────────────────────────────

  // GET /groups
  app.get('/groups', async (request, reply) => {
    const groups = await prisma.runnerGroup.findMany({
      where: { isPublic: true },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return reply.send({ data: groups })
  })

  // POST /groups
  app.post('/groups', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const body = CreateGroupSchema.parse(request.body)

    const group = await prisma.runnerGroup.create({
      data: {
        ...body,
        createdBy: userId,
        members: { create: { userId, role: 'admin' } },
      },
    })

    return reply.code(201).send({ data: group })
  })

  // POST /groups/:id/join
  app.post('/groups/:id/join', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { id } = request.params as { id: string }

    const group = await prisma.runnerGroup.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    })

    if (!group) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Group not found' } })
    if (group._count.members >= group.maxMembers) {
      return reply.code(400).send({ error: { code: 'GROUP_FULL', message: 'Group is full' } })
    }

    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId, groupId: id } },
      update: {},
      create: { userId, groupId: id },
    })

    return reply.code(204).send()
  })
}
