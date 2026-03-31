import { renderHook, act } from '@testing-library/react-native'
import { Alert } from 'react-native'

// react-native-view-shot mock
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(),
}))

// expo-media-library mock
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn(),
}))

const { captureRef } = require('react-native-view-shot')
const MediaLibrary = require('expo-media-library')

import { useSaveImage } from '../../hooks/useSaveImage'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useSaveImage', () => {
  it('초기 상태에서 isSaving이 false이다', () => {
    const { result } = renderHook(() => useSaveImage())
    expect(result.current.isSaving).toBe(false)
  })

  it('viewRef가 존재한다', () => {
    const { result } = renderHook(() => useSaveImage())
    expect(result.current.viewRef).toBeDefined()
  })

  it('saveToLibrary: viewRef가 null이면 null을 반환한다', async () => {
    const { result } = renderHook(() => useSaveImage())
    // viewRef.current는 기본값 null
    const ret = await act(async () => result.current.saveToLibrary())
    expect(ret).toBeNull()
  })

  it('saveToLibrary: 권한 거부 시 Alert를 표시하고 null을 반환한다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'denied' })

    const { result } = renderHook(() => useSaveImage())
    // viewRef.current에 임의 값 주입
    ;(result.current.viewRef as any).current = {}

    const ret = await act(async () => result.current.saveToLibrary())
    expect(ret).toBeNull()
    expect(alertSpy).toHaveBeenCalledWith('권한 필요', expect.any(String))
  })

  it('saveToLibrary: 성공 시 저장 완료 Alert를 표시하고 uri를 반환한다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'granted' })
    captureRef.mockResolvedValue('file:///tmp/capture.png')
    MediaLibrary.saveToLibraryAsync.mockResolvedValue(undefined)

    const { result } = renderHook(() => useSaveImage())
    ;(result.current.viewRef as any).current = {}

    const ret = await act(async () => result.current.saveToLibrary())
    expect(ret).toBe('file:///tmp/capture.png')
    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///tmp/capture.png')
    expect(alertSpy).toHaveBeenCalledWith('저장 완료', expect.any(String))
  })

  it('saveToLibrary: 캡처 실패 시 저장 실패 Alert를 표시한다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'granted' })
    captureRef.mockRejectedValue(new Error('capture error'))

    const { result } = renderHook(() => useSaveImage())
    ;(result.current.viewRef as any).current = {}

    const ret = await act(async () => result.current.saveToLibrary())
    expect(ret).toBeNull()
    expect(alertSpy).toHaveBeenCalledWith('저장 실패', expect.any(String))
  })

  it('captureAsUri: viewRef가 null이면 null을 반환한다', async () => {
    const { result } = renderHook(() => useSaveImage())
    const ret = await act(async () => result.current.captureAsUri())
    expect(ret).toBeNull()
  })

  it('captureAsUri: 성공 시 uri를 반환한다', async () => {
    captureRef.mockResolvedValue('file:///tmp/capture.png')

    const { result } = renderHook(() => useSaveImage())
    ;(result.current.viewRef as any).current = {}

    const ret = await act(async () => result.current.captureAsUri())
    expect(ret).toBe('file:///tmp/capture.png')
  })

  it('captureAsUri: 캡처 실패 시 null을 반환한다', async () => {
    captureRef.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useSaveImage())
    ;(result.current.viewRef as any).current = {}

    const ret = await act(async () => result.current.captureAsUri())
    expect(ret).toBeNull()
  })
})
