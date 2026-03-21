import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { UpdateUserSchema } from '@runmate/validators'

export async function userRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /users/me
  app.get('/me', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { devices: { where: { isActive: true } } },
      omit: { passwordHash: true },
    })

    if (!user) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })

    return reply.send({ data: user })
  })

  // PATCH /users/me
  app.patch('/me', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    const body = UpdateUserSchema.parse(request.body)

    const user = await prisma.user.update({
      where: { id: userId },
      data: body as any,
      omit: { passwordHash: true },
    })

    return reply.send({ data: user })
  })

  // GET /users/:id - public profile
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        city: true,
        countryCode: true,
        experienceLevel: true,
        primaryGoal: true,
        createdAt: true,
      },
    })

    if (!user) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })

    return reply.send({ data: user })
  })

  // DELETE /users/me
  app.delete('/me', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    await prisma.user.delete({ where: { id: userId } })
    return reply.code(204).send()
  })
}
