import { Worker, Job } from 'bullmq'
import { mkdir, writeFile } from 'fs/promises'
import { prisma } from '../lib/prisma'
import { RouteArtJob } from '../lib/queue'

const redisConnection = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/app/uploads'
const UPLOADS_URL_PREFIX = process.env.UPLOADS_URL_PREFIX ?? '/uploads'

interface Point { x: number; y: number }

function normalizePoints(
  datapoints: { lat: number; lng: number }[],
  width: number,
  height: number,
  padding: number,
): Point[] {
  const lats = datapoints.map((d) => d.lat)
  const lngs = datapoints.map((d) => d.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const rangeX = maxLng - minLng || 0.001
  const rangeY = maxLat - minLat || 0.001
  const scale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeY)
  const offsetX = (width - rangeX * scale) / 2
  const offsetY = (height - rangeY * scale) / 2
  return datapoints.map((d) => ({
    x: (d.lng - minLng) * scale + offsetX,
    y: height - ((d.lat - minLat) * scale + offsetY),
  }))
}

function buildSvg(
  points: Point[],
  distanceKm: number,
  paceSecPerKm: number | null,
  city: string | null,
): string {
  const W = 512, H = 512
  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const km = distanceKm.toFixed(2)
  const pace = paceSecPerKm
    ? `${Math.floor(paceSecPerKm / 60)}:${String(paceSecPerKm % 60).padStart(2, '0')}/km`
    : null
  const locationText = city ?? ''
  const start = points[0]
  const end = points[points.length - 1]
  const subText = [pace, locationText].filter(Boolean).join('  ·  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="sglow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a14"/>
    </radialGradient>
    <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="16" cy="16" r="0.8" fill="#fff" opacity="0.06"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="16"/>
  <rect width="${W}" height="${H}" fill="url(#dots)" rx="16"/>
  <path d="${pathData}" fill="none" stroke="#a855f7" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.25" filter="url(#sglow)"/>
  <path d="${pathData}" fill="none" stroke="url(#rg)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
  <circle cx="${start.x.toFixed(1)}" cy="${start.y.toFixed(1)}" r="7" fill="#00d4ff" opacity="0.9" filter="url(#glow)"/>
  <circle cx="${start.x.toFixed(1)}" cy="${start.y.toFixed(1)}" r="3" fill="#fff"/>
  <circle cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="7" fill="#f97316" opacity="0.9" filter="url(#glow)"/>
  <circle cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="3" fill="#fff"/>
  <text x="24" y="${H - 48}" font-family="system-ui,sans-serif" font-size="28" font-weight="700" fill="#fff" opacity="0.95">${km} km</text>
  ${subText ? `<text x="24" y="${H - 20}" font-family="system-ui,sans-serif" font-size="14" fill="#a0aec0" opacity="0.8">${subText}</text>` : ''}
  <text x="${W - 20}" y="${H - 20}" font-family="system-ui,sans-serif" font-size="11" fill="#fff" opacity="0.25" text-anchor="end">RunMate</text>
</svg>`
}

export function startRouteArtWorker() {
  const worker = new Worker<RouteArtJob, void, string>(
    'route-art',
    async (job: Job<RouteArtJob, void, string>) => {
      const { runId, userId } = job.data
      console.log(`[RouteArt] Processing run ${runId}`)

      const run = await prisma.run.findUniqueOrThrow({
        where: { id: runId },
        include: { datapoints: { orderBy: { timestamp: 'asc' } } },
      })

      if (run.datapoints.length < 2) {
        console.log(`[RouteArt] Skipped: insufficient datapoints (${run.datapoints.length})`)
        return
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { city: true },
      })

      const validDatapoints = run.datapoints.filter(
        (d): d is typeof d & { lat: number; lng: number } => d.lat !== null && d.lng !== null,
      )
      if (validDatapoints.length < 2) {
        console.log(`[RouteArt] Skipped: insufficient valid GPS points`)
        return
      }
      const points = normalizePoints(validDatapoints, 512, 512, 48)
      const distanceKm = run.distanceMeters / 1000
      const svg = buildSvg(points, distanceKm, run.avgPaceSecPerKm, user?.city ?? null)

      await mkdir(UPLOADS_DIR, { recursive: true })
      const fileName = `route-art-${runId}.svg`
      await writeFile(`${UPLOADS_DIR}/${fileName}`, svg, 'utf-8')

      const artUrl = `${UPLOADS_URL_PREFIX}/${fileName}`
      await prisma.run.update({ where: { id: runId }, data: { routeArtUrl: artUrl } })

      console.log(`[RouteArt] Done → ${artUrl}`)
    },
    { connection: redisConnection, concurrency: 2 },
  )

  worker.on('failed', (job, err) => {
    console.error(`[RouteArt] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
