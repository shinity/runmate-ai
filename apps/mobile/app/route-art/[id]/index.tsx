import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useRunDetail } from '../../../hooks/useRuns'
import { formatDistance, formatDuration, formatPace } from '../../../lib/format'
import RunDetailModal from '../../../components/RunDetailModal'
import { useSaveImage } from '../../../hooks/useSaveImage'
import { useGalleryStore } from '../../../stores/gallery'
import RouteArt3DView from '../../../components/RouteArt3DView'
import type { DataPoint } from '../../../lib/routeArt3D'

const SCREEN_WIDTH = Dimensions.get('window').width
const ART_SIZE = SCREEN_WIDTH - 32

interface RunDetailWithAnimation {
  id: string
  distanceMeters: number
  durationSeconds: number
  avgPaceSecPerKm: number
  elevationGainMeters: number
  routeArtUrl?: string
  animatedRouteArtUrl?: string
  startedAt: string
  title?: string
  datapoints: unknown[]
  splits: unknown[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function RouteArtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [showRunDetail, setShowRunDetail] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const { viewRef, isSaving, saveToLibrary, captureAsUri } = useSaveImage()

  const routeArtIds = useGalleryStore((s) => s.routeArtIds)
  const currentIndex = routeArtIds.indexOf(id ?? '')
  const prevId = currentIndex > 0 ? routeArtIds[currentIndex - 1] : null
  const nextId = currentIndex < routeArtIds.length - 1 ? routeArtIds[currentIndex + 1] : null

  const [viewMode, setViewMode] = useState<'image' | '3d'>('image')

  const { data: run, isLoading, isError } = useRunDetail(id ?? null)
  const typedRun = run as RunDetailWithAnimation | undefined

  async function handleSave() {
    await saveToLibrary()
  }

  async function handleShare() {
    if (!typedRun) return
    setIsSharing(true)
    try {
      const distanceKm = (typedRun.distanceMeters / 1000).toFixed(1)
      const pace = formatPace(typedRun.avgPaceSecPerKm)
      const message = `${distanceKm}km를 ${pace}/km 페이스로 달렸습니다! #RunMate #라우트아트`

      const capturedUri = await captureAsUri()
      const shareOptions: Parameters<typeof Share.share>[0] = { message }
      if (capturedUri) {
        shareOptions.url = capturedUri
      } else if (typedRun.routeArtUrl) {
        shareOptions.url = typedRun.routeArtUrl
      }
      await Share.share(shareOptions)
    } catch (e: any) {
      if (e.message !== 'The user did not share') {
        Alert.alert('공유 실패', '공유 중 오류가 발생했습니다.')
      }
    } finally {
      setIsSharing(false)
    }
  }

  function handleAnimateBtnPress() {
    if (!typedRun) return
    if (typedRun.animatedRouteArtUrl) {
      router.push(`/route-art/${typedRun.id}/animate/result`)
    } else {
      router.push(`/route-art/${typedRun.id}/animate`)
    }
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>라우트 아트</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={handleSave}
            disabled={isSaving || !typedRun?.routeArtUrl}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#f8fafc" />
            ) : (
              <Ionicons
                name="download-outline"
                size={22}
                color={typedRun?.routeArtUrl ? '#f8fafc' : '#475569'}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={handleShare}
            disabled={isSharing || !typedRun}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#f8fafc" />
            ) : (
              <Ionicons name="share-social-outline" size={22} color="#f8fafc" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>데이터를 불러오지 못했습니다.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>뒤로 가기</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && typedRun && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 뷰 모드 탭 */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, viewMode === 'image' && styles.tabActive]}
              onPress={() => setViewMode('image')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="image-outline"
                size={15}
                color={viewMode === 'image' ? '#fff' : '#64748b'}
              />
              <Text style={[styles.tabText, viewMode === 'image' && styles.tabTextActive]}>
                이미지
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, viewMode === '3d' && styles.tabActive]}
              onPress={() => setViewMode('3d')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cube-outline"
                size={15}
                color={viewMode === '3d' ? '#fff' : '#64748b'}
              />
              <Text style={[styles.tabText, viewMode === '3d' && styles.tabTextActive]}>
                3D
              </Text>
            </TouchableOpacity>
          </View>

          {/* Route Art 이미지 */}
          {viewMode === 'image' && (
            <View style={styles.artContainer} ref={viewRef as any}>
              {typedRun.routeArtUrl ? (
                <Image
                  source={{ uri: typedRun.routeArtUrl }}
                  style={styles.artImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.artPlaceholder}>
                  <Ionicons name="map-outline" size={64} color="#334155" />
                  <Text style={styles.artPlaceholderText}>라우트 아트 없음</Text>
                </View>
              )}
            </View>
          )}

          {/* 3D 뷰 */}
          {viewMode === '3d' && (
            <View style={styles.artContainer}>
              <RouteArt3DView
                datapoints={(typedRun.datapoints as DataPoint[]) ?? []}
                isDay={false}
              />
            </View>
          )}

          {/* 이전/다음 탐색 (갤러리 컨텍스트가 있을 때만 표시) */}
          {routeArtIds.length > 1 && (prevId || nextId) && (
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.navBtn, !prevId && styles.navBtnDisabled]}
                onPress={() => prevId && router.replace(`/route-art/${prevId}`)}
                disabled={!prevId}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={18} color={prevId ? '#f8fafc' : '#334155'} />
                <Text style={[styles.navBtnText, !prevId && styles.navBtnTextDisabled]}>이전</Text>
              </TouchableOpacity>
              <Text style={styles.navCount}>
                {currentIndex + 1} / {routeArtIds.length}
              </Text>
              <TouchableOpacity
                style={[styles.navBtn, !nextId && styles.navBtnDisabled]}
                onPress={() => nextId && router.replace(`/route-art/${nextId}`)}
                disabled={!nextId}
                activeOpacity={0.7}
              >
                <Text style={[styles.navBtnText, !nextId && styles.navBtnTextDisabled]}>다음</Text>
                <Ionicons name="chevron-forward" size={18} color={nextId ? '#f8fafc' : '#334155'} />
              </TouchableOpacity>
            </View>
          )}

          {/* 런 요약 */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryDate}>{formatDate(typedRun.startedAt)}</Text>
            {typedRun.title && <Text style={styles.summaryTitle}>{typedRun.title}</Text>}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDistance(typedRun.distanceMeters)}</Text>
                <Text style={styles.statLabel}>거리</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDuration(typedRun.durationSeconds)}</Text>
                <Text style={styles.statLabel}>시간</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatPace(typedRun.avgPaceSecPerKm)}/km</Text>
                <Text style={styles.statLabel}>평균 페이스</Text>
              </View>
            </View>
          </View>

          {/* 런 상세 보기 링크 */}
          <TouchableOpacity
            style={styles.detailLink}
            onPress={() => setShowRunDetail(true)}
          >
            <Text style={styles.detailLinkText}>런 상세 보기</Text>
            <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
          </TouchableOpacity>

          {/* 애니메이션 만들기 버튼 */}
          {typedRun.routeArtUrl && (
            <TouchableOpacity
              style={styles.animateBtn}
              onPress={handleAnimateBtnPress}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.animateBtnText}>
                {typedRun.animatedRouteArtUrl ? '애니메이션 보기' : '애니메이션 만들기'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {showRunDetail && run && (
        <RunDetailModal
          runId={run.id}
          onClose={() => setShowRunDetail(false)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  loadingText: { color: '#64748b', fontSize: 15 },
  errorText: { color: '#94a3b8', fontSize: 15, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryBtnText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  navBtnDisabled: {
    backgroundColor: '#0f172a',
  },
  navBtnText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  navBtnTextDisabled: {
    color: '#334155',
  },
  navCount: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  artContainer: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  artImage: {
    width: ART_SIZE,
    height: ART_SIZE,
  },
  artPlaceholder: {
    width: ART_SIZE,
    height: ART_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  artPlaceholderText: { color: '#475569', fontSize: 15 },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  summaryDate: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#f8fafc' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: '#334155' },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1e293b',
    borderRadius: 16,
  },
  detailLinkText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
  },
  animateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 18,
    marginHorizontal: 16,
    marginBottom: 40,
  },
  animateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
