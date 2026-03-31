import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { Alert, TouchableOpacity } from 'react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// expo-router mock
const mockReplace = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'run-123' }),
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}))

// @expo/vector-icons mock
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))

// hooks/useRuns mock
jest.mock('../../hooks/useRuns', () => ({
  useRunDetail: jest.fn(),
  useCreateAnimation: jest.fn(),
  useAnimateStatus: jest.fn(),
}))

const { useRunDetail, useCreateAnimation, useAnimateStatus } = require('../../hooks/useRuns')

const mockRun = {
  id: 'run-123',
  distanceMeters: 5000,
  durationSeconds: 1800,
  avgPaceSecPerKm: 360,
  routeArtUrl: 'https://example.com/art.svg',
  startedAt: '2026-03-28T07:00:00Z',
  datapoints: [],
  splits: [],
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockReplace.mockClear()
  mockBack.mockClear()
})

// ─── AnimateScreen ──────────────────────────────────────────────────────────

import AnimateScreen from '../../app/route-art/[id]/animate'

describe('AnimateScreen', () => {
  beforeEach(() => {
    useRunDetail.mockReturnValue({ data: mockRun, isLoading: false })
    useCreateAnimation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false })
  })

  it('헤더 타이틀을 표시한다', () => {
    render(<AnimateScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('애니메이션 만들기')).toBeTruthy()
  })

  it('배경 스타일 6종을 표시한다', () => {
    render(<AnimateScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('도시 야경')).toBeTruthy()
    expect(screen.getByText('공원')).toBeTruthy()
    expect(screen.getByText('해변')).toBeTruthy()
    expect(screen.getByText('산길')).toBeTruthy()
    expect(screen.getByText('우주')).toBeTruthy()
    expect(screen.getByText('일몰')).toBeTruthy()
  })

  it('캐릭터 6종을 표시한다', () => {
    render(<AnimateScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('러너')).toBeTruthy()
    expect(screen.getByText('닌자')).toBeTruthy()
    expect(screen.getByText('로봇')).toBeTruthy()
    expect(screen.getByText('고양이')).toBeTruthy()
    expect(screen.getByText('유니콘')).toBeTruthy()
    expect(screen.getByText('우주인')).toBeTruthy()
  })

  it('생성하기 버튼 탭 시 mutateAsync 호출 후 progress로 이동한다', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({})
    useCreateAnimation.mockReturnValue({ mutateAsync, isPending: false })

    render(<AnimateScreen />, { wrapper: createWrapper() })
    fireEvent.press(screen.getByText('생성하기'))

    await new Promise((r) => setTimeout(r, 0))
    expect(mutateAsync).toHaveBeenCalledWith({
      backgroundPreset: 'city_night',
      characterPreset: 'runner',
      speed: 1.0,
    })
    expect(mockReplace).toHaveBeenCalledWith('/route-art/run-123/animate/progress')
  })

  it('생성 중(isPending)일 때 버튼이 비활성화된다', () => {
    useCreateAnimation.mockReturnValue({ mutateAsync: jest.fn(), isPending: true })

    const { UNSAFE_getAllByType } = render(<AnimateScreen />, { wrapper: createWrapper() })
    const touchables = UNSAFE_getAllByType(TouchableOpacity)
    const createBtn = touchables[touchables.length - 1]
    expect(createBtn.props.disabled).toBe(true)
  })

  it('mutateAsync 실패 시 Alert를 표시한다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    const mutateAsync = jest.fn().mockRejectedValue(new Error('network error'))
    useCreateAnimation.mockReturnValue({ mutateAsync, isPending: false })

    render(<AnimateScreen />, { wrapper: createWrapper() })
    fireEvent.press(screen.getByText('생성하기'))

    await new Promise((r) => setTimeout(r, 0))
    expect(alertSpy).toHaveBeenCalledWith('오류', expect.stringContaining('실패'))
  })
})

// ─── AnimateProgressScreen ───────────────────────────────────────────────────

import AnimateProgressScreen from '../../app/route-art/[id]/animate/progress'

describe('AnimateProgressScreen', () => {
  it('생성 중 상태에서 기본 메시지를 표시한다', () => {
    useAnimateStatus.mockReturnValue({
      data: { status: 'processing', step: null, animatedRouteArtUrl: null },
      isError: false,
    })

    render(<AnimateProgressScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('생성 중...')).toBeTruthy()
  })

  it('generating_background 단계 메시지를 표시한다', () => {
    useAnimateStatus.mockReturnValue({
      data: { status: 'processing', step: 'generating_background', animatedRouteArtUrl: null },
      isError: false,
    })

    render(<AnimateProgressScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('배경 생성 중...')).toBeTruthy()
  })

  it('rendering_frames 단계 메시지를 표시한다', () => {
    useAnimateStatus.mockReturnValue({
      data: { status: 'processing', step: 'rendering_frames', animatedRouteArtUrl: null },
      isError: false,
    })

    render(<AnimateProgressScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('프레임 렌더링 중...')).toBeTruthy()
  })

  it('completed 상태 시 result 화면으로 이동한다', () => {
    useAnimateStatus.mockReturnValue({
      data: { status: 'completed', step: null, animatedRouteArtUrl: 'https://example.com/anim.svg' },
      isError: false,
    })

    render(<AnimateProgressScreen />, { wrapper: createWrapper() })
    expect(mockReplace).toHaveBeenCalledWith('/route-art/run-123/animate/result')
  })

  it('failed 상태 시 에러 메시지와 다시 시도 버튼을 표시한다', () => {
    useAnimateStatus.mockReturnValue({
      data: { status: 'failed', step: null, animatedRouteArtUrl: null },
      isError: false,
    })

    render(<AnimateProgressScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('생성 실패')).toBeTruthy()
    expect(screen.getByText('다시 시도')).toBeTruthy()
  })

  it('"다시 시도" 탭 시 animate 화면으로 이동한다', () => {
    useAnimateStatus.mockReturnValue({
      data: { status: 'failed', step: null, animatedRouteArtUrl: null },
      isError: false,
    })

    render(<AnimateProgressScreen />, { wrapper: createWrapper() })
    fireEvent.press(screen.getByText('다시 시도'))
    expect(mockReplace).toHaveBeenCalledWith('/route-art/run-123/animate')
  })

  it('"취소" 탭 시 route-art 상세로 이동한다', () => {
    useAnimateStatus.mockReturnValue({
      data: { status: 'processing', step: null, animatedRouteArtUrl: null },
      isError: false,
    })

    render(<AnimateProgressScreen />, { wrapper: createWrapper() })
    fireEvent.press(screen.getByText('취소'))
    expect(mockReplace).toHaveBeenCalledWith('/route-art/run-123')
  })
})

// ─── AnimateResultScreen ─────────────────────────────────────────────────────

import AnimateResultScreen from '../../app/route-art/[id]/animate/result'

const mockAnimatedRun = {
  ...mockRun,
  animatedRouteArtUrl: 'https://example.com/animated-art.svg',
}

describe('AnimateResultScreen', () => {
  beforeEach(() => {
    useRunDetail.mockReturnValue({ data: mockAnimatedRun, isLoading: false, isError: false })
  })

  it('헤더 타이틀을 표시한다', () => {
    render(<AnimateResultScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('나의 애니메이션')).toBeTruthy()
  })

  it('런 요약 정보를 표시한다', () => {
    render(<AnimateResultScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('거리')).toBeTruthy()
    expect(screen.getByText('시간')).toBeTruthy()
    expect(screen.getByText('평균 페이스')).toBeTruthy()
  })

  it('로딩 중 스피너를 표시한다', () => {
    useRunDetail.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<AnimateResultScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('불러오는 중...')).toBeTruthy()
  })

  it('에러 시 오류 메시지를 표시한다', () => {
    useRunDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<AnimateResultScreen />, { wrapper: createWrapper() })
    expect(screen.getByText('데이터를 불러오지 못했습니다.')).toBeTruthy()
  })

  it('"다시 만들기" 탭 시 animate 화면으로 이동한다', () => {
    render(<AnimateResultScreen />, { wrapper: createWrapper() })
    fireEvent.press(screen.getByText('다시 만들기'))
    expect(mockReplace).toHaveBeenCalledWith('/route-art/run-123/animate')
  })
})
