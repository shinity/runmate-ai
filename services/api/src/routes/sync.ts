import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { runAnalysisQueue } from '../lib/queue'
import { AppError } from '../lib/errors'

export async function syncRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /sync/status
  app.get('/status', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub

    const devices = await prisma.connectedDevice.findMany({
      where: { userId, isActive: true },
      select: { id: true, deviceType: true, syncedAt: true },
    })

    return reply.send({
      data: devices.map((d) => ({
        deviceId: d.id,
        deviceType: d.deviceType,
        lastSyncedAt: d.syncedAt?.toISOString() ?? null,
        status: 'idle',
        errorMessage: null,
      })),
    })
  })

  // POST /devices/connect - register a wearable device
  app.post('/devices/connect', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { deviceType, deviceId, pushToken } = request.body as {
      deviceType: string
      deviceId: string
      pushToken?: string
    }

    const device = await prisma.connectedDevice.upsert({
      where: { userId_deviceType_deviceId: { userId, deviceType: deviceType as any, deviceId } },
      update: { isActive: true, ...(pushToken !== undefined && { pushToken }) },
      create: {
        userId,
        deviceType: deviceType as any,
        deviceId,
        accessToken: '',
        refreshToken: '',
        ...(pushToken !== undefined && { pushToken }),
      },
    })

    return reply.code(201).send({ data: device })
  })

  // POST /devices/:id/sync - trigger manual sync
  app.post('/devices/:id/sync', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { id } = request.params as { id: string }

    const device = await prisma.connectedDevice.findFirst({
      where: { id, userId },
    })

    if (!device) {
      return reply.code(404).send({ error: AppError.NOT_FOUND })
    }

    // Update sync timestamp
    await prisma.connectedDevice.update({ where: { id }, data: { syncedAt: new Date() } })

    return reply.send({ data: { deviceId: id, status: 'sync_queued' } })
  })

  // DELETE /devices/:id
  app.delete('/devices/:id', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { id } = request.params as { id: string }

    await prisma.connectedDevice.updateMany({
      where: { id, userId },
      data: { isActive: false },
    })

    return reply.code(204).send()
  })
}
