import { useState, useEffect, useRef, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

const WS_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1')
  .replace(/^http/, 'ws')
  .replace('/api/v1', '')

export interface MessageSender {
  id: string
  displayName: string
  avatarUrl: string | null
}

export interface Message {
  id: string
  matchId: string
  senderId: string
  content: string
  readAt: string | null
  createdAt: string
  sender: MessageSender
}

export function useMessages(matchId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  const queryClient = useQueryClient()

  // REST API로 히스토리 로드
  const { data: history } = useQuery({
    queryKey: ['messages', matchId],
    queryFn: async () => {
      const { data } = await api.get<Message[]>(`/messages/${matchId}`)
      return data
    },
    enabled: !!matchId,
  })

  // 히스토리 로드 시 messages state 초기화 (오래된 것이 앞에 오도록 역순)
  useEffect(() => {
    if (history) {
      setMessages([...history].reverse())
    }
  }, [history])

  const connect = useCallback(async () => {
    if (!isMountedRef.current) return

    const token = await SecureStore.getItemAsync('access_token')
    if (!token) return

    // 기존 연결 정리
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!isMountedRef.current) return
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return

      let payload: { type: string; data?: Message }
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }

      if (payload.type === 'message' && payload.data?.matchId === matchId) {
        setMessages((prev) => [...prev, payload.data!])
      } else if (payload.type === 'message_sent' && payload.data) {
        setMessages((prev) => [...prev, payload.data!])
        queryClient.invalidateQueries({ queryKey: ['messages', matchId] })
      }
    }

    ws.onclose = () => {
      if (!isMountedRef.current) return
      setIsConnected(false)

      // 3초 후 재연결
      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) connect()
      }, 3000)
    }

    ws.onerror = () => {
      if (!isMountedRef.current) return
      setIsConnected(false)
    }
  }, [matchId, queryClient])

  useEffect(() => {
    isMountedRef.current = true
    connect()

    return () => {
      isMountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return

      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', matchId, content }))
      } else {
        // WebSocket 연결이 없을 때 REST 폴백
        api.post(`/messages/${matchId}`, { content }).catch(() => {})
      }
    },
    [matchId],
  )

  return { messages, sendMessage, isConnected }
}
