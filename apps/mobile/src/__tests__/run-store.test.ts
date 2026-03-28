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

  it('일시정지 중에도 isRunning은 true 유지', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => { getStore().pauseRun() })
    expect(getStore().isPaused).toBe(true)
    expect(getStore().isRunning).toBe(true)
  })

  it('재개 후 isRunning true, isPaused false', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => { getStore().pauseRun() })
    act(() => { getStore().resumeRun() })
    expect(getStore().isRunning).toBe(true)
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

  it('포인트가 3개 이상일 때 거리가 누적된다', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => {
      getStore().addDatapoint({ lat: 37.5000, lng: 127.0000, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: null })
      getStore().addDatapoint({ lat: 37.5009, lng: 127.0000, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: 350 })
    })
    const distAfterTwo = getStore().distanceMeters
    act(() => {
      getStore().addDatapoint({ lat: 37.5018, lng: 127.0000, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: 345 })
    })
    expect(getStore().distanceMeters).toBeGreaterThan(distAfterTwo)
    expect(getStore().datapoints).toHaveLength(3)
  })

  it('pace가 있을 때 avgPaceSecPerKm을 계산한다', async () => {
    await act(async () => { await getStore().startRun() })
    // elapsed를 먼저 올려야 avgPace 계산 가능
    act(() => { getStore().tick() })  // elapsedSeconds = 1
    act(() => {
      getStore().addDatapoint({ lat: 37.5000, lng: 127.0000, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: null })
      getStore().addDatapoint({ lat: 37.5009, lng: 127.0000, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: 350 })
    })
    // distanceMeters > 0 이고 elapsedSeconds > 0 이면 avgPaceSecPerKm이 계산됨
    expect(getStore().avgPaceSecPerKm).not.toBeNull()
    expect(getStore().avgPaceSecPerKm).toBeGreaterThan(0)
  })
})

describe('stopRun', () => {
  it('런 정지 후 상태 초기화, datapoints 반환', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => {
      getStore().addDatapoint({ lat: 37.5, lng: 127.0, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: 360 })
    })
    let returned: ReturnType<ReturnType<typeof getStore>['stopRun']>
    act(() => { returned = getStore().stopRun() })
    expect(returned!).toHaveLength(1)
    expect(getStore().isRunning).toBe(false)
    expect(getStore().datapoints).toHaveLength(0)
    expect(getStore().elapsedSeconds).toBe(0)
  })

  it('stopRun 반환값에 기록된 datapoint 좌표가 포함된다', async () => {
    await act(async () => { await getStore().startRun() })
    const ts = new Date().toISOString()
    act(() => {
      getStore().addDatapoint({ lat: 37.5, lng: 127.0, altitudeM: 50, timestamp: ts, paceSecPerKm: 360 })
      getStore().addDatapoint({ lat: 37.5009, lng: 127.0, altitudeM: 52, timestamp: ts, paceSecPerKm: 355 })
    })
    let returned: ReturnType<ReturnType<typeof getStore>['stopRun']>
    act(() => { returned = getStore().stopRun() })
    expect(returned!).toHaveLength(2)
    expect(returned![0].lat).toBe(37.5)
    expect(returned![1].lat).toBe(37.5009)
  })

  it('stopRun 후 distanceMeters가 0으로 초기화된다', async () => {
    await act(async () => { await getStore().startRun() })
    act(() => {
      getStore().addDatapoint({ lat: 37.5000, lng: 127.0000, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: null })
      getStore().addDatapoint({ lat: 37.5009, lng: 127.0000, altitudeM: null, timestamp: new Date().toISOString(), paceSecPerKm: 350 })
    })
    expect(getStore().distanceMeters).toBeGreaterThan(0)
    act(() => { getStore().stopRun() })
    expect(getStore().distanceMeters).toBe(0)
  })
})
