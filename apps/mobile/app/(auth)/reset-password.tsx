import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../lib/api'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const { email } = useLocalSearchParams<{ email: string }>()

  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleResetPassword() {
    if (!code.trim() || !newPassword || !confirmPassword) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.')
      return
    }
    if (code.trim().length !== 6) {
      Alert.alert('입력 오류', '인증 코드는 6자리입니다.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.')
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', {
        email,
        code: code.trim(),
        newPassword,
      })
      Alert.alert(
        '완료',
        '비밀번호가 변경되었습니다',
        [
          {
            text: '확인',
            onPress: () => router.replace('/(auth)/login'),
          },
        ],
      )
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '비밀번호 변경에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <Text style={styles.title}>새 비밀번호 설정</Text>
        <Text style={styles.subtitle}>
          이메일로 받은 6자리 인증 코드와 새 비밀번호를 입력하세요
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>인증 코드</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="6자리 인증 코드"
            placeholderTextColor="#475569"
            keyboardType="number-pad"
            maxLength={6}
          />

          <Text style={styles.label}>새 비밀번호</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="새 비밀번호를 입력하세요"
            placeholderTextColor="#475569"
            secureTextEntry
            autoComplete="new-password"
          />

          <Text style={styles.label}>비밀번호 확인</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="비밀번호를 다시 입력하세요"
            placeholderTextColor="#475569"
            secureTextEntry
            autoComplete="new-password"
          />

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>비밀번호 변경</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, padding: 24, paddingTop: 60 },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', lineHeight: 22, marginBottom: 40 },
  form: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
