import { useRef, useState } from 'react'
import { Alert } from 'react-native'
import { captureRef } from 'react-native-view-shot'
import * as MediaLibrary from 'expo-media-library'

export function useSaveImage() {
  const viewRef = useRef<unknown>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function saveToLibrary(): Promise<string | null> {
    if (!viewRef.current) return null
    setIsSaving(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('권한 필요', '이미지를 저장하려면 사진 라이브러리 접근 권한이 필요합니다.')
        return null
      }
      const uri = await captureRef(viewRef, { format: 'png', quality: 1 })
      await MediaLibrary.saveToLibraryAsync(uri)
      Alert.alert('저장 완료', '이미지가 카메라롤에 저장되었습니다.')
      return uri
    } catch {
      Alert.alert('저장 실패', '이미지 저장 중 오류가 발생했습니다.')
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function captureAsUri(): Promise<string | null> {
    if (!viewRef.current) return null
    try {
      return await captureRef(viewRef, { format: 'png', quality: 1 })
    } catch {
      return null
    }
  }

  return { viewRef, isSaving, saveToLibrary, captureAsUri }
}
