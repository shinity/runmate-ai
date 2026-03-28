import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, Dimensions,
} from 'react-native'
import Constants from 'expo-constants'
import { Ionicons } from '@expo/vector-icons'

const isExpoGo = Constants.appOwnership === 'expo'
const MapView = isExpoGo ? null : require('react-native-maps').default
const { Polyline, Marker, PROVIDER_DEFAULT } = isExpoGo ? {} : require('react-native-maps')
import { useRunDetail } from '../hooks/useRuns'
import { formatPace, formatDistance, formatDuration } from '../lib/format'
import ShareRunButton from './ShareRunButton'

const SCREEN_WIDTH = Dimensions.get('window').width

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#475569' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

interface RunDetailModalProps {
  runId: string
  onClose: () => void
}

export default function RunDetailModal({ runId, onClose }: RunDetailModalProps) {
  const { data: run, isLoading, isError } = useRunDetail(runId)

  const validPoints = (run?.datapoints ?? []).filter(
    (d) => d.lat !== null && d.lng !== null,
  ) as Array<{ lat: number; lng: number; altitudeM: number | null; paceSecPerKm: number | null }>

  const coordinates = validPoints.map((d) => ({ latitude: d.lat, longitude: d.lng }))
  const startCoord = coordinates[0]
  const endCoord = coordinates[coordinates.length - 1]

  function getMapRegion() {
    if (coordinates.length === 0) return undefined
    const lats = coordinates.map((c) => c.latitude)
    const lngs = coordinates.map((c) => c.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const latDelta = Math.max((maxLat - minLat) * 1.4, 0.005)
    const lngDelta = Math.max((maxLng - minLng) * 1.4, 0.005)
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    }
  }

  const mapRegion = getMapRegion()

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {run?.title ?? (isLoading ? '불러오는 중...' : '런 상세')}
          </Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
          </View>
        )}

        {isError && (
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={styles.errorText}>데이터를 불러오지 못했습니다.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onClose}>
              <Text style={styles.retryBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !isError && run && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 지도 */}
            <View style={styles.mapContainer}>
              {!isExpoGo && coordinates.length > 0 && mapRegion && MapView ? (
                <MapView
                  style={styles.map}
                  provider={PROVIDER_DEFAULT}
                  region={mapRegion}
                  customMapStyle={DARK_MAP_STYLE}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Polyline
                    coordinates={coordinates}
                    strokeColor="#3b82f6"
                    strokeWidth={4}
                    lineCap="round"
                    lineJoin="round"
                  />
                  {startCoord && (
                    <Marker coordinate={startCoord} anchor={{ x: 0.5, y: 0.5 }}>
                      <View style={styles.markerStart}>
                        <Text style={styles.markerText}>S</Text>
                      </View>
                    </Marker>
                  )}
                  {endCoord && startCoord && (endCoord.latitude !== startCoord.latitude || endCoord.longitude !== startCoord.longitude) && (
                    <Marker coordinate={endCoord} anchor={{ x: 0.5, y: 0.5 }}>
                      <View style={styles.markerEnd}>
                        <Text style={styles.markerText}>E</Text>
                      </View>
                    </Marker>
                  )}
                </MapView>
              ) : (
                <View style={[styles.map, styles.mapPlaceholder]}>
                  <Ionicons name="map-outline" size={48} color="#334155" />
                  <Text style={styles.mapPlaceholderText}>GPS 데이터 없음</Text>
                </View>
              )}
            </View>

            {/* 런 통계 */}
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatDistance(run.distanceMeters)}</Text>
                  <Text style={styles.statLabel}>거리</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatDuration(run.durationSeconds)}</Text>
                  <Text style={styles.statLabel}>시간</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatPace(run.avgPaceSecPerKm)}/km</Text>
                  <Text style={styles.statLabel}>평균 페이스</Text>
                </View>
              </View>
              {(run.elevationGainMeters ?? 0) > 0 && (
                <View style={styles.elevationRow}>
                  <Ionicons name="trending-up-outline" size={16} color="#94a3b8" />
                  <Text style={styles.elevationText}>
                    고도 상승 {Math.round(run.elevationGainMeters)}m
                  </Text>
                </View>
              )}
            </View>

            {/* 스플릿 */}
            {run.splits && run.splits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>km별 페이스</Text>
                {run.splits.map((split) => (
                  <View key={split.splitNumber} style={styles.splitRow}>
                    <Text style={styles.splitKm}>{split.splitNumber}km</Text>
                    <View style={styles.splitBar}>
                      <View
                        style={[
                          styles.splitBarFill,
                          {
                            width: `${Math.min(
                              ((split.paceSecPerKm - 180) / (600 - 180)) * 100,
                              100,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.splitPace}>{formatPace(split.paceSecPerKm)}/km</Text>
                    {split.heartRate && (
                      <Text style={styles.splitHr}>
                        <Ionicons name="heart-outline" size={12} color="#ef4444" />
                        {' '}{split.heartRate}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* 라우트 아트 */}
            {run.routeArtUrl && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>라우트 아트</Text>
                <Image
                  source={{ uri: run.routeArtUrl }}
                  style={styles.routeArt}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* 공유 버튼 */}
            <View style={styles.shareContainer}>
              <ShareRunButton
                run={{
                  distanceMeters: run.distanceMeters,
                  durationSeconds: run.durationSeconds,
                  avgPaceSecPerKm: run.avgPaceSecPerKm,
                  routeArtUrl: run.routeArtUrl,
                }}
              />
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 15,
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryBtnText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    width: SCREEN_WIDTH - 32,
    height: 240,
  },
  mapPlaceholder: {
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapPlaceholderText: {
    color: '#475569',
    fontSize: 14,
  },
  markerStart: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerEnd: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  statsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#334155',
  },
  elevationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  elevationText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  splitKm: {
    color: '#64748b',
    fontSize: 13,
    width: 32,
  },
  splitBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  splitBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  splitPace: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
    width: 64,
    textAlign: 'right',
  },
  splitHr: {
    color: '#ef4444',
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  routeArt: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#1e293b',
  },
  shareContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: 'flex-start',
  },
})
