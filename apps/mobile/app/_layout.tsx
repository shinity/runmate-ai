import '../global.css'
import { useEffect, useRef } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '../stores/auth'
import { usePushNotifications } from '../hooks/usePushNotifications'

export const unstable_settings = {
  initialRouteName: '(auth)',
}

// 포그라운드 알림 표시 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
})

function AuthGuard() {
  const { isAuthenticated, isInitialized, loadUser, user } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (!isInitialized) return

    const segment = segments[0]
    const inAuthGroup = segment === '(auth)'
    const inOnboardingGroup = segment === '(onboarding)'
    const inTabsGroup = segment === '(tabs)'

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (isAuthenticated && inAuthGroup) {
      if (!user?.experienceLevel) {
        router.replace('/(onboarding)/profile-setup')
      } else {
        router.replace('/(tabs)')
      }
    } else if (isAuthenticated && inOnboardingGroup && user?.experienceLevel) {
      router.replace('/(tabs)')
    } else if (isAuthenticated && inTabsGroup && !user?.experienceLevel) {
      router.replace('/(onboarding)/profile-setup')
    }
  }, [isAuthenticated, isInitialized, segments[0], user?.experienceLevel])

  return null
}

function PushNotificationManager() {
  const router = useRouter()
  const notificationListener = useRef<Notifications.EventSubscription | null>(null)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)

  usePushNotifications()

  useEffect(() => {
    // 앱이 포그라운드 상태일 때 알림 수신
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] Notification received:', notification)
    })

    // 알림 탭 시 화면 이동
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>
      const type = data?.type

      if (type === 'insight') {
        router.push('/(tabs)/coach')
      } else if (type === 'match_request' || type === 'match_accepted') {
        router.push('/(tabs)/match')
      }
    })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [router])

  return null
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AuthGuard />
      <PushNotificationManager />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f8fafc',
          contentStyle: { backgroundColor: '#0f172a' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  )
}
