export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않아요.',
  EMAIL_TAKEN: '이미 사용 중인 이메일이에요.',
  UNAUTHORIZED: '로그인이 필요해요.',
  RATE_LIMIT_EXCEEDED: '잠시 후 다시 시도해주세요.',
  VALIDATION_ERROR: '입력 정보를 다시 확인해주세요.',
  OAUTH_ACCOUNT: '소셜 로그인으로 가입된 계정이에요. Google로 로그인해주세요.',
  INTERNAL_ERROR: '서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
  NETWORK_ERROR: '인터넷 연결을 확인해주세요.',
}

export const SUCCESS_MESSAGES = {
  RUN_SAVED: '런 기록이 저장됐어요! 🎉',
  PROFILE_UPDATED: '프로필이 업데이트됐어요.',
  PASSWORD_RESET_SENT: '비밀번호 재설정 이메일을 보냈어요.',
  PASSWORD_RESET_SUCCESS: '비밀번호가 변경됐어요.',
}

export function getErrorMessage(e: any): string {
  const code = e?.code || e?.error?.code
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  const msg = e?.message || e?.error?.message
  if (msg && ERROR_MESSAGES[msg]) return ERROR_MESSAGES[msg]
  if (typeof msg === 'string' && msg.length < 100) return msg
  return ERROR_MESSAGES.INTERNAL_ERROR
}
