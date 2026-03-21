import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { api, saveTokens, clearTokens } from '../lib/api'
import type { User } from '@runmate/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isInitialized: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/login',
        { email, password },
      )
      await saveTokens(data.tokens.accessToken, data.tokens.refreshToken)
      set({ user: data.user, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/register',
        { email, password, displayName },
      )
      await saveTokens(data.tokens.accessToken, data.tokens.refreshToken)
      set({ user: data.user, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    await clearTokens()
    set({ user: null, isAuthenticated: false })
  },

  loadUser: async () => {
    const token = await SecureStore.getItemAsync('access_token')
    if (!token) {
      set({ isAuthenticated: false, isInitialized: true })
      return
    }
    try {
      const { data } = await api.get<User>('/users/me')
      set({ user: data, isAuthenticated: true, isInitialized: true })
    } catch {
      set({ isAuthenticated: false, isInitialized: true })
    }
  },

  updateUser: async (data) => {
    const { data: updated } = await api.patch<User>('/users/me', data)
    set({ user: updated })
  },
}))
