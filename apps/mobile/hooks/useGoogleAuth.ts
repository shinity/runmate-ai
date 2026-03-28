import { useEffect } from 'react'
import { api, saveTokens } from '../lib/api'
import { useAuthStore } from '../stores/auth'

// expo-auth-session requires native modules not available in Expo Go
let Google: any = null
let WebBrowser: any = null
try {
  Google = require('expo-auth-session/providers/google')
  WebBrowser = require('expo-web-browser')
  WebBrowser.maybeCompleteAuthSession()
} catch {
  // Running in Expo Go — Google OAuth unavailable
}

function useGoogleAuthNative() {
  const { loadUser } = useAuthStore()

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  })

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params
      api
        .post<any>('/auth/google', { idToken: id_token })
        .then(async (data: any) => {
          await saveTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken)
          await loadUser()
        })
        .catch(console.error)
    }
  }, [response])

  return { promptAsync, request }
}

function useGoogleAuthFallback() {
  return { promptAsync: () => {}, request: null }
}

export const useGoogleAuth = Google ? useGoogleAuthNative : useGoogleAuthFallback
