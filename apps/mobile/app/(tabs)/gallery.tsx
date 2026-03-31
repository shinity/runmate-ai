import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../lib/api'
import { formatDistance } from '../../lib/format'
import type { Run } from '@runmate/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const COLUMN_GAP = 12
const SIDE_PADDING = 16
const ITEM_SIZE = (SCREEN_WIDTH - SIDE_PADDING * 2 - COLUMN_GAP) / 2

interface RunsPage {
  data: Run[]
  meta: { hasMore: boolean; cursor?: string }
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

function GalleryItem({ item, onPress }: { item: Run; onPress: () => void }) {
  const hasRouteArt = !!item.routeArtUrl
  const hasGps = item.dataSource !== 'manual'

  return (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!hasRouteArt}
    >
      {hasRouteArt ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.routeArtUrl! }}
            style={styles.itemImage}
            resizeMode="cover"
          />
          <View style={styles.overlay}>
            <Text style={styles.overlayDistance}>{formatDistance(item.distanceMeters)}</Text>
            <Text style={styles.overlayDate}>{formatShortDate(item.startedAt)}</Text>
          </View>
        </View>
      ) : hasGps ? (
        <View style={[styles.imageWrapper, styles.shimmerContainer]}>
          <ActivityIndicator size="small" color="#3b82f6" style={styles.shimmerIcon} />
          <Text style={styles.placeholderText}>생성 중...</Text>
          <Text style={styles.placeholderDistance}>{formatDistance(item.distanceMeters)}</Text>
          <Text style={styles.placeholderDate}>{formatShortDate(item.startedAt)}</Text>
        </View>
      ) : (
        <View style={[styles.imageWrapper, styles.gpslessContainer]}>
          <Ionicons name="map-outline" size={32} color="#475569" />
          <Text style={styles.placeholderText}>GPS 없음</Text>
          <Text style={styles.placeholderDistance}>{formatDistance(item.distanceMeters)}</Text>
          <Text style={styles.placeholderDate}>{formatShortDate(item.startedAt)}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function GalleryScreen() {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<RunsPage>({
    queryKey: ['runs', 'gallery'],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined
      const url = cursor ? `/runs?limit=10&after=${cursor}` : '/runs?limit=10'
      const { data: raw } = await api.get<RunsPage>(url)
      return raw as RunsPage
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.cursor : undefined,
  })

  const runs = data?.pages.flatMap((page) => page.data) ?? []

  async function handleRefresh() {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>갤러리를 불러오는 중...</Text>
      </View>
    )
  }

  if (runs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="color-palette-outline" size={72} color="#334155" />
        <Text style={styles.emptyTitle}>라우트 아트가 없어요</Text>
        <Text style={styles.emptySubtitle}>
          런을 기록하면 달린 경로가{'\n'}아트로 변환됩니다
        </Text>
        <TouchableOpacity
          style={styles.startRunButton}
          onPress={() => router.navigate('/(tabs)/run')}
        >
          <Ionicons name="walk" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.startRunButtonText}>런 시작하기</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={runs}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <Text style={styles.heading}>나의 라우트 아트</Text>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color="#3b82f6" style={styles.footerLoader} />
          ) : null
        }
        renderItem={({ item }) => (
          <GalleryItem
            item={item}
            onPress={() => router.push(`/route-art/${item.id}`)}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: { color: '#64748b', fontSize: 15 },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  startRunButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  startRunButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  listContent: {
    padding: SIDE_PADDING,
    paddingBottom: 40,
  },
  columnWrapper: { gap: COLUMN_GAP, marginBottom: COLUMN_GAP },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 16,
  },
  itemContainer: {
    width: ITEM_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    padding: 10,
  },
  overlayDistance: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  overlayDate: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 2,
  },
  shimmerContainer: {
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shimmerIcon: { marginBottom: 2 },
  gpslessContainer: {
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  placeholderDistance: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  placeholderDate: {
    color: '#475569',
    fontSize: 12,
  },
  footerLoader: { paddingVertical: 20 },
})
