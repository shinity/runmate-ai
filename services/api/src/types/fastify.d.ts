import { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider> {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>
  }

  interface FastifyRequest {
    user: { sub: string; email?: string; type?: string }
  }
}
