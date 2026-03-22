import type { WebSocket } from '@fastify/websocket'

// Map<userId, Set<WebSocket>>
const connections = new Map<string, Set<WebSocket>>()

export function registerConnection(userId: string, ws: WebSocket): void {
  if (!connections.has(userId)) {
    connections.set(userId, new Set())
  }
  connections.get(userId)!.add(ws)
}

export function removeConnection(userId: string, ws: WebSocket): void {
  const userConnections = connections.get(userId)
  if (!userConnections) return

  userConnections.delete(ws)
  if (userConnections.size === 0) {
    connections.delete(userId)
  }
}

export function sendToUser(userId: string, payload: object): void {
  const userConnections = connections.get(userId)
  if (!userConnections) return

  const message = JSON.stringify(payload)
  for (const ws of userConnections) {
    try {
      ws.send(message)
    } catch {
      // 전송 실패한 소켓은 무시 (이미 닫힌 경우)
    }
  }
}
