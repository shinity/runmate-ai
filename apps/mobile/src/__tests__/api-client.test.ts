import { api } from '../../lib/api'

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

const SecureStore = require('expo-secure-store')

const mockFetch = jest.fn()
global.fetch = mockFetch

function makeResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  SecureStore.getItemAsync.mockResolvedValue(null)
})

describe('ApiClient.get', () => {
  it('성공 응답 반환', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: { id: '1' } }))

    const result = await api.get('/test')
    expect(result).toEqual({ data: { id: '1' } })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('액세스 토큰이 있으면 Authorization 헤더 포함', async () => {
    SecureStore.getItemAsync.mockResolvedValue('my-access-token')
    mockFetch.mockResolvedValue(makeResponse({ data: {} }))

    await api.get('/me')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-access-token' }),
      })
    )
  })
})

describe('ApiClient 401 처리', () => {
  it('refresh 토큰으로 재시도 성공', async () => {
    SecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === 'access_token') return Promise.resolve('expired-token')
      if (key === 'refresh_token') return Promise.resolve('valid-refresh')
      return Promise.resolve(null)
    })

    mockFetch
      .mockResolvedValueOnce(makeResponse({}, 401))             // 원본 요청 실패
      .mockResolvedValueOnce(makeResponse({ data: { accessToken: 'new-token' } }))  // refresh
      .mockResolvedValueOnce(makeResponse({ data: { id: '1' } }))                  // 재시도

    const result = await api.get('/protected')
    expect(result).toEqual({ data: { id: '1' } })
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'new-token')
  })

  it('refresh 실패 시 Session expired 에러', async () => {
    SecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === 'access_token') return Promise.resolve('expired-token')
      if (key === 'refresh_token') return Promise.resolve('bad-refresh')
      return Promise.resolve(null)
    })

    mockFetch
      .mockResolvedValueOnce(makeResponse({}, 401))
      .mockResolvedValueOnce(makeResponse({}, 401))  // refresh도 실패

    await expect(api.get('/protected')).rejects.toThrow('Session expired')
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2) // access + refresh
  })
})

describe('ApiClient.post', () => {
  it('body를 JSON으로 직렬화', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: { created: true } }))

    await api.post('/runs', { distanceMeters: 5000 })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ distanceMeters: 5000 }),
      })
    )
  })

  it('서버 에러 시 에러 메시지 throw', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: { message: 'EMAIL_TAKEN' } }, 400))

    await expect(api.post('/auth/register', {})).rejects.toThrow('EMAIL_TAKEN')
  })
})
