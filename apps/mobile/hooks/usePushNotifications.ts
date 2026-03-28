import { useState, useEffect } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'

export interface PushNotificationState {
  token: string | null
  permissionStatus: string | null
}

const isExpoGo = Constants.appOwnership === 'expo'

export function usePushNotifications(): PushNotificationState {
  const [token, setToken] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || isExpoGo) return

    let isMounted = true

    async function registerPushToken() {
      try {
        const Notifications = require('expo-notifications')

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3b82f6',
          })
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync()
        let finalStatus = existingStatus

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }

        if (!isMounted) return
        setPermissionStatus(finalStatus)

        if (finalStatus !== 'granted') return

        const pushTokenResponse = await Notifications.getExpoPushTokenAsync()
        const expoPushToken = pushTokenResponse.data

        if (!isMounted) return
        setToken(expoPushToken)

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
    return () => { isMounted = false }
  }, [isAuthenticated])

  return { token, permissionStatus }
}
