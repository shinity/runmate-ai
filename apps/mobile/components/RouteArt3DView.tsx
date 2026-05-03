import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { GLView } from 'expo-gl'
import { Renderer } from 'expo-three'
import * as THREE from 'three'
import { Ionicons } from '@expo/vector-icons'
import { normalizeToScene, paceToColor } from '../lib/routeArt3D'
import type { DataPoint } from '../lib/routeArt3D'

const SCREEN_WIDTH = Dimensions.get('window').width

type CameraMode = 'chase' | 'orbit' | 'below'

interface Props {
  datapoints: DataPoint[]
  isDay?: boolean
}

export default function RouteArt3DView({ datapoints, isDay = false }: Props) {
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit')
  const [isReady, setIsReady] = useState(false)

  // 렌더링 상태를 ref로 관리 (리렌더 없이 업데이트)
  const rafRef = useRef<number | null>(null)
  const cameraModeRef = useRef<CameraMode>('orbit')
  const orbitAngleRef = useRef(0)
  const panDeltaRef = useRef({ x: 0 })
  const runnerProgressRef = useRef(0)
  const glRef = useRef<any>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const runnerRef = useRef<THREE.Group | null>(null)
  const trackPointsRef = useRef<Array<{ x: number; y: number; z: number; pace: number }>>([])
  const miniCubesRef = useRef<THREE.Mesh[]>([])
  const glowRef = useRef<THREE.Mesh | null>(null)

  // cameraMode 변경 시 ref도 동기화
  useEffect(() => {
    cameraModeRef.current = cameraMode
  }, [cameraMode])

  // PanResponder — orbit 모드에서 수동 회전
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => cameraModeRef.current === 'orbit',
    onMoveShouldSetPanResponder: () => cameraModeRef.current === 'orbit',
    onPanResponderMove: (_, gs) => {
      panDeltaRef.current.x += gs.dx * 0.005
      orbitAngleRef.current = panDeltaRef.current.x
    },
  })

  const onContextCreate = useCallback(
    async (gl: any) => {
      glRef.current = gl

      const width = gl.drawingBufferWidth
      const height = gl.drawingBufferHeight

      // ---- Renderer ----
      let renderer: THREE.WebGLRenderer
      try {
        renderer = new (Renderer as any)({ gl }) as THREE.WebGLRenderer
      } catch {
        // expo-three Renderer 실패 시 직접 WebGLRenderer 구성
        renderer = new THREE.WebGLRenderer({
          canvas: {
            width,
            height,
            style: {},
            addEventListener: () => {},
            removeEventListener: () => {},
            clientHeight: height,
          } as any,
          context: gl as any,
        })
      }
      renderer.setSize(width, height)
      renderer.shadowMap.enabled = true
      rendererRef.current = renderer

      // ---- Scene ----
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(isDay ? '#c0d8f0' : '#0a0e1a')
      scene.fog = new THREE.FogExp2(isDay ? '#c0d8f0' : '#0a0e1a', isDay ? 0.04 : 0.06)
      sceneRef.current = scene

      // ---- Camera ----
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 100)
      camera.position.set(0, 3, 5)
      camera.lookAt(0, 0, 0)
      cameraRef.current = camera

      // ---- Lighting ----
      const ambient = new THREE.AmbientLight(isDay ? 0xffffff : 0x334455, isDay ? 1.2 : 0.6)
      scene.add(ambient)

      const dirLight = new THREE.DirectionalLight(isDay ? 0xfff5e0 : 0x6688ff, isDay ? 1.5 : 1.0)
      dirLight.position.set(3, 8, 5)
      dirLight.castShadow = true
      scene.add(dirLight)

      if (!isDay) {
        const bluePoint = new THREE.PointLight(0x3b82f6, 2, 8)
        bluePoint.position.set(-2, 2, -2)
        scene.add(bluePoint)

        const purplePoint = new THREE.PointLight(0xa855f7, 1.5, 6)
        purplePoint.position.set(2, 1, 2)
        scene.add(purplePoint)
      }

      // ---- 메인 큐브 플랫폼 ----
      const platformGeo = new THREE.BoxGeometry(3.2, 0.12, 2.4)
      const platformMat = new THREE.MeshStandardMaterial({
        color: isDay ? 0xdde8f5 : 0x0d1f3c,
        metalness: 0.6,
        roughness: 0.3,
        envMapIntensity: 1,
      })
      const platform = new THREE.Mesh(platformGeo, platformMat)
      platform.position.y = -0.06
      platform.receiveShadow = true
      scene.add(platform)

      // 플랫폼 엣지 네온 라인
      const edgesGeo = new THREE.EdgesGeometry(platformGeo)
      const edgeMat = new THREE.LineBasicMaterial({
        color: isDay ? 0x93c5fd : 0x3b82f6,
        linewidth: 1,
      })
      const edges = new THREE.LineSegments(edgesGeo, edgeMat)
      edges.position.copy(platform.position)
      scene.add(edges)

      // ---- 그리드 라인 (플랫폼 위) ----
      const gridHelper = new THREE.GridHelper(3, 8, isDay ? 0x90aec8 : 0x1e3a5f, isDay ? 0x90aec8 : 0x1e3a5f)
      gridHelper.position.y = 0.001
      scene.add(gridHelper)

      // ---- 주변 미니 큐브들 (10개) ----
      const miniCubes: THREE.Mesh[] = []
      for (let i = 0; i < 10; i++) {
        const size = 0.05 + Math.random() * 0.1
        const geo = new THREE.BoxGeometry(size, size, size)
        const hue = isDay ? 0.55 + Math.random() * 0.15 : Math.random()
        const color = new THREE.Color().setHSL(hue, 0.8, 0.6)
        const mat = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.7,
          roughness: 0.2,
          emissive: color,
          emissiveIntensity: isDay ? 0.1 : 0.4,
        })
        const cube = new THREE.Mesh(geo, mat)
        const angle = (i / 10) * Math.PI * 2
        const radius = 1.8 + Math.random() * 0.8
        cube.position.set(
          Math.cos(angle) * radius,
          0.3 + Math.random() * 0.8,
          Math.sin(angle) * radius,
        )
        cube.userData = {
          angle,
          radius,
          speed: 0.003 + Math.random() * 0.005,
          floatOffset: Math.random() * Math.PI * 2,
          floatSpeed: 0.02 + Math.random() * 0.02,
          rotSpeed: 0.01 + Math.random() * 0.02,
        }
        scene.add(cube)
        miniCubes.push(cube)
      }
      miniCubesRef.current = miniCubes

      // ---- 별 파티클 (night 모드) ----
      if (!isDay) {
        const starCount = 200
        const starGeo = new THREE.BufferGeometry()
        const starPositions = new Float32Array(starCount * 3)
        for (let i = 0; i < starCount; i++) {
          starPositions[i * 3] = (Math.random() - 0.5) * 40
          starPositions[i * 3 + 1] = 2 + Math.random() * 10
          starPositions[i * 3 + 2] = (Math.random() - 0.5) * 40
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, sizeAttenuation: true })
        scene.add(new THREE.Points(starGeo, starMat))
      }

      // ---- 건물들 (플랫폼 주변) ----
      const buildingConfigs = [
        { x: -1.8, z: -1.5, h: 0.4 },
        { x: 1.8, z: -1.5, h: 0.6 },
        { x: -1.8, z: 1.5, h: 0.3 },
        { x: 1.8, z: 1.5, h: 0.5 },
        { x: 0, z: -2.0, h: 0.35 },
      ]
      buildingConfigs.forEach(({ x, z, h }) => {
        const bGeo = new THREE.BoxGeometry(0.2, h, 0.2)
        const bMat = new THREE.MeshStandardMaterial({
          color: isDay ? 0x6b8fb5 : 0x0f2040,
          metalness: 0.5,
          roughness: 0.4,
          emissive: isDay ? 0x000000 : 0x0a1a30,
          emissiveIntensity: 0.5,
        })
        const building = new THREE.Mesh(bGeo, bMat)
        building.position.set(x, h / 2, z)
        building.castShadow = true
        scene.add(building)

        // 건물 꼭대기 불빛
        const topLight = new THREE.PointLight(isDay ? 0xffd700 : 0xff4444, 0.5, 1.5)
        topLight.position.set(x, h + 0.05, z)
        scene.add(topLight)
      })

      // ---- 러닝 트랙 (TubeGeometry + 페이스 히트맵) ----
      const scenePoints = normalizeToScene(datapoints)
      trackPointsRef.current = scenePoints

      if (scenePoints.length >= 2) {
        // 트랙을 세그먼트별로 색상 적용
        for (let i = 0; i < scenePoints.length - 1; i++) {
          const p0 = scenePoints[i]
          const p1 = scenePoints[i + 1]
          const segPath = new THREE.CatmullRomCurve3([
            new THREE.Vector3(p0.x, p0.y, p0.z),
            new THREE.Vector3(p1.x, p1.y, p1.z),
          ])
          const tubeGeo = new THREE.TubeGeometry(segPath, 1, 0.018, 6, false)
          const segColor = paceToColor((p0.pace + p1.pace) / 2)
          const tubeMat = new THREE.MeshStandardMaterial({
            color: segColor,
            emissive: segColor,
            emissiveIntensity: isDay ? 0.2 : 0.6,
            metalness: 0.3,
            roughness: 0.5,
          })
          scene.add(new THREE.Mesh(tubeGeo, tubeMat))
        }

        // 시작점 마커
        const startGeo = new THREE.SphereGeometry(0.06, 8, 8)
        const startMat = new THREE.MeshStandardMaterial({
          color: 0x22c55e,
          emissive: 0x22c55e,
          emissiveIntensity: 0.8,
        })
        const startMarker = new THREE.Mesh(startGeo, startMat)
        startMarker.position.set(scenePoints[0].x, scenePoints[0].y + 0.06, scenePoints[0].z)
        scene.add(startMarker)

        // 종료점 마커
        const endGeo = new THREE.SphereGeometry(0.06, 8, 8)
        const endMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xef4444,
          emissiveIntensity: 0.8,
        })
        const endMarker = new THREE.Mesh(endGeo, endMat)
        const last = scenePoints[scenePoints.length - 1]
        endMarker.position.set(last.x, last.y + 0.06, last.z)
        scene.add(endMarker)
      }

      // ---- 러너 피규어 ----
      const runner = new THREE.Group()

      // 몸통 (CapsuleGeometry — three@0.148에서 사용 가능)
      const bodyGeo = new THREE.CapsuleGeometry(0.055, 0.12, 4, 8)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isDay ? 0x3b82f6 : 0x60a5fa,
        emissive: isDay ? 0x1e40af : 0x3b82f6,
        emissiveIntensity: 0.3,
        metalness: 0.2,
        roughness: 0.6,
      })
      const body = new THREE.Mesh(bodyGeo, bodyMat)
      body.position.y = 0.18
      runner.add(body)

      // 머리
      const headGeo = new THREE.SphereGeometry(0.045, 8, 8)
      const headMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6 })
      const head = new THREE.Mesh(headGeo, headMat)
      head.position.y = 0.32
      runner.add(head)

      // 다리 (좌/우)
      const legGeo = new THREE.CapsuleGeometry(0.02, 0.1, 4, 6)
      const legMat = new THREE.MeshStandardMaterial({ color: isDay ? 0x1d4ed8 : 0x2563eb })
      const legL = new THREE.Mesh(legGeo, legMat)
      legL.position.set(-0.03, 0.06, 0)
      legL.userData.isLegLeft = true
      runner.add(legL)

      const legR = new THREE.Mesh(legGeo, legMat.clone())
      legR.position.set(0.03, 0.06, 0)
      legR.userData.isLegRight = true
      runner.add(legR)

      // 팔 (좌/우)
      const armGeo = new THREE.CapsuleGeometry(0.015, 0.08, 4, 6)
      const armMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
      const armL = new THREE.Mesh(armGeo, armMat)
      armL.position.set(-0.085, 0.2, 0)
      armL.rotation.z = 0.4
      armL.userData.isArmLeft = true
      runner.add(armL)

      const armR = new THREE.Mesh(armGeo, armMat.clone())
      armR.position.set(0.085, 0.2, 0)
      armR.rotation.z = -0.4
      armR.userData.isArmRight = true
      runner.add(armR)

      if (scenePoints.length > 0) {
        runner.position.set(scenePoints[0].x, scenePoints[0].y, scenePoints[0].z)
      } else {
        runner.position.set(0, 0, 0)
      }
      scene.add(runner)
      runnerRef.current = runner

      // 발밑 글로우
      const glowGeo = new THREE.CircleGeometry(0.12, 16)
      const glowMat = new THREE.MeshBasicMaterial({
        color: isDay ? 0x93c5fd : 0x3b82f6,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      })
      const glow = new THREE.Mesh(glowGeo, glowMat)
      glow.rotation.x = -Math.PI / 2
      glow.position.y = 0.002
      scene.add(glow)
      glowRef.current = glow

      setIsReady(true)

      // ---- 애니메이션 루프 ----
      let frameCount = 0

      const animate = () => {
        rafRef.current = requestAnimationFrame(animate)
        frameCount++

        const now = frameCount * 0.016 // 약 60fps 기준

        // 러너 이동
        const points = trackPointsRef.current
        if (points.length > 1) {
          // 30초에 한 바퀴 순환
          runnerProgressRef.current = (now / 30) % 1
          const totalProgress = runnerProgressRef.current * (points.length - 1)
          const segIdx = Math.floor(totalProgress)
          const segT = totalProgress - segIdx
          const clampedIdx = Math.min(segIdx, points.length - 2)

          const p0 = points[clampedIdx]
          const p1 = points[clampedIdx + 1]
          const rx = p0.x + (p1.x - p0.x) * segT
          const ry = p0.y + (p1.y - p0.y) * segT
          const rz = p0.z + (p1.z - p0.z) * segT

          if (runnerRef.current) {
            runnerRef.current.position.set(rx, ry, rz)

            // 진행 방향으로 러너 회전
            const dx = p1.x - p0.x
            const dz = p1.z - p0.z
            if (Math.abs(dx) > 0.0001 || Math.abs(dz) > 0.0001) {
              runnerRef.current.rotation.y = Math.atan2(dx, dz)
            }

            // 달리기 애니메이션 (다리/팔 흔들기)
            const swing = Math.sin(now * 8) * 0.4
            runnerRef.current.children.forEach((child) => {
              if (child.userData.isLegLeft) (child as THREE.Mesh).rotation.x = swing
              if (child.userData.isLegRight) (child as THREE.Mesh).rotation.x = -swing
              if (child.userData.isArmLeft) (child as THREE.Mesh).rotation.x = -swing * 0.6
              if (child.userData.isArmRight) (child as THREE.Mesh).rotation.x = swing * 0.6
            })
          }

          // 글로우 위치 동기화
          if (glowRef.current) {
            glowRef.current.position.set(rx, ry + 0.003, rz)
            ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity =
              0.3 + Math.sin(now * 4) * 0.1
          }

          // 카메라 업데이트
          const cam = cameraRef.current
          if (cam) {
            const mode = cameraModeRef.current

            if (mode === 'chase') {
              // 러너 뒤에서 추적
              const behindX = rx - Math.sin(runnerRef.current?.rotation.y ?? 0) * 0.8
              const behindZ = rz - Math.cos(runnerRef.current?.rotation.y ?? 0) * 0.8
              cam.position.set(behindX, ry + 0.5, behindZ)
              cam.lookAt(rx, ry + 0.2, rz)
            } else if (mode === 'orbit') {
              // 자동 공전 + 수동 드래그
              orbitAngleRef.current += 0.005
              const radius = 4.5
              cam.position.set(
                Math.sin(orbitAngleRef.current) * radius,
                2.5,
                Math.cos(orbitAngleRef.current) * radius,
              )
              cam.lookAt(0, 0.2, 0)
            } else if (mode === 'below') {
              // 큐브 아래에서 올려다보기
              cam.position.set(
                Math.sin(now * 0.3) * 2,
                -0.8,
                Math.cos(now * 0.3) * 2,
              )
              cam.lookAt(rx, ry + 0.3, rz)
            }
          }
        } else {
          // 데이터포인트 없을 때 기본 orbit
          if (cameraModeRef.current === 'orbit' && cameraRef.current) {
            orbitAngleRef.current += 0.005
            const radius = 4.5
            cameraRef.current.position.set(
              Math.sin(orbitAngleRef.current) * radius,
              2.5,
              Math.cos(orbitAngleRef.current) * radius,
            )
            cameraRef.current.lookAt(0, 0.2, 0)
          }
        }

        // 미니 큐브 회전 + 부유
        miniCubesRef.current.forEach((cube) => {
          const { speed, floatOffset, floatSpeed, rotSpeed } = cube.userData
          cube.userData.angle += speed
          const r = cube.userData.radius
          cube.position.x = Math.cos(cube.userData.angle) * r
          cube.position.z = Math.sin(cube.userData.angle) * r
          cube.position.y =
            0.4 + Math.sin(now * floatSpeed + floatOffset) * 0.15
          cube.rotation.x += rotSpeed
          cube.rotation.y += rotSpeed * 0.7
        })

        renderer.render(scene, cameraRef.current!)
        gl.endFrameEXP()
      }

      animate()
    },
    [datapoints, isDay],
  )

  // cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const CAMERA_MODES: { mode: CameraMode; icon: string; label: string }[] = [
    { mode: 'chase', icon: 'walk-outline', label: '추적' },
    { mode: 'orbit', icon: 'earth-outline', label: '전체' },
    { mode: 'below', icon: 'arrow-up-outline', label: '아래' },
  ]

  return (
    <View style={styles.wrapper}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
        {...panResponder.panHandlers}
      />

      {!isReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <Text style={styles.loadingText}>3D 씬 초기화 중...</Text>
        </View>
      )}

      {/* 카메라 모드 토글 */}
      <View style={styles.cameraBtnRow}>
        {CAMERA_MODES.map(({ mode, icon, label }) => (
          <TouchableOpacity
            key={mode}
            style={[styles.cameraBtn, cameraMode === mode && styles.cameraBtnActive]}
            onPress={() => setCameraMode(mode)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={icon as any}
              size={16}
              color={cameraMode === mode ? '#fff' : '#94a3b8'}
            />
            <Text style={[styles.cameraBtnText, cameraMode === mode && styles.cameraBtnTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 힌트 텍스트 */}
      {cameraMode === 'orbit' && (
        <View style={styles.hintBadge}>
          <Text style={styles.hintText}>드래그로 회전</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0a0e1a',
  },
  glView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  cameraBtnRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cameraBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  cameraBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraBtnTextActive: {
    color: '#fff',
  },
  hintBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hintText: {
    color: '#64748b',
    fontSize: 11,
  },
})
