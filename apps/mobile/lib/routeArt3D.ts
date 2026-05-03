import * as THREE from 'three'

export interface DataPoint {
  lat: number | null
  lng: number | null
  altitudeM: number | null
  paceSecPerKm: number | null
}

export interface ScenePoint {
  x: number
  y: number // elevation
  z: number
  pace: number
}

export function normalizeToScene(datapoints: DataPoint[]): ScenePoint[] {
  const valid = datapoints.filter(
    (d): d is DataPoint & { lat: number; lng: number } => d.lat !== null && d.lng !== null,
  )
  if (valid.length < 2) return []

  const lats = valid.map((d) => d.lat)
  const lngs = valid.map((d) => d.lng)
  const minLat = Math.min(...lats),
    maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs)
  const rangeX = maxLng - minLng || 0.001
  const rangeY = maxLat - minLat || 0.001
  const scale = Math.min(2.2 / rangeX, 1.6 / rangeY)
  const offsetX = -(rangeX * scale) / 2
  const offsetZ = -(rangeY * scale) / 2

  const alts = valid.map((d) => d.altitudeM ?? 0)
  const minAlt = Math.min(...alts),
    maxAlt = Math.max(...alts)
  const altRange = maxAlt - minAlt || 1

  return valid.map((d) => ({
    x: (d.lng - minLng) * scale + offsetX,
    y: (((d.altitudeM ?? minAlt) - minAlt) / altRange) * 0.18 + 0.02,
    z: -((d.lat - minLat) * scale + offsetZ),
    pace: d.paceSecPerKm ?? 330,
  }))
}

export function paceToColor(pace: number): THREE.Color {
  // pace 260(빠름) ~ 420(느림) 범위로 색상 매핑
  // 빠름: 파랑-보라, 느림: 주황-빨강
  const t = Math.max(0, Math.min(1, (pace - 260) / 160))
  if (t < 0.5) {
    const u = t * 2
    return new THREE.Color(0.66 - u * 0.44, 0.2 + u * 0.3, 1)
  }
  const u = (t - 0.5) * 2
  return new THREE.Color(0.22 + u * 0.69, 0.5 - u * 0.47, 1 - u * 0.8)
}
