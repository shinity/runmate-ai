import { act } from 'react'
import { useRunStore } from '../../stores/run'

// expo-location mock
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}))

function getStore() {
  return useRunStore.getState()
}

function resetStore() {
  useRunStore.setState({
    isRunning: false,
    isPaused: false,
    startTime: null,
    elapsedSeconds: 0,
    distanceMeters: 0,
    datapoints: [],
    currentPaceSecPerKm: null,
    avgPaceSecPerKm: null,
    currentHeartRate: null,
  })
}

beforeEach(() => {
  resetStore()
})

describe('startRun', () => {
  it('위치 권한 허용 시 런 시작', async () => {
    await act(async () => {
      await getStore().startRun()
    })
    const s = getStore()
    expect(s.isRunning).toBe(true)
    expect(s.isPaused).toBe(false)
    expect(s.startTime).not.toBeNull()
    expect(s.distanceMeters).toBe(0)
    expect(s.datapoints).toHaveLength(0)
  })

  it('위치 권한 거부 시 에러', async () => {
    const { requestForegroundPermissionsAsync } = require('expo-location')
    requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' })

    await expect(getStore().startRun()).rejects.toThrow('Location permission required')
    expect(getStore().isRunning).toBe(false)
  })
})

describe('pauseRun / resumeRun', () => {
  it('일시정지 및 재개', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => { getStore().pauseRun() })
    expect(getStore().isPaused).toBe(true)
    act(() => { getStore().resumeRun() })
    expect(getStore().isPaused).toBe(false)
  })
})

describe('tick', () => {
  it('실행 중에 elapsedSeconds 증가', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => { getStore().tick() })
    act(() => { getStore().tick() })
    expect(getStore().elapsedSeconds).toBe(2)
  })

  it('일시정지 중에는 증가하지 않음', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => { getStore().pauseRun() })
    act(() => { getStore().tick() })
    expect(getStore().elapsedSeconds).toBe(0)
  })
})

describe('addDatapoint', () => {
  it('첫 번째 포인트는 거리 0', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => {
      getStore().addDatapoint({ lat: 37.5, lng: 127.0, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: 360 })
    })
    expect(getStore().distanceMeters).toBe(0)
    expect(getStore().datapoints).toHaveLength(1)
    expect(getStore().currentPaceSecPerKm).toBe(360)
  })

  it('두 번째 포인트에서 거리 계산', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => {
      getStore().addDatapoint({ lat: 37.5000, lng: 127.0000, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: null })
      getStore().addDatapoint({ lat: 37.5009, lng: 127.0000, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: 350 })
    })
    expect(getStore().distanceMeters).toBeGreaterThan(0)
    expect(getStore().datapoints).toHaveLength(2)
  })
})

describe('stopRun', () => {
  it('런 정지 후 상태 초기화, datapoints 반환', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => {
      getStore().addDatapoint({ lat: 37.5, lng: 127.0, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: 360 })
    })
    let returned: ReturnType<typeof getStore.prototype.stopRun>
    act(() => { returned = getStore().stopRun() })
    expect(returned!).toHaveLength(1)
    expect(getStore().isRunning).toBe(false)
    expect(getStore().datapoints).toHaveLength(0)
    expect(getStore().elapsedSeconds).toBe(0)
  })
})
