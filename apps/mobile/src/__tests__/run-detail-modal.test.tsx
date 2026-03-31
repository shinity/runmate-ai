import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}))

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))
jest.mock('expo-constants', () => ({ default: { appOwnership: 'expo' } }))
jest.mock('../../components/ShareRunButton', () => 'ShareRunButton')

jest.mock('../../hooks/useRuns', () => ({
  useRunDetail: jest.fn(),
}))

const { useRunDetail } = require('../../hooks/useRuns')

const mockRun = {
  id: 'run-123',
  title: '아침 런',
  distanceMeters: 5000,
  durationSeconds: 1800,
  avgPaceSecPerKm: 360,
  elevationGainMeters: 0,
  routeArtUrl: null,
  datapoints: [],
  splits: [],
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

import RunDetailModal from '../../components/RunDetailModal'

const mockOnClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

describe('RunDetailModal', () => {
  it('로딩 중 스피너를 표시한다', () => {
    useRunDetail.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<RunDetailModal runId="run-123" onClose={mockOnClose} />, { wrapper: createWrapper() })
    expect(screen.getByText('데이터를 불러오는 중...')).toBeTruthy()
  })

  it('에러 시 오류 메시지를 표시한다', () => {
    useRunDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<RunDetailModal runId="run-123" onClose={mockOnClose} />, { wrapper: createWrapper() })
    expect(screen.getByText('데이터를 불러오지 못했습니다.')).toBeTruthy()
  })

  it('런 데이터가 있으면 헤더 타이틀을 표시한다', () => {
    useRunDetail.mockReturnValue({ data: mockRun, isLoading: false, isError: false })
    render(<RunDetailModal runId="run-123" onClose={mockOnClose} />, { wrapper: createWrapper() })
    expect(screen.getByText('아침 런')).toBeTruthy()
  })

  it('routeArtUrl이 없고 datapoints < 2이면 라우트 아트 섹션을 표시하지 않는다', () => {
    useRunDetail.mockReturnValue({ data: mockRun, isLoading: false, isError: false })
    render(<RunDetailModal runId="run-123" onClose={mockOnClose} />, { wrapper: createWrapper() })
    expect(screen.queryByText('라우트 아트')).toBeNull()
  })

  it('datapoints >= 2이면 생성 중 메시지를 표시한다', () => {
    const runWithDatapoints = { ...mockRun, datapoints: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }] }
    useRunDetail.mockReturnValue({ data: runWithDatapoints, isLoading: false, isError: false })
    render(<RunDetailModal runId="run-123" onClose={mockOnClose} />, { wrapper: createWrapper() })
    expect(screen.getByText('라우트 아트를 만들고 있어요...')).toBeTruthy()
  })

  it('routeArtUrl이 있으면 "상세 보기" 링크를 표시한다', () => {
    const runWithArt = { ...mockRun, routeArtUrl: 'https://example.com/art.svg' }
    useRunDetail.mockReturnValue({ data: runWithArt, isLoading: false, isError: false })
    render(<RunDetailModal runId="run-123" onClose={mockOnClose} />, { wrapper: createWrapper() })
    expect(screen.getByText('상세 보기')).toBeTruthy()
  })

  it('"상세 보기" 탭 시 onClose 후 route-art 상세로 이동한다', () => {
    const runWithArt = { ...mockRun, routeArtUrl: 'https://example.com/art.svg' }
    useRunDetail.mockReturnValue({ data: runWithArt, isLoading: false, isError: false })
    render(<RunDetailModal runId="run-123" onClose={mockOnClose} />, { wrapper: createWrapper() })
    fireEvent.press(screen.getByText('상세 보기'))
    expect(mockOnClose).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/route-art/run-123')
  })

  it('라우트 아트 이미지 탭 시 onClose 후 route-art 상세로 이동한다', () => {
    const { TouchableOpacity } = require('react-native')
    const runWithArt = { ...mockRun, routeArtUrl: 'https://example.com/art.svg' }
    useRunDetail.mockReturnValue({ data: runWithArt, isLoading: false, isError: false })
    const { UNSAFE_getAllByType } = render(
      <RunDetailModal runId="run-123" onClose={mockOnClose} />,
      { wrapper: createWrapper() },
    )
    // [0]=닫기, [1]=상세보기, [2]=이미지 TouchableOpacity
    const touchables = UNSAFE_getAllByType(TouchableOpacity)
    fireEvent.press(touchables[2])
    expect(mockOnClose).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/route-art/run-123')
  })

  it('스플릿이 있으면 km별 페이스 섹션을 표시한다', () => {
    const runWithSplits = {
      ...mockRun,
      splits: [
        { splitNumber: 1, paceSecPerKm: 350, heartRate: null },
        { splitNumber: 2, paceSecPerKm: 360, heartRate: null },
      ],
    }
    useRunDetail.mockReturnValue({ data: runWithSplits, isLoading: false, isError: false })
    render(<RunDetailModal runId="run-123" onClose={mockOnClose} />, { wrapper: createWrapper() })
    expect(screen.getByText('km별 페이스')).toBeTruthy()
    expect(screen.getByText('1km')).toBeTruthy()
    expect(screen.getByText('2km')).toBeTruthy()
  })

  it('라우트 아트 섹션이 스플릿 섹션보다 먼저 렌더링된다', () => {
    const runFull = {
      ...mockRun,
      routeArtUrl: 'https://example.com/art.svg',
      splits: [{ splitNumber: 1, paceSecPerKm: 350, heartRate: null }],
    }
    useRunDetail.mockReturnValue({ data: runFull, isLoading: false, isError: false })
    const { toJSON } = render(<RunDetailModal runId="run-123" onClose={mockOnClose} />, {
      wrapper: createWrapper(),
    })
    const json = JSON.stringify(toJSON())
    // "라우트 아트"가 "km별 페이스"보다 먼저 나와야 함
    expect(json.indexOf('라우트 아트')).toBeLessThan(json.indexOf('km별 페이스'))
  })
})
