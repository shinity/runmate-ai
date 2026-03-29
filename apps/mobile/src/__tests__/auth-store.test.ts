import { act } from 'react'
import { useAuthStore } from '../../stores/auth'

// expo-secure-store mock
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

// API mock
jest.mock('../../lib/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
  saveTokens: jest.fn(),
  clearTokens: jest.fn(),
}))

const { api, saveTokens, clearTokens } = require('../../lib/api')

function getStore() {
  return useAuthStore.getState()
}

function resetStore() {
  useAuthStore.setState({ user: null, isLoading: false, isAuthenticated: false })
}

beforeEach(() => {
  resetStore()
  jest.clearAllMocks()
})

describe('login', () => {
  it('로그인 성공 시 user 및 isAuthenticated 설정', async () => {
    const mockUser = { id: 'u1', email: 'test@example.com', displayName: 'Test' }
    api.post.mockResolvedValue({ data: { user: mockUser, tokens: { accessToken: 'at', refreshToken: 'rt' } } })
    api.get.mockResolvedValue({ data: mockUser })

    await act(async () => {
      await getStore().login('test@example.com', 'password123')
    })

    expect(getStore().user).toEqual(mockUser)
    expect(getStore().isAuthenticated).toBe(true)
    expect(getStore().isLoading).toBe(false)
    expect(saveTokens).toHaveBeenCalledWith('at', 'rt')
  })

  it('로그인 실패 시 isLoading 복원', async () => {
    api.post.mockRejectedValue(new Error('Invalid credentials'))

    await expect(
      act(async () => { await getStore().login('bad@example.com', 'wrong') })
    ).rejects.toThrow()

    expect(getStore().isLoading).toBe(false)
    expect(getStore().isAuthenticated).toBe(false)
  })
})

describe('register', () => {
  it('회원가입 성공 시 user 설정', async () => {
    const mockUser = { id: 'u2', email: 'new@example.com', displayName: 'New User' }
    api.post.mockResolvedValue({ data: { user: mockUser, tokens: { accessToken: 'at2', refreshToken: 'rt2' } } })
    api.get.mockResolvedValue({ data: mockUser })

    await act(async () => {
      await getStore().register('new@example.com', 'pass123', 'New User')
    })

    expect(getStore().user).toEqual(mockUser)
    expect(getStore().isAuthenticated).toBe(true)
    expect(saveTokens).toHaveBeenCalledWith('at2', 'rt2')
  })

  it('이메일 중복 시 에러 코드 객체를 그대로 throw한다', async () => {
    const error = { error: { code: 'EMAIL_TAKEN', message: '이미 사용 중인 이메일이에요.' } }
    api.post.mockRejectedValue(error)

    await expect(
      act(async () => { await getStore().register('taken@example.com', 'pass123', 'Test') })
    ).rejects.toMatchObject({ error: { code: 'EMAIL_TAKEN' } })

    expect(getStore().isAuthenticated).toBe(false)
    expect(getStore().user).toBeNull()
  })
})

describe('logout', () => {
  it('로그아웃 시 상태 초기화', async () => {
    useAuthStore.setState({ user: { id: 'u1' } as any, isAuthenticated: true })

    await act(async () => { await getStore().logout() })

    expect(getStore().user).toBeNull()
    expect(getStore().isAuthenticated).toBe(false)
    expect(clearTokens).toHaveBeenCalled()
  })
})

describe('loadUser', () => {
  it('토큰 유효 시 user 로드', async () => {
    const SecureStore = require('expo-secure-store')
    SecureStore.getItemAsync.mockResolvedValue('valid-token')
    const mockUser = { id: 'u1', email: 'test@example.com', displayName: 'Test' }
    api.get.mockResolvedValue({ data: mockUser })

    await act(async () => { await getStore().loadUser() })

    expect(getStore().user).toEqual(mockUser)
    expect(getStore().isAuthenticated).toBe(true)
    expect(getStore().isInitialized).toBe(true)
  })

  it('토큰 만료 시 isAuthenticated false, isInitialized true', async () => {
    const SecureStore = require('expo-secure-store')
    SecureStore.getItemAsync.mockResolvedValue('expired-token')
    api.get.mockRejectedValue(new Error('Session expired'))

    await act(async () => { await getStore().loadUser() })

    expect(getStore().isAuthenticated).toBe(false)
    expect(getStore().isInitialized).toBe(true)
  })

  it('저장된 토큰이 없으면 isAuthenticated false, isInitialized true', async () => {
    const SecureStore = require('expo-secure-store')
    SecureStore.getItemAsync.mockResolvedValue(null)

    await act(async () => { await getStore().loadUser() })

    expect(getStore().isAuthenticated).toBe(false)
    expect(getStore().isInitialized).toBe(true)
    expect(api.get).not.toHaveBeenCalled()
  })
})

describe('updateUser', () => {
  it('성공 시 store의 user 업데이트', async () => {
    const updated = { id: 'u1', email: 'test@example.com', displayName: '수정된이름' }
    api.patch = jest.fn().mockResolvedValue({ data: updated })

    await act(async () => {
      await getStore().updateUser({ displayName: '수정된이름' })
    })

    expect(getStore().user).toEqual(updated)
  })

  it('실패 시 에러를 throw하고 user는 변경되지 않는다', async () => {
    const error = { error: { code: 'VALIDATION_ERROR', message: '입력 정보를 다시 확인해주세요.' } }
    api.patch = jest.fn().mockRejectedValue(error)
    useAuthStore.setState({ user: { id: 'u1', displayName: 'Original' } as any, isAuthenticated: true })

    await expect(
      act(async () => { await getStore().updateUser({ displayName: '' }) })
    ).rejects.toMatchObject({ error: { code: 'VALIDATION_ERROR' } })

    expect(getStore().user?.displayName).toBe('Original')
  })
})
