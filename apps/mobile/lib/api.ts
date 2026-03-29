import * as SecureStore from 'expo-secure-store'
import type { ApiResponse, ApiError } from '@runmate/types'

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync('access_token')
}

async function saveTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync('access_token', accessToken),
    SecureStore.setItemAsync('refresh_token', refreshToken),
  ])
}

async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync('access_token'),
    SecureStore.deleteItemAsync('refresh_token'),
  ])
}

class ApiClient {
  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = await getAccessToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

    if (res.status === 401 && !path.startsWith('/auth/')) {
      // Attempt token refresh (skip for auth endpoints)
      const refreshToken = await SecureStore.getItemAsync('refresh_token')
      if (refreshToken) {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (refreshRes.ok) {
          const { data } = await refreshRes.json()
          await saveTokens(data.accessToken, data.refreshToken ?? refreshToken)
          headers['Authorization'] = `Bearer ${data.accessToken}`
          const retryRes = await fetch(`${API_BASE}${path}`, { ...options, headers })
          const retryJson = await retryRes.json()
          if (!retryRes.ok) {
            throw retryJson
          }
          return retryJson
        }
      }
      await clearTokens()
      throw { error: { code: 'INVALID_TOKEN', message: '인증이 만료되었어요. 다시 로그인해주세요.' } }
    }

    const json = await res.json()
    if (!res.ok) {
      throw json
    }

    return json
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' })
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}

export const api = new ApiClient()
export { saveTokens, clearTokens }
