import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState, useRef, useEffect } from 'react'
import { useMessages } from '../../hooks/useMessages'
import type { Message } from '../../hooks/useMessages'
import * as SecureStore from 'expo-secure-store'

function MessageBubble({ message, currentUserId }: { message: Message; currentUserId: string }) {
  const isMine = message.senderId === currentUserId
  const time = new Date(message.createdAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      {!isMine && (
        <View style={styles.senderAvatar}>
          <Text style={styles.senderAvatarText}>
            {message.sender.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.bubbleContent}>
        {!isMine && (
          <Text style={styles.senderName}>{message.sender.displayName}</Text>
        )}
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.bubbleText, isMine ? styles.myBubbleText : styles.theirBubbleText]}>
            {message.content}
          </Text>
        </View>
        <Text style={[styles.timeText, isMine ? styles.timeRight : styles.timeLeft]}>{time}</Text>
      </View>
    </View>
  )
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>()
  const router = useRouter()
  const { messages, sendMessage, isConnected } = useMessages(matchId)
  const [input, setInput] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const flatListRef = useRef<FlatList>(null)

  // JWT에서 현재 사용자 ID 추출
  useEffect(() => {
    SecureStore.getItemAsync('access_token').then((token) => {
      if (!token) return
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setCurrentUserId(payload.sub)
      } catch {
        // 토큰 파싱 실패 시 무시
      }
    })
  }, [])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    sendMessage(trimmed)
    setInput('')
  }

  if (!currentUserId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'<'} 뒤로</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>채팅</Text>
          <View style={[styles.statusDot, isConnected ? styles.statusConnected : styles.statusDisconnected]} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* 메시지 목록 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} currentUserId={currentUserId} />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>첫 번째 메시지를 보내보세요!</Text>
            </View>
          }
        />

        {/* 입력창 */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor="#64748b"
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendBtnText}>전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: { paddingRight: 12 },
  backBtnText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusConnected: { backgroundColor: '#4ade80' },
  statusDisconnected: { backgroundColor: '#64748b' },

  // Message list
  messageList: { padding: 16, paddingBottom: 8 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#64748b', fontSize: 15 },

  // Bubbles
  bubbleRow: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  senderAvatarText: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  bubbleContent: { maxWidth: '75%' },
  senderName: { color: '#94a3b8', fontSize: 12, marginBottom: 4, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  myBubble: { backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  myBubbleText: { color: '#ffffff' },
  theirBubbleText: { color: '#f8fafc' },
  timeText: { fontSize: 11, color: '#64748b', marginTop: 4 },
  timeLeft: { textAlign: 'left', marginLeft: 4 },
  timeRight: { textAlign: 'right', marginRight: 4 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
