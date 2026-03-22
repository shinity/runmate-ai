import { prisma } from './prisma'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default'
  badge?: number
}

/**
 * Expo Push API로 메시지를 배치 전송합니다.
 * 최대 100개씩 나눠 전송하며, 에러는 로그만 기록합니다.
 */
export async function sendPushNotification(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return

  const BATCH_SIZE = 100
  const batches: PushMessage[][] = []

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    batches.push(messages.slice(i, i + BATCH_SIZE))
  }

  const accessToken = process.env.EXPO_ACCESS_TOKEN

  for (const batch of batches) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      }

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error(`[Push] Expo API error ${res.status}: ${text}`)
        return
      }

      const result = await res.json()
      const tickets = result.data ?? []

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i]
        if (ticket.status === 'error') {
          console.error(`[Push] Ticket error for token ${batch[i]?.to}: ${ticket.message}`)
        }
      }
    } catch (err) {
      console.error('[Push] Failed to send push notification batch:', err)
    }
  }
}

/**
 * userId로 해당 유저의 활성 기기 pushToken을 조회 후 알림을 전송합니다.
 * pushToken이 없는 기기는 스킵합니다.
 */
export async function sendToUser(
  userId: string,
  notification: Omit<PushMessage, 'to'>,
): Promise<void> {
  const devices = await prisma.connectedDevice.findMany({
    where: { userId, isActive: true, pushToken: { not: null } },
    select: { pushToken: true },
  })

  const messages: PushMessage[] = devices
    .filter((d): d is typeof d & { pushToken: string } => d.pushToken !== null)
    .map((d) => ({
      to: d.pushToken,
      ...notification,
    }))

  await sendPushNotification(messages)
}
