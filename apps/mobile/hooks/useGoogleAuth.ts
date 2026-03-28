import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { useEffect } from 'react'
import { api, saveTokens } from '../lib/api'
import { useAuthStore } from '../stores/auth'

WebBrowser.maybeCompleteAuthSession()

export function useGoogleAuth() {
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
