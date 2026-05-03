import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image,
} from 'react-native'
import { Link } from 'expo-router'
import { useAuthStore } from '../../stores/auth'
import { useGoogleAuth } from '../../hooks/useGoogleAuth'
import { useAppleAuth } from '../../hooks/useAppleAuth'
import { useToast } from '../../components/Toast'
import { getErrorMessage } from '../../lib/feedback'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading } = useAuthStore()
  const { promptAsync, request } = useGoogleAuth()
  const { signIn: appleSignIn, available: appleAvailable } = useAppleAuth()
  const { showToast } = useToast()

  async function handleLogin() {
    if (!email.trim() || !password) {
      showToast('error', '이메일과 비밀번호를 입력해주세요.')
      return
    }
    try {
      await login(email.trim(), password)
    } catch (e: any) {
      showToast('error', getErrorMessage(e))
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>RunMate AI</Text>
        <Text style={styles.subtitle}>AI 러닝 코치와 함께하세요</Text>

        <View style={styles.form}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="이메일을 입력하세요"
            placeholderTextColor="#475569"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호를 입력하세요"
            placeholderTextColor="#475569"
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>로그인</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 구분선 */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google 로그인 */}
        <TouchableOpacity
          style={[styles.googleButton, !request && styles.btnDisabled]}
          onPress={() => promptAsync()}
          disabled={!request}
        >
          <Text style={styles.googleButtonText}>Google로 계속하기</Text>
        </TouchableOpacity>

        {/* Apple 로그인 */}
        {appleAvailable && (
          <TouchableOpacity
            style={styles.appleButton}
            onPress={async () => {
              try {
                await appleSignIn()
              } catch (e: any) {
                showToast('error', getErrorMessage(e))
              }
            }}
          >
            <Text style={styles.appleButtonText}>Apple로 계속하기</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>계정이 없으신가요? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>회원가입</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={{ marginTop: 12, alignSelf: 'center' }}>
            <Text style={{ color: '#64748b', fontSize: 14 }}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 80, height: 80, borderRadius: 20, alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '800', color: '#f8fafc', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 40 },
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#334155' },
  dividerText: { color: '#64748b', fontSize: 13, marginHorizontal: 12 },
  googleButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleButtonText: { color: '#111827', fontWeight: '700', fontSize: 16 },
  appleButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  appleButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#64748b', fontSize: 14 },
  footerLink: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
})
