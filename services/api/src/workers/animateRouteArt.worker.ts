import { Worker, Job } from 'bullmq'
import { mkdir, writeFile } from 'fs/promises'
import { prisma } from '../lib/prisma'
import { AnimateRouteArtJob } from '../lib/queue'

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

// ─── Background gradients ──────────────────────────────────────────────────

function buildBackgroundDefs(preset: string): string {
  switch (preset) {
    case 'city_night':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0d1b2a"/>
      <stop offset="100%" stop-color="#1b2838"/>
    </linearGradient>
    <pattern id="stars" width="50" height="50" patternUnits="userSpaceOnUse">
      <circle cx="5"  cy="10" r="0.8" fill="#fff" opacity="0.6"/>
      <circle cx="20" cy="3"  r="1"   fill="#fff" opacity="0.5"/>
      <circle cx="35" cy="20" r="0.6" fill="#fff" opacity="0.7"/>
      <circle cx="48" cy="8"  r="0.9" fill="#fff" opacity="0.4"/>
      <circle cx="15" cy="40" r="0.7" fill="#fff" opacity="0.6"/>
      <circle cx="42" cy="38" r="0.5" fill="#fff" opacity="0.5"/>
    </pattern>`
    case 'park':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a8edae"/>
      <stop offset="100%" stop-color="#4caf50"/>
    </linearGradient>`
    case 'beach':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#87ceeb"/>
      <stop offset="60%" stop-color="#20b2aa"/>
      <stop offset="100%" stop-color="#f4d03f"/>
    </linearGradient>`
    case 'mountain':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#b0c4de"/>
      <stop offset="100%" stop-color="#5b7fa6"/>
    </linearGradient>`
    case 'space':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#000000"/>
      <stop offset="100%" stop-color="#0a0020"/>
    </linearGradient>
    <pattern id="stars" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="3"  cy="7"  r="1"   fill="#fff" opacity="0.8"/>
      <circle cx="18" cy="2"  r="1.2" fill="#fff" opacity="0.6"/>
      <circle cx="30" cy="15" r="0.8" fill="#fff" opacity="0.9"/>
      <circle cx="38" cy="5"  r="1"   fill="#fff" opacity="0.5"/>
      <circle cx="12" cy="32" r="0.7" fill="#fff" opacity="0.7"/>
      <circle cx="35" cy="30" r="1.1" fill="#fff" opacity="0.6"/>
      <circle cx="25" cy="22" r="0.6" fill="#fffbcc" opacity="0.8"/>
    </pattern>`
    case 'forest':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1a3d2b"/>
      <stop offset="100%" stop-color="#2d5a1b"/>
    </linearGradient>`
    case 'rain':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#2d4a6e"/>
    </linearGradient>
    <pattern id="rain_drops" width="20" height="20" patternUnits="userSpaceOnUse">
      <line x1="10" y1="0" x2="8" y2="8" stroke="#60a5fa" stroke-width="0.8" opacity="0.5"/>
      <line x1="3" y1="5" x2="1" y2="13" stroke="#60a5fa" stroke-width="0.8" opacity="0.4"/>
      <line x1="17" y1="10" x2="15" y2="18" stroke="#60a5fa" stroke-width="0.8" opacity="0.5"/>
    </pattern>`
    case 'snow':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#dbeafe"/>
      <stop offset="100%" stop-color="#e8f4f8"/>
    </linearGradient>`
    case 'desert':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#c49a3c"/>
      <stop offset="100%" stop-color="#d4a845"/>
    </linearGradient>`
    case 'neon':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1a0030"/>
      <stop offset="100%" stop-color="#2d0050"/>
    </linearGradient>`
    case 'aurora':
      return `
    <linearGradient id="bg_grad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#003340"/>
      <stop offset="50%" stop-color="#004d5e"/>
      <stop offset="100%" stop-color="#003340"/>
    </linearGradient>
    <pattern id="aurora_waves" width="100" height="60" patternUnits="userSpaceOnUse">
      <path d="M0 30 Q25 10 50 30 Q75 50 100 30" stroke="#34d399" stroke-width="2" fill="none" opacity="0.3"/>
      <path d="M0 40 Q25 20 50 40 Q75 60 100 40" stroke="#6ee7b7" stroke-width="1.5" fill="none" opacity="0.2"/>
    </pattern>`
    case 'sunset':
    default:
      return `
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff6b6b"/>
      <stop offset="50%" stop-color="#ff8c00"/>
      <stop offset="100%" stop-color="#ffd700"/>
    </linearGradient>`
  }
}

function buildBackgroundRect(preset: string, W: number, H: number): string {
  const base = `<rect width="${W}" height="${H}" fill="url(#bg_grad)"/>`
  if (preset === 'city_night' || preset === 'space') {
    return base + `<rect width="${W}" height="${H}" fill="url(#stars)"/>`
  }
  if (preset === 'rain') {
    return base + `<rect width="${W}" height="${H}" fill="url(#rain_drops)"/>`
  }
  if (preset === 'aurora') {
    return base + `<rect width="${W}" height="${H}" fill="url(#aurora_waves)"/>`
  }
  return base
}

// ─── Character sprites (SVG group, centered at 0,0) ───────────────────────

function buildCharacterSprite(preset: string): string {
  switch (preset) {
    case 'ninja':
      return `<g id="char">
        <circle cx="0" cy="-18" r="9" fill="#222"/>
        <rect x="-6" y="-9" width="12" height="16" rx="2" fill="#333"/>
        <rect x="-2" y="-20" width="4" height="5" fill="#555"/>
      </g>`
    case 'robot':
      return `<g id="char">
        <rect x="-8" y="-26" width="16" height="14" rx="2" fill="#9e9e9e"/>
        <rect x="-5" y="-22" width="4" height="4" rx="1" fill="#42a5f5"/>
        <rect x="1"  y="-22" width="4" height="4" rx="1" fill="#42a5f5"/>
        <rect x="-6" y="-12" width="12" height="16" rx="1" fill="#bdbdbd"/>
      </g>`
    case 'cat':
      return `<g id="char">
        <circle cx="0" cy="-18" r="9" fill="#ff8f00"/>
        <polygon points="-8,-27 -4,-20 -11,-20" fill="#ff8f00"/>
        <polygon points="8,-27 11,-20 4,-20"   fill="#ff8f00"/>
        <circle cx="-3" cy="-19" r="2" fill="#4a148c"/>
        <circle cx="3"  cy="-19" r="2" fill="#4a148c"/>
        <rect x="-6" y="-9" width="12" height="15" rx="2" fill="#ffa726"/>
      </g>`
    case 'unicorn':
      return `<g id="char">
        <circle cx="0" cy="-18" r="9" fill="#f48fb1"/>
        <polygon points="0,-30 -3,-20 3,-20" fill="#fdd835"/>
        <rect x="-6" y="-9" width="12" height="15" rx="2" fill="#f06292"/>
        <rect x="-3" y="-16" width="6" height="3" rx="1" fill="#ce93d8"/>
      </g>`
    case 'astronaut':
      return `<g id="char">
        <circle cx="0" cy="-18" r="10" fill="#eceff1" stroke="#b0bec5" stroke-width="1.5"/>
        <circle cx="0" cy="-18" r="6"  fill="#90caf9" opacity="0.7"/>
        <rect x="-8" y="-8" width="16" height="18" rx="4" fill="#f5f5f5" stroke="#b0bec5" stroke-width="1"/>
        <rect x="-4" y="-5" width="8" height="4" rx="1" fill="#42a5f5" opacity="0.6"/>
      </g>`
    case 'fox':
      return `<g id="char">
        <circle cx="0" cy="-18" r="8" fill="#fb923c"/>
        <polygon points="-8,-26 -4,-18 0,-22" fill="#fb923c"/>
        <polygon points="8,-26 4,-18 0,-22"   fill="#fb923c"/>
        <circle cx="-3" cy="-19" r="1.5" fill="#1e293b"/>
        <circle cx="3"  cy="-19" r="1.5" fill="#1e293b"/>
        <rect x="-5" y="-10" width="10" height="14" rx="2" fill="#fdba74"/>
      </g>`
    case 'bear':
      return `<g id="char">
        <circle cx="0" cy="-18" r="9" fill="#92400e"/>
        <circle cx="-7" cy="-25" r="3" fill="#92400e"/>
        <circle cx="7"  cy="-25" r="3" fill="#92400e"/>
        <circle cx="-3" cy="-18" r="1.5" fill="#1e293b"/>
        <circle cx="3"  cy="-18" r="1.5" fill="#1e293b"/>
        <ellipse cx="0" cy="-14" rx="2.5" ry="1.5" fill="#fbbf24"/>
        <rect x="-6" y="-9" width="12" height="15" rx="2" fill="#a16207"/>
      </g>`
    case 'dragon':
      return `<g id="char">
        <ellipse cx="0" cy="-17" rx="8" ry="7" fill="#16a34a"/>
        <polygon points="-6,-24 -4,-18 -9,-20" fill="#15803d"/>
        <polygon points="6,-24 4,-18 9,-20"    fill="#15803d"/>
        <circle cx="-3" cy="-18" r="2" fill="#fbbf24"/>
        <circle cx="3"  cy="-18" r="2" fill="#fbbf24"/>
        <rect x="-6" y="-10" width="12" height="15" rx="2" fill="#15803d"/>
      </g>`
    case 'ghost':
      return `<g id="char">
        <ellipse cx="0" cy="-16" rx="9" ry="11" fill="rgba(248,250,252,0.9)"/>
        <circle cx="-3" cy="-18" r="2" fill="#1e293b"/>
        <circle cx="3"  cy="-18" r="2" fill="#1e293b"/>
        <path d="M-3,-12 Q0,-9 3,-12" stroke="#1e293b" stroke-width="1.5" fill="none"/>
        <path d="M-9,-5 Q-6,0 -3,-5 Q0,0 3,-5 Q6,0 9,-5" stroke="rgba(248,250,252,0.9)" stroke-width="2" fill="none"/>
      </g>`
    case 'alien':
      return `<g id="char">
        <ellipse cx="0" cy="-17" rx="9" ry="8" fill="#4ade80"/>
        <ellipse cx="-3" cy="-18" rx="3" ry="2" fill="#1e293b"/>
        <ellipse cx="3"  cy="-18" rx="3" ry="2" fill="#1e293b"/>
        <circle cx="-3" cy="-18" r="1.2" fill="#60a5fa"/>
        <circle cx="3"  cy="-18" r="1.2" fill="#60a5fa"/>
        <path d="-3,-12 Q0,-9 3,-12" stroke="#1e293b" stroke-width="1.5" fill="none"/>
        <rect x="-6" y="-9" width="12" height="14" rx="2" fill="#22c55e"/>
      </g>`
    case 'fire':
      return `<g id="char">
        <path d="M0,-28 Q-2,-20 2,-18 Q-1,-18 0,-14 Q-3,-17 -2,-12 Q-5,-15 -4,-9 Q-6,-7 -5,-3 Q-4,3 0,3 Q4,3 5,-3 Q6,-7 4,-9 Q5,-15 2,-12 Q3,-17 0,-14 Q1,-18 -2,-18 Q2,-20 0,-28Z" fill="#f97316"/>
        <path d="M0,-22 Q-1,-16 1,-14 Q0,-11 0,-8 Q-2,-10 -1,-6 Q1,-4 0,0" stroke="#fbbf24" stroke-width="1" fill="none" opacity="0.7"/>
      </g>`
    case 'runner':
    default:
      return `<g id="char">
        <circle cx="0" cy="-18" r="8" fill="#1565c0"/>
        <rect x="-5" y="-10" width="10" height="14" rx="2" fill="#1976d2"/>
        <circle cx="0" cy="-18" r="4"  fill="#bbdefb"/>
      </g>`
  }
}

// ─── Path building utilities ───────────────────────────────────────────────

function pointsToPathData(points: Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')
}

function calcPathLength(points: Point[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return len
}

// ─── SVG animateMotion builder ─────────────────────────────────────────────

function buildAnimatedSvg(
  points: Point[],
  backgroundPreset: string,
  characterPreset: string,
  speed: number,
): string {
  const W = 512
  const H = 512

  // Total duration in seconds: speed 1x = 6s, 3x = 2s, 0.5x = 12s
  // Formula: duration = 6 / speed (clamped between 2 and 18)
  const durationSec = Math.min(18, Math.max(2, 6 / speed))
  const dur = `${durationSec.toFixed(1)}s`

  const pathData = pointsToPathData(points)
  const pathLength = calcPathLength(points).toFixed(2)

  const bgDefs = buildBackgroundDefs(backgroundPreset)
  const bgRect = buildBackgroundRect(backgroundPreset, W, H)
  const characterSprite = buildCharacterSprite(characterPreset)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${bgDefs}
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="char_shadow">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Background -->
  ${bgRect}

  <!-- Route path shadow (glow effect) -->
  <path id="route_shadow"
    d="${pathData}"
    fill="none"
    stroke="#fff"
    stroke-width="8"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.15"
    filter="url(#glow)"
  />

  <!-- Route path with drawing animation -->
  <path id="route"
    d="${pathData}"
    fill="none"
    stroke="#00d4ff"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-dasharray="${pathLength}"
    stroke-dashoffset="${pathLength}"
    filter="url(#glow)"
  >
    <animate
      attributeName="stroke-dashoffset"
      from="${pathLength}"
      to="0"
      dur="${dur}"
      repeatCount="indefinite"
    />
  </path>

  <!-- Start marker -->
  <circle cx="${points[0].x.toFixed(2)}" cy="${points[0].y.toFixed(2)}" r="6" fill="#00d4ff" opacity="0.9" filter="url(#glow)"/>
  <circle cx="${points[0].x.toFixed(2)}" cy="${points[0].y.toFixed(2)}" r="3" fill="#fff"/>

  <!-- Character moving along route -->
  <g filter="url(#char_shadow)">
    ${characterSprite.replace('<g id="char">', '<g>')}
    <animateMotion dur="${dur}" repeatCount="indefinite" rotate="auto">
      <mpath href="#route"/>
    </animateMotion>
  </g>

  <!-- End marker (fades in) -->
  <circle cx="${points[points.length - 1].x.toFixed(2)}" cy="${points[points.length - 1].y.toFixed(2)}" r="6" fill="#f97316" opacity="0">
    <animate attributeName="opacity" values="0;0;0.9" keyTimes="0;0.9;1" dur="${dur}" repeatCount="indefinite"/>
  </circle>

  <!-- Branding -->
  <text x="${W - 16}" y="${H - 12}" font-family="system-ui,sans-serif" font-size="11" fill="#fff" opacity="0.3" text-anchor="end">RunMate AI</text>
</svg>`
}

// ─── Worker ────────────────────────────────────────────────────────────────

export function startAnimateRouteArtWorker() {
  const worker = new Worker<AnimateRouteArtJob, void, string>(
    'animate-route-art',
    async (job: Job<AnimateRouteArtJob, void, string>) => {
      const { runId, userId, backgroundPreset, characterPreset, speed } = job.data
      console.log(`[AnimateRouteArt] Processing run ${runId}`)

      // 1. Fetch run + datapoints
      const run = await prisma.run.findUniqueOrThrow({
        where: { id: runId },
        include: { datapoints: { orderBy: { timestamp: 'asc' } } },
      })

      const validDatapoints = run.datapoints.filter(
        (d): d is typeof d & { lat: number; lng: number } => d.lat !== null && d.lng !== null,
      )

      if (validDatapoints.length < 2) {
        console.log(`[AnimateRouteArt] Skipped: insufficient valid GPS points (${validDatapoints.length})`)
        await prisma.run.update({
          where: { id: runId },
          data: { animateStatus: 'failed', animateStep: null },
        })
        return
      }

      // 2. Mark as processing
      await prisma.run.update({
        where: { id: runId },
        data: { animateStatus: 'processing', animateStep: 'generating_background' },
      })

      // 3. Normalize GPS points to SVG canvas
      const points = normalizePoints(validDatapoints, 512, 512, 48)

      // 4. Render frames → update step
      await prisma.run.update({
        where: { id: runId },
        data: { animateStep: 'rendering_frames' },
      })

      // 5. Encode as animated SVG (animateMotion) → update step
      await prisma.run.update({
        where: { id: runId },
        data: { animateStep: 'encoding_gif' },
      })

      const svgContent = buildAnimatedSvg(points, backgroundPreset, characterPreset, speed)

      // 6. Write file
      await mkdir(UPLOADS_DIR, { recursive: true })
      const fileName = `animated-route-art-${runId}.svg`
      const filePath = `${UPLOADS_DIR}/${fileName}`
      await writeFile(filePath, svgContent, 'utf-8')

      const artUrl = `${UPLOADS_URL_PREFIX}/${fileName}`

      // 7. Mark completed
      await prisma.run.update({
        where: { id: runId },
        data: {
          animatedRouteArtUrl: artUrl,
          animateStatus: 'completed',
          animateStep: null,
        },
      })

      console.log(`[AnimateRouteArt] Done → ${artUrl}`)
    },
    { connection: redisConnection, concurrency: 2 },
  )

  worker.on('failed', async (job, err) => {
    console.error(`[AnimateRouteArt] Job ${job?.id} failed:`, err.message)
    if (job?.data?.runId) {
      try {
        await prisma.run.update({
          where: { id: job.data.runId },
          data: { animateStatus: 'failed', animateStep: null },
        })
      } catch (updateErr) {
        console.error('[AnimateRouteArt] Failed to update run status on failure:', updateErr)
      }
    }
  })

  return worker
}
