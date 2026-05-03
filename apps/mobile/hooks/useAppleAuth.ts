import { api, saveTokens } from '../lib/api'
import { useAuthStore } from '../stores/auth'

let AppleAuthentication: any = null
try {
  AppleAuthentication = require('expo-apple-authentication')
} catch {
  // Not available in Expo Go
}

function useAppleAuthNative() {
  const { loadUser } = useAuthStore()

  async function signIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      const data = await api.post<any>('/auth/apple', {
        identityToken: credential.identityToken,
        user: credential.user,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName ?? null,
              familyName: credential.fullName.familyName ?? null,
            }
          : null,
      })

      await saveTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken)
      await loadUser()
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        throw e
      }
    }
  }

  return { signIn, available: true }
}

function useAppleAuthFallback() {
  return { signIn: async () => {}, available: false }
}

export const useAppleAuth = AppleAuthentication ? useAppleAuthNative : useAppleAuthFallback
