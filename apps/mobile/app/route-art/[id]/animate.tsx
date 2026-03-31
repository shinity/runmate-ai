import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useRunDetail } from '../../../hooks/useRuns'
import { useCreateAnimation } from '../../../hooks/useRuns'

interface BackgroundPreset {
  id: string
  label: string
  emoji: string
  color: string
}

interface CharacterPreset {
  id: string
  label: string
  emoji: string
}

const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'city_night', label: '도시 야경', emoji: '🌃', color: '#1a1a3e' },
  { id: 'park', label: '공원', emoji: '🌿', color: '#2d5a1b' },
  { id: 'beach', label: '해변', emoji: '🏖️', color: '#006994' },
  { id: 'mountain', label: '산길', emoji: '⛰️', color: '#4a5568' },
  { id: 'space', label: '우주', emoji: '🌌', color: '#0a0a14' },
  { id: 'sunset', label: '일몰', emoji: '🌅', color: '#c05621' },
  { id: 'forest', label: '숲속', emoji: '🌲', color: '#1a3d2b' },
  { id: 'rain', label: '빗속', emoji: '🌧️', color: '#1e3a5f' },
  { id: 'snow', label: '설원', emoji: '❄️', color: '#e8f4f8' },
  { id: 'desert', label: '사막', emoji: '🏜️', color: '#c49a3c' },
  { id: 'neon', label: '네온', emoji: '💜', color: '#1a0030' },
  { id: 'aurora', label: '오로라', emoji: '🌌', color: '#003340' },
]

const CHARACTER_PRESETS: CharacterPreset[] = [
  { id: 'runner', label: '러너', emoji: '🏃' },
  { id: 'ninja', label: '닌자', emoji: '🥷' },
  { id: 'robot', label: '로봇', emoji: '🤖' },
  { id: 'cat', label: '고양이', emoji: '🐱' },
  { id: 'unicorn', label: '유니콘', emoji: '🦄' },
  { id: 'astronaut', label: '우주인', emoji: '👨‍🚀' },
  { id: 'fox', label: '여우', emoji: '🦊' },
  { id: 'bear', label: '곰', emoji: '🐻' },
  { id: 'dragon', label: '용', emoji: '🐉' },
  { id: 'ghost', label: '유령', emoji: '👻' },
  { id: 'alien', label: '외계인', emoji: '👽' },
  { id: 'fire', label: '불꽃', emoji: '🔥' },
]

export default function AnimateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [selectedBackground, setSelectedBackground] = useState('city_night')
  const [selectedCharacter, setSelectedCharacter] = useState('runner')
  const [speed, setSpeed] = useState(1.0)

  const { data: run, isLoading } = useRunDetail(id ?? null)
  const createAnimation = useCreateAnimation(id ?? '')

  const selectedBg = BACKGROUND_PRESETS.find((b) => b.id === selectedBackground)

  async function handleCreate() {
    if (!id) return
    try {
      await createAnimation.mutateAsync({
        backgroundPreset: selectedBackground,
        characterPreset: selectedCharacter,
        speed,
      })
      router.replace(`/route-art/${id}/animate/progress`)
    } catch {
      Alert.alert('오류', '애니메이션 생성 요청에 실패했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>애니메이션 만들기</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 미리보기 영역 */}
        <View style={[styles.previewContainer, { backgroundColor: selectedBg?.color ?? '#1a1a3e' }]}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#f8fafc" />
          ) : run?.routeArtUrl ? (
            <Image
              source={{ uri: run.routeArtUrl }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="map-outline" size={56} color="rgba(248,250,252,0.3)" />
              <Text style={styles.previewPlaceholderText}>경로 미리보기</Text>
            </View>
          )}
          {/* 선택된 캐릭터 이모지 오버레이 */}
          <View style={styles.characterOverlay}>
            <Text style={styles.characterEmoji}>
              {CHARACTER_PRESETS.find((c) => c.id === selectedCharacter)?.emoji ?? '🏃'}
            </Text>
          </View>
        </View>

        {/* 배경 선택 섹션 */}
        <Text style={styles.sectionTitle}>배경 스타일</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {BACKGROUND_PRESETS.map((bg) => (
            <TouchableOpacity
              key={bg.id}
              style={[
                styles.presetItem,
                selectedBackground === bg.id && styles.presetItemSelected,
              ]}
              onPress={() => setSelectedBackground(bg.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.presetColorCircle, { backgroundColor: bg.color }]}>
                <Text style={styles.presetEmoji}>{bg.emoji}</Text>
              </View>
              <Text
                style={[
                  styles.presetLabel,
                  selectedBackground === bg.id && styles.presetLabelSelected,
                ]}
              >
                {bg.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 캐릭터 선택 섹션 */}
        <Text style={styles.sectionTitle}>캐릭터 선택</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {CHARACTER_PRESETS.map((char) => (
            <TouchableOpacity
              key={char.id}
              style={[
                styles.presetItem,
                selectedCharacter === char.id && styles.presetItemSelected,
              ]}
              onPress={() => setSelectedCharacter(char.id)}
              activeOpacity={0.7}
            >
              <View style={styles.characterCircle}>
                <Text style={styles.characterItemEmoji}>{char.emoji}</Text>
              </View>
              <Text
                style={[
                  styles.presetLabel,
                  selectedCharacter === char.id && styles.presetLabelSelected,
                ]}
              >
                {char.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 속도 설정 */}
        <Text style={styles.sectionTitle}>애니메이션 속도</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>느리게</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.5}
            value={speed}
            onValueChange={setSpeed}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#334155"
            thumbTintColor="#3b82f6"
          />
          <Text style={styles.sliderLabel}>빠르게</Text>
        </View>
        <Text style={styles.sliderValue}>{speed.toFixed(1)}x</Text>
      </ScrollView>

      {/* 생성하기 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createBtn, createAnimation.isPending && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={createAnimation.isPending}
          activeOpacity={0.85}
        >
          {createAnimation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.createBtnText}>생성하기</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  headerPlaceholder: { width: 36 },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  previewContainer: {
    width: 300,
    height: 300,
    borderRadius: 20,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    overflow: 'hidden',
  },
  previewImage: {
    width: 300,
    height: 300,
  },
  previewPlaceholder: {
    alignItems: 'center',
    gap: 10,
  },
  previewPlaceholderText: {
    color: 'rgba(248,250,252,0.4)',
    fontSize: 14,
  },
  characterOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  characterEmoji: {
    fontSize: 36,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 14,
  },
  presetsRow: {
    paddingBottom: 4,
    gap: 12,
    marginBottom: 28,
  },
  presetItem: {
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  presetColorCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetEmoji: {
    fontSize: 26,
  },
  presetLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  presetLabelSelected: {
    color: '#3b82f6',
  },
  characterCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterItemEmoji: {
    fontSize: 30,
  },
  footer: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 18,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'center',
  },
  sliderValue: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
  },
})
