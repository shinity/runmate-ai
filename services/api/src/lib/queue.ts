import { Queue } from 'bullmq'

const redisConnection = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}

// Job type definitions
export interface RunAnalysisJob {
  runId: string
  userId: string
}

export interface PlanAdaptationJob {
  planId: string
  userId: string
}

export interface EmbeddingUpdateJob {
  userId: string
}

export interface RouteArtJob {
  runId: string
  userId: string
}

export interface AnimateRouteArtJob {
  runId: string
  userId: string
  backgroundPreset: string  // 'city_night' | 'park' | 'beach' | 'mountain' | 'space' | 'sunset'
  characterPreset: string   // 'runner' | 'ninja' | 'robot' | 'cat' | 'unicorn' | 'astronaut'
  speed: number             // 0.5 ~ 3.0
}

// Queues — third generic is job name type (string keeps it flexible)
export const runAnalysisQueue = new Queue<RunAnalysisJob, void, string>('run-analysis', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})

export const planAdaptationQueue = new Queue<PlanAdaptationJob, void, string>('plan-adaptation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
  },
})

export const embeddingUpdateQueue = new Queue<EmbeddingUpdateJob, void, string>('embedding-update', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
  },
})

export const routeArtQueue = new Queue<RouteArtJob, void, string>('route-art', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    priority: 10,
  },
})

export const animateRouteArtQueue = new Queue<AnimateRouteArtJob, void, string>('animate-route-art', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})
