import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp, signToken } from '../test/app'
import { prisma } from '../lib/prisma'

const USER_ID = 'user-1'
const DEVICE_DB_ID = 'device-db-1'

const mockDevice = {
  id: DEVICE_DB_ID,
  userId: USER_ID,
  deviceType: 'apple_watch',
  deviceId: 'watch-abc123',
  accessToken: '',
  refreshToken: '',
  isActive: true,
  syncedAt: new Date('2024-01-01T09:00:00Z'),
  pushToken: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('Sync Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let token: string

  beforeEach(async () => {
    app = await buildApp()
    token = signToken(app, USER_ID)
    vi.clearAllMocks()
  })

  // ─── GET /api/v1/sync/status ──────────────────────────────────────────────

  describe('GET /api/v1/sync/status', () => {
    it('활성 기기 목록과 동기화 상태를 반환한다', async () => {
      vi.mocked(prisma.connectedDevice.findMany).mockResolvedValue([mockDevice] as any)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/sync/status',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(1)
      expect(res.json().data[0].deviceType).toBe('apple_watch')
      expect(res.json().data[0].status).toBe('idle')
      expect(res.json().data[0].lastSyncedAt).toBeTruthy()
    })

    it('기기가 없으면 빈 배열을 반환한다', async () => {
      vi.mocked(prisma.connectedDevice.findMany).mockResolvedValue([])

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/sync/status',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data).toHaveLength(0)
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/sync/status',
      })

      expect(res.statusCode).toBe(401)
    })
  })

  // ─── POST /api/v1/sync/devices/connect ───────────────────────────────────

  describe('POST /api/v1/sync/devices/connect', () => {
    it('기기를 등록하고 201을 반환한다', async () => {
      vi.mocked(prisma.connectedDevice.upsert).mockResolvedValue(mockDevice as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/devices/connect',
        headers: { authorization: `Bearer ${token}` },
        payload: { deviceType: 'apple_watch', deviceId: 'watch-abc123' },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.deviceType).toBe('apple_watch')
    })

    it('pushToken을 포함해서 등록한다', async () => {
      const deviceWithToken = { ...mockDevice, pushToken: 'expo-push-token-xyz' }
      vi.mocked(prisma.connectedDevice.upsert).mockResolvedValue(deviceWithToken as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/devices/connect',
        headers: { authorization: `Bearer ${token}` },
        payload: { deviceType: 'app_native', deviceId: 'phone-1', pushToken: 'expo-push-token-xyz' },
      })

      expect(res.statusCode).toBe(201)
      expect(prisma.connectedDevice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ pushToken: 'expo-push-token-xyz' }),
        }),
      )
    })

    it('이미 존재하는 기기는 upsert로 재활성화한다', async () => {
      vi.mocked(prisma.connectedDevice.upsert).mockResolvedValue({ ...mockDevice, isActive: true } as any)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/devices/connect',
        headers: { authorization: `Bearer ${token}` },
        payload: { deviceType: 'apple_watch', deviceId: 'watch-abc123' },
      })

      expect(res.statusCode).toBe(201)
      expect(prisma.connectedDevice.upsert).toHaveBeenCalled()
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/devices/connect',
        payload: { deviceType: 'apple_watch', deviceId: 'watch-abc123' },
      })

      expect(res.statusCode).toBe(401)
    })
  })

  // ─── POST /api/v1/sync/devices/:id/sync ──────────────────────────────────

  describe('POST /api/v1/sync/devices/:id/sync', () => {
    it('수동 동기화를 트리거하고 sync_queued를 반환한다', async () => {
      vi.mocked(prisma.connectedDevice.findFirst).mockResolvedValue(mockDevice as any)
      vi.mocked(prisma.connectedDevice.update).mockResolvedValue({ ...mockDevice, syncedAt: new Date() } as any)

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/sync/devices/${DEVICE_DB_ID}/sync`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.status).toBe('sync_queued')
      expect(res.json().data.deviceId).toBe(DEVICE_DB_ID)
    })

    it('다른 사용자의 기기이면 404를 반환한다', async () => {
      vi.mocked(prisma.connectedDevice.findFirst).mockResolvedValue(null)

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/sync/devices/${DEVICE_DB_ID}/sync`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(404)
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/sync/devices/${DEVICE_DB_ID}/sync`,
      })

      expect(res.statusCode).toBe(401)
    })
  })

  // ─── DELETE /api/v1/sync/devices/:id ─────────────────────────────────────

  describe('DELETE /api/v1/sync/devices/:id', () => {
    it('기기 연결을 해제하고 204를 반환한다', async () => {
      vi.mocked(prisma.connectedDevice.updateMany).mockResolvedValue({ count: 1 } as any)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/sync/devices/${DEVICE_DB_ID}`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(204)
      expect(prisma.connectedDevice.updateMany).toHaveBeenCalledWith({
        where: { id: DEVICE_DB_ID, userId: USER_ID },
        data: { isActive: false },
      })
    })

    it('인증 없이 접근하면 401을 반환한다', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/sync/devices/${DEVICE_DB_ID}`,
      })

      expect(res.statusCode).toBe(401)
    })
  })
})
