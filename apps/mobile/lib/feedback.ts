export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않아요.',
  EMAIL_TAKEN: '이미 사용 중인 이메일이에요.',
  OAUTH_ACCOUNT: 'Google 계정으로 가입된 이메일이에요. Google로 로그인해주세요.',
  INVALID_TOKEN: '인증이 만료되었어요. 다시 로그인해주세요.',
  INVALID_ID_TOKEN: 'Google 인증에 실패했어요.',
  INVALID_CODE: '인증 코드가 올바르지 않거나 만료되었어요.',
  NOT_FOUND: '요청한 항목을 찾을 수 없어요.',
  INVALID_REQUEST: '올바르지 않은 요청이에요.',
  ALREADY_MATCHED: '이미 매칭 요청을 보냈어요.',
  GROUP_FULL: '그룹 정원이 가득 찼어요.',
  INVALID_CONTENT: '메시지 내용을 입력해주세요.',
  UNAUTHORIZED: '로그인이 필요해요.',
  VALIDATION_ERROR: '입력 정보를 다시 확인해주세요.',
  RATE_LIMIT_EXCEEDED: '잠시 후 다시 시도해주세요.',
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
  const code = e?.error?.code || e?.code
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  const msg = e?.error?.message || e?.message
  if (msg === 'Network request failed' || msg === 'Failed to fetch') return ERROR_MESSAGES.NETWORK_ERROR
  return ERROR_MESSAGES.INTERNAL_ERROR
}
