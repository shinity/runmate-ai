import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// expo-router mock
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), navigate: jest.fn() }),
}))

// @expo/vector-icons mock
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}))


// lib/format mock
jest.mock('../../lib/format', () => ({
  formatDistance: (m: number) => `${(m / 1000).toFixed(1)}km`,
}))

// lib/api mock
jest.mock('../../lib/api', () => ({
  api: { get: jest.fn() },
}))

// useInfiniteQuery mock — gallery.tsx가 사용하는 TanStack Query 훅만 교체
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query')
  return { ...actual, useInfiniteQuery: jest.fn() }
})

const { useInfiniteQuery } = require('@tanstack/react-query')

import GalleryScreen from '../../app/(tabs)/gallery'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GalleryScreen', () => {
  it('로딩 중에는 스피너와 텍스트를 표시한다', () => {
    useInfiniteQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    })

    render(<GalleryScreen />, { wrapper: createWrapper() })

    expect(screen.getByText('갤러리를 불러오는 중...')).toBeTruthy()
  })

  it('런이 없을 때 빈 상태 화면과 CTA를 표시한다', () => {
    useInfiniteQuery.mockReturnValue({
      data: { pages: [{ data: [], meta: { hasMore: false } }] },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    })

    render(<GalleryScreen />, { wrapper: createWrapper() })

    expect(screen.getByText('라우트 아트가 없어요')).toBeTruthy()
    expect(screen.getByText('런 시작하기')).toBeTruthy()
  })

  it('routeArtUrl이 있는 런은 거리와 날짜 오버레이를 표시한다', () => {
    useInfiniteQuery.mockReturnValue({
      data: {
        pages: [{
          data: [{
            id: 'run1',
            routeArtUrl: 'https://example.com/art.svg',
            distanceMeters: 5000,
            startedAt: '2026-03-28T07:00:00Z',
            dataSource: 'app_native',
          }],
          meta: { hasMore: false },
        }],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    })

    render(<GalleryScreen />, { wrapper: createWrapper() })

    expect(screen.getByText('5.0km')).toBeTruthy()
    expect(screen.getByText('나의 라우트 아트')).toBeTruthy()
  })

  it('routeArtUrl 없고 GPS 있는 런은 "생성 중..." 텍스트를 표시한다', () => {
    useInfiniteQuery.mockReturnValue({
      data: {
        pages: [{
          data: [{
            id: 'run2',
            routeArtUrl: null,
            distanceMeters: 3000,
            startedAt: '2026-03-27T07:00:00Z',
            dataSource: 'app_native',
          }],
          meta: { hasMore: false },
        }],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    })

    render(<GalleryScreen />, { wrapper: createWrapper() })

    expect(screen.getByText('생성 중...')).toBeTruthy()
  })

  it('dataSource가 manual인 런은 "GPS 없음" 텍스트를 표시한다', () => {
    useInfiniteQuery.mockReturnValue({
      data: {
        pages: [{
          data: [{
            id: 'run3',
            routeArtUrl: null,
            distanceMeters: 2000,
            startedAt: '2026-03-26T07:00:00Z',
            dataSource: 'manual',
          }],
          meta: { hasMore: false },
        }],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    })

    render(<GalleryScreen />, { wrapper: createWrapper() })

    expect(screen.getByText('GPS 없음')).toBeTruthy()
  })
})
