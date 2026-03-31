import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useRuns, useRun, useRunDetail, useWeeklyStats, useCreateRun } from '../../../hooks/useRuns'

jest.mock('../../../lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

const { api } = require('../../../lib/api')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useRuns', () => {
  it('런 목록을 정상 조회한다', async () => {
    const mockRuns = [
      { id: 'run1', distanceMeters: 5000, avgPaceSecPerKm: 360, title: '5K Run' },
      { id: 'run2', distanceMeters: 10000, avgPaceSecPerKm: 370, title: '10K Run' },
    ]
    api.get.mockResolvedValue({ data: mockRuns })

    const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockRuns)
    expect(api.get).toHaveBeenCalledWith('/runs?limit=20')
  })

  it('빈 런 목록도 정상 처리한다', async () => {
    api.get.mockResolvedValue({ data: [] })

    const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('API 에러 시 error 상태가 된다', async () => {
    api.get.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useRun', () => {
  it('id가 있을 때 런 상세를 조회한다', async () => {
    const mockRun = { id: 'run1', distanceMeters: 5000 }
    api.get.mockResolvedValue({ data: mockRun })

    const { result } = renderHook(() => useRun('run1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockRun)
    expect(api.get).toHaveBeenCalledWith('/runs/run1')
  })

  it('id가 빈 문자열이면 쿼리를 실행하지 않는다', () => {
    const { result } = renderHook(() => useRun(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(api.get).not.toHaveBeenCalled()
  })
})

describe('useRunDetail', () => {
  it('id가 null이면 쿼리를 실행하지 않는다', () => {
    const { result } = renderHook(() => useRunDetail(null), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('id가 있으면 데이터포인트 포함 상세를 조회한다', async () => {
    const mockDetail = {
      id: 'run1',
      distanceMeters: 5000,
      datapoints: [{ lat: 37.5, lng: 127.0, altitudeM: 10, paceSecPerKm: 360 }],
      splits: [],
    }
    api.get.mockResolvedValue({ data: mockDetail })

    const { result } = renderHook(() => useRunDetail('run1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.datapoints).toHaveLength(1)
  })

  it('options를 전달하면 쿼리 옵션이 적용된다 (refetchInterval 등)', async () => {
    const mockDetail = {
      id: 'run2',
      distanceMeters: 3000,
      routeArtUrl: 'https://example.com/art.svg',
      datapoints: [],
      splits: [],
    }
    api.get.mockResolvedValue({ data: mockDetail })

    const refetchInterval = jest.fn().mockReturnValue(false)
    const { result } = renderHook(
      () => useRunDetail('run2', { refetchInterval }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.routeArtUrl).toBe('https://example.com/art.svg')
    // refetchInterval 콜백이 호출됐는지 확인
    expect(refetchInterval).toHaveBeenCalled()
  })
})

describe('useWeeklyStats', () => {
  it('주간 통계를 조회한다', async () => {
    const mockStats = {
      totalRuns: 5,
      totalDistanceMeters: 40000,
      totalDurationSeconds: 14400,
      avgPaceSecPerKm: 360,
      totalTrainingLoad: 368,
      weekStart: '2026-03-22T00:00:00.000Z',
    }
    api.get.mockResolvedValue({ data: mockStats })

    const { result } = renderHook(() => useWeeklyStats(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.totalRuns).toBe(5)
    expect(result.current.data?.totalDistanceMeters).toBe(40000)
    expect(api.get).toHaveBeenCalledWith('/runs/stats/weekly')
  })
})

describe('useCreateRun', () => {
  it('러닝 생성 성공 시 runs 쿼리가 invalidate된다', async () => {
    const mockRun = { id: 'new-run', distanceMeters: 5000 }
    api.post.mockResolvedValue({ data: mockRun })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useCreateRun(), { wrapper })

    result.current.mutate({
      startedAt: '2026-03-28T07:00:00Z',
      endedAt: '2026-03-28T07:30:00Z',
      durationSeconds: 1800,
      distanceMeters: 5000,
      avgPaceSecPerKm: 360,
      dataSource: 'app_native',
    } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['runs'] })
  })

  it('러닝 생성 성공 시 coaching/insights 쿼리가 invalidate된다', async () => {
    const mockRun = { id: 'new-run', distanceMeters: 5000 }
    api.post.mockResolvedValue({ data: mockRun })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useCreateRun(), { wrapper })

    result.current.mutate({
      startedAt: '2026-03-28T07:00:00Z',
      endedAt: '2026-03-28T07:30:00Z',
      durationSeconds: 1800,
      distanceMeters: 5000,
      avgPaceSecPerKm: 360,
      dataSource: 'app_native',
    } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['coaching', 'insights'] })
  })

  it('러닝 생성 실패 시 error 상태가 된다', async () => {
    api.post.mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useCreateRun(), { wrapper: createWrapper() })

    result.current.mutate({} as any)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toBe('Server error')
  })
})
