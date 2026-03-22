import { useState, useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'

export interface PushNotificationState {
  token: string | null
  permissionStatus: Notifications.PermissionStatus | null
}

/**
 * Expo 푸시 알림 토큰을 등록하고 서버에 전송합니다.
 * 1. requestPermissionsAsync()로 권한 요청
 * 2. getExpoPushTokenAsync()로 토큰 획득
 * 3. /sync/devices/connect API로 토큰 전송
 */
export function usePushNotifications(): PushNotificationState {
  const [token, setToken] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return

    let isMounted = true

    async function registerPushToken() {
      try {
        // Android는 알림 채널 설정 필요
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3b82f6',
          })
        }

        // 권한 요청
        const { status: existingStatus } = await Notifications.getPermissionsAsync()
        let finalStatus = existingStatus

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }

        if (!isMounted) return
        setPermissionStatus(finalStatus)

        if (finalStatus !== 'granted') {
          console.log('[Push] Permission not granted')
          return
        }

        // Expo 푸시 토큰 획득
        const pushTokenResponse = await Notifications.getExpoPushTokenAsync()
        const expoPushToken = pushTokenResponse.data

        if (!isMounted) return
        setToken(expoPushToken)

        // 서버에 pushToken 등록 (app_native 기기 타입으로 등록)
        await api.post('/sync/devices/connect', {
          deviceType: 'app_native',
          deviceId: expoPushToken,
          pushToken: expoPushToken,
        })
      } catch (err) {
        console.error('[Push] Failed to register push token:', err)
      }
    }

    registerPushToken()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  return { token, permissionStatus }
}
