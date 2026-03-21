import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { Stack } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

const DEVICE_LABELS: Record<string, string> = {
  apple_watch: '⌚ Apple Watch',
  garmin: '🟣 Garmin',
  galaxy_watch: '⭕ Galaxy Watch',
  fitbit: '💚 Fitbit',
  polar: '🔴 Polar',
  suunto: '🟠 Suunto',
}

export default function DevicesScreen() {
  const { user, loadUser } = useAuthStore()
  const qc = useQueryClient()

  const devices: any[] = (user as any)?.devices ?? []

  const disconnect = useMutation({
    mutationFn: (deviceId: string) => api.delete(`/sync/devices/${deviceId}`),
    onSuccess: () => {
      loadUser()
      qc.invalidateQueries({ queryKey: ['sync'] })
    },
    onError: (e: any) => Alert.alert('오류', e.message ?? '연결 해제에 실패했습니다.'),
  })

  const AVAILABLE_DEVICES = [
    { type: 'apple_watch', id: 'apple-watch-default' },
    { type: 'garmin', id: 'garmin-default' },
    { type: 'galaxy_watch', id: 'galaxy-watch-default' },
  ]

  const connect = useMutation({
    mutationFn: ({ deviceType, deviceId }: { deviceType: string; deviceId: string }) =>
      api.post('/sync/devices/connect', { deviceType, deviceId }),
    onSuccess: () => {
      loadUser()
      Alert.alert('연결 완료', '기기가 연결되었습니다.')
    },
    onError: (e: any) => Alert.alert('오류', e.message ?? '연결에 실패했습니다.'),
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '연결된 기기', presentation: 'modal' }} />
      {devices.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>연결된 기기</Text>
          {devices.map((d: any) => (
            <View key={d.id} style={styles.deviceCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{DEVICE_LABELS[d.deviceType] ?? d.deviceType}</Text>
                <Text style={styles.deviceSub}>
                  마지막 동기화: {d.syncedAt ? new Date(d.syncedAt).toLocaleDateString('ko-KR') : '없음'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.disconnectBtn}
                onPress={() =>
                  Alert.alert('기기 연결 해제', '연결을 해제하시겠어요?', [
                    { text: '취소', style: 'cancel' },
                    { text: '해제', style: 'destructive', onPress: () => disconnect.mutate(d.id) },
                  ])
                }
              >
                <Text style={styles.disconnectBtnText}>해제</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>기기 추가</Text>
      <Text style={styles.sectionDesc}>지원되는 기기를 연결하면 운동 데이터를 자동으로 가져와요</Text>

      {AVAILABLE_DEVICES.filter((d) => !devices.some((c: any) => c.deviceType === d.type)).map((d) => (
        <TouchableOpacity
          key={d.type}
          style={styles.addCard}
          onPress={() => connect.mutate({ deviceType: d.type, deviceId: d.id })}
          disabled={connect.isPending}
        >
          <Text style={styles.deviceName}>{DEVICE_LABELS[d.type]}</Text>
          <Text style={styles.addBtnText}>연결 +</Text>
        </TouchableOpacity>
      ))}

      {AVAILABLE_DEVICES.every((d) => devices.some((c: any) => c.deviceType === d.type)) && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>모든 기기가 연결되어 있어요</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, paddingBottom: 48 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc', marginBottom: 8, marginTop: 8 },
  sectionDesc: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  deviceCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  addCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed' },
  deviceName: { color: '#f8fafc', fontWeight: '700', fontSize: 15 },
  deviceSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  disconnectBtn: { backgroundColor: '#7f1d1d', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  disconnectBtnText: { color: '#fca5a5', fontWeight: '600', fontSize: 13 },
  addBtnText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 15 },
})
