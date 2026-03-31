import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { Share, Alert, TouchableOpacity } from 'react-native'

// expo-router mock
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'run-123' }),
  useRouter: () => ({ back: mockBack }),
}))

// @expo/vector-icons mock
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}))


// lib/format mock
jest.mock('../../lib/format', () => ({
  formatDistance: (m: number) => `${(m / 1000).toFixed(1)}km`,
  formatDuration: (s: number) => `${Math.floor(s / 60)}분`,
  formatPace: (s: number) => `${Math.floor(s / 60)}'${(s % 60).toString().padStart(2, '0')}"`,
}))

// hooks/useRuns mock
jest.mock('../../hooks/useRuns', () => ({
  useRunDetail: jest.fn(),
}))

// RunDetailModal mock — jest.mock 팩토리 내에서는 require로 접근
jest.mock('../../components/RunDetailModal', () => {
  return function MockRunDetailModal() {
    const { Text } = require('react-native')
    return require('react').createElement(Text, null, '런 상세 모달')
  }
})

const { useRunDetail } = require('../../hooks/useRuns')

import RouteArtDetailScreen from '../../app/route-art/[id]'

const mockRun = {
  id: 'run-123',
  distanceMeters: 7100,
  durationSeconds: 2100,
  avgPaceSecPerKm: 295,
  routeArtUrl: 'https://example.com/route-art.svg',
  startedAt: '2026-03-28T07:00:00Z',
  title: '아침 달리기',
  datapoints: [],
  splits: [],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockBack.mockClear()
})

describe('RouteArtDetailScreen', () => {
  it('로딩 중에는 스피너를 표시한다', () => {
    useRunDetail.mockReturnValue({ data: undefined, isLoading: true, isError: false })

    render(<RouteArtDetailScreen />)

    expect(screen.getByText('불러오는 중...')).toBeTruthy()
  })

  it('에러 시 오류 메시지와 뒤로가기 버튼을 표시한다', () => {
    useRunDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true })

    render(<RouteArtDetailScreen />)

    expect(screen.getByText('데이터를 불러오지 못했습니다.')).toBeTruthy()
    expect(screen.getByText('뒤로 가기')).toBeTruthy()
  })

  it('런 데이터가 있으면 헤더 타이틀과 요약 정보를 표시한다', () => {
    useRunDetail.mockReturnValue({ data: mockRun, isLoading: false, isError: false })

    render(<RouteArtDetailScreen />)

    expect(screen.getByText('라우트 아트')).toBeTruthy()
    expect(screen.getByText('7.1km')).toBeTruthy()
    expect(screen.getByText('35분')).toBeTruthy()
  })

  it('routeArtUrl이 없으면 "라우트 아트 없음" placeholder를 표시한다', () => {
    useRunDetail.mockReturnValue({
      data: { ...mockRun, routeArtUrl: undefined },
      isLoading: false,
      isError: false,
    })

    render(<RouteArtDetailScreen />)

    expect(screen.getByText('라우트 아트 없음')).toBeTruthy()
  })

  it('"런 상세 보기" 버튼을 탭하면 RunDetailModal이 표시된다', () => {
    useRunDetail.mockReturnValue({ data: mockRun, isLoading: false, isError: false })

    render(<RouteArtDetailScreen />)

    fireEvent.press(screen.getByText('런 상세 보기'))
    expect(screen.getByText('런 상세 모달')).toBeTruthy()
  })

  it('공유 버튼 탭 시 Share.share를 호출한다', async () => {
    useRunDetail.mockReturnValue({ data: mockRun, isLoading: false, isError: false })
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any)

    const { UNSAFE_getAllByType } = render(<RouteArtDetailScreen />)
    const touchables = UNSAFE_getAllByType(TouchableOpacity)
    // 헤더 순서: [0]뒤로가기 [1]저장 [2]공유 [3]런상세보기
    fireEvent.press(touchables[2])

    await new Promise((r) => setTimeout(r, 0))
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('km') }),
    )
  })

  it('뒤로가기 버튼 탭 시 router.back을 호출한다', () => {
    useRunDetail.mockReturnValue({ data: mockRun, isLoading: false, isError: false })

    const { UNSAFE_getAllByType } = render(<RouteArtDetailScreen />)
    const touchables = UNSAFE_getAllByType(TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(mockBack).toHaveBeenCalled()
  })
})
