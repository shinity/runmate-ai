import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
})

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err)
})

/** BullMQ Queue/Worker에서 사용하는 공유 연결 설정 */
export const redisConnection = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}
