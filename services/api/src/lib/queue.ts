import { Queue } from 'bullmq'
import { redis } from './redis'

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

// Queues
export const runAnalysisQueue = new Queue<RunAnalysisJob>('run-analysis', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})

export const planAdaptationQueue = new Queue<PlanAdaptationJob>('plan-adaptation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
  },
})

export const embeddingUpdateQueue = new Queue<EmbeddingUpdateJob>('embedding-update', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
  },
})

export const routeArtQueue = new Queue<RouteArtJob>('route-art', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    priority: 10, // lower priority than coaching
  },
})
