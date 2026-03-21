import { create } from 'zustand'
import * as Location from 'expo-location'
import type { RunDatapoint } from '@runmate/types'

interface LocationPoint {
  lat: number
  lng: number
  altitudeM: number | null
  timestamp: string
  paceSecPerKm: number | null
}

interface ActiveRunState {
  isRunning: boolean
  isPaused: boolean
  startTime: Date | null
  elapsedSeconds: number
  distanceMeters: number
  datapoints: LocationPoint[]
  currentPaceSecPerKm: number | null
  avgPaceSecPerKm: number | null
  currentHeartRate: number | null

  startRun: () => Promise<void>
  pauseRun: () => void
  resumeRun: () => void
  stopRun: () => LocationPoint[]
  addDatapoint: (point: LocationPoint) => void
  updateHeartRate: (bpm: number) => void
  tick: () => void
}

export const useRunStore = create<ActiveRunState>((set, get) => ({
  isRunning: false,
  isPaused: false,
  startTime: null,
  elapsedSeconds: 0,
  distanceMeters: 0,
  datapoints: [],
  currentPaceSecPerKm: null,
  avgPaceSecPerKm: null,
  currentHeartRate: null,

  startRun: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') throw new Error('Location permission required')

    set({
      isRunning: true,
      isPaused: false,
      startTime: new Date(),
      elapsedSeconds: 0,
      distanceMeters: 0,
      datapoints: [],
      currentPaceSecPerKm: null,
      avgPaceSecPerKm: null,
    })
  },

  pauseRun: () => set({ isPaused: true }),

  resumeRun: () => set({ isPaused: false }),

  stopRun: () => {
    const { datapoints } = get()
    set({
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      distanceMeters: 0,
      datapoints: [],
    })
    return datapoints
  },

  addDatapoint: (point) => {
    const { datapoints } = get()
    const prev = datapoints[datapoints.length - 1]

    let addedDistance = 0
    if (prev) {
      addedDistance = haversineMeters(prev.lat, prev.lng, point.lat, point.lng)
    }

    const newPoints = [...datapoints, point]
    const newDistance = get().distanceMeters + addedDistance

    // Compute avg pace from total distance and elapsed time
    const elapsed = get().elapsedSeconds
    const avgPace = elapsed > 0 && newDistance > 0 ? (elapsed / newDistance) * 1000 : null

    set({
      datapoints: newPoints,
      distanceMeters: newDistance,
      currentPaceSecPerKm: point.paceSecPerKm,
      avgPaceSecPerKm: avgPace ? Math.round(avgPace) : null,
    })
  },

  updateHeartRate: (bpm) => set({ currentHeartRate: bpm }),

  tick: () => {
    const { isPaused } = get()
    if (!isPaused) {
      set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }))
    }
  },
}))

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
