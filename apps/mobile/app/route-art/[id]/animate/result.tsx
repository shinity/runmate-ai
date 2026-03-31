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
import { useRunDetail } from '../../../../hooks/useRuns'
import { formatDistance, formatDuration, formatPace } from '../../../../lib/format'

// TODO: expo-media-library 설치 후 아래 주석을 해제하여 저장 기능 활성화
// import * as MediaLibrary from 'expo-media-library'

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
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function AnimateResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [isSharing, setIsSharing] = useState(false)

  const { data: run, isLoading, isError } = useRunDetail(id ?? null)
  const animatedRun = run as RunDetailWithAnimation | undefined

  async function handleShare() {
    if (!animatedRun) return
    setIsSharing(true)
    try {
      const distanceKm = (animatedRun.distanceMeters / 1000).toFixed(1)
      const pace = formatPace(animatedRun.avgPaceSecPerKm)
      const message = `${distanceKm}km를 ${pace}/km 페이스로 달렸습니다! 애니메이션으로 확인해보세요. #RunMate #애니메이션라우트아트`

      const shareOptions: Parameters<typeof Share.share>[0] = { message }
      if (animatedRun.animatedRouteArtUrl) {
        shareOptions.url = animatedRun.animatedRouteArtUrl
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

  function handleSave() {
    Alert.alert('준비 중', '저장 기능은 곧 지원될 예정입니다.')
  }

  function handleRemake() {
    router.replace(`/route-art/${id}/animate` as any)
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>나의 애니메이션</Text>
        <TouchableOpacity style={styles.remakeBtn} onPress={handleRemake}>
          <Text style={styles.remakeBtnText}>다시 만들기</Text>
        </TouchableOpacity>
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

      {!isLoading && !isError && animatedRun && (
        <>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 애니메이션 이미지 */}
            <View style={styles.artContainer}>
              {animatedRun.animatedRouteArtUrl ? (
                <Image
                  source={{ uri: animatedRun.animatedRouteArtUrl }}
                  style={styles.artImage}
                  resizeMode="contain"
                />
              ) : animatedRun.routeArtUrl ? (
                <Image
                  source={{ uri: animatedRun.routeArtUrl }}
                  style={styles.artImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.artPlaceholder}>
                  <Ionicons name="film-outline" size={64} color="#334155" />
                  <Text style={styles.artPlaceholderText}>애니메이션 없음</Text>
                </View>
              )}
            </View>

            {/* 런 요약 */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryDate}>{formatDate(animatedRun.startedAt)}</Text>
              {animatedRun.title && (
                <Text style={styles.summaryTitle}>{animatedRun.title}</Text>
              )}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatDistance(animatedRun.distanceMeters)}
                  </Text>
                  <Text style={styles.statLabel}>거리</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatDuration(animatedRun.durationSeconds)}
                  </Text>
                  <Text style={styles.statLabel}>시간</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatPace(animatedRun.avgPaceSecPerKm)}/km
                  </Text>
                  <Text style={styles.statLabel}>평균 페이스</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* 하단 버튼 영역 */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={22} color="#f8fafc" />
              <Text style={styles.actionBtnText}>저장하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.8}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={22} color="#fff" />
                  <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
                    공유하기
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
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
  remakeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  remakeBtnText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
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
    marginBottom: 16,
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
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#1e293b',
  },
  actionBtnPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionBtnText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnTextPrimary: {
    color: '#fff',
  },
})
