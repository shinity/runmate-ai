import { useState } from 'react'
import {
  TouchableOpacity, Text, StyleSheet, Share, Alert, ActivityIndicator, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatPace, formatDistance } from '../lib/format'

interface ShareRunButtonProps {
  run: {
    distanceMeters: number
    durationSeconds: number
    avgPaceSecPerKm: number
    routeArtUrl?: string
  }
}

export default function ShareRunButton({ run }: ShareRunButtonProps) {
  const [isSharing, setIsSharing] = useState(false)

  async function handleShare() {
    setIsSharing(true)
    try {
      const distanceKm = (run.distanceMeters / 1000).toFixed(1)
      const pace = formatPace(run.avgPaceSecPerKm)
      const shareMessage = `${distanceKm}km를 ${pace}/km 페이스로 달렸습니다! #RunMate`

      const shareOptions: Parameters<typeof Share.share>[0] = {
        message: shareMessage,
      }

      if (run.routeArtUrl) {
        shareOptions.url = run.routeArtUrl
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

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleShare}
      disabled={isSharing}
    >
      {isSharing ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <View style={styles.inner}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={styles.label}>공유</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 88,
    minHeight: 44,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})
