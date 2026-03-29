export const AppError = {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  EMAIL_TAKEN: { code: 'EMAIL_TAKEN', message: '이미 사용 중인 이메일이에요.' },
  INVALID_CREDENTIALS: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않아요.' },
  OAUTH_ACCOUNT: { code: 'OAUTH_ACCOUNT', message: 'Google 계정으로 가입된 이메일이에요. Google로 로그인해주세요.' },
  INVALID_TOKEN: { code: 'INVALID_TOKEN', message: '인증이 만료되었어요. 다시 로그인해주세요.' },
  INVALID_ID_TOKEN: { code: 'INVALID_ID_TOKEN', message: 'Google 인증에 실패했어요.' },
  INVALID_CODE: { code: 'INVALID_CODE', message: '인증 코드가 올바르지 않거나 만료되었어요.' },

  // ─── Resource ─────────────────────────────────────────────────────────────
  NOT_FOUND: { code: 'NOT_FOUND', message: '요청한 항목을 찾을 수 없어요.' },

  // ─── Match ────────────────────────────────────────────────────────────────
  INVALID_REQUEST: { code: 'INVALID_REQUEST', message: '올바르지 않은 요청이에요.' },
  ALREADY_MATCHED: { code: 'ALREADY_MATCHED', message: '이미 매칭 요청을 보냈어요.' },
  GROUP_FULL: { code: 'GROUP_FULL', message: '그룹 정원이 가득 찼어요.' },

  // ─── Message ──────────────────────────────────────────────────────────────
  INVALID_CONTENT: { code: 'INVALID_CONTENT', message: '메시지 내용을 입력해주세요.' },

  // ─── Global ───────────────────────────────────────────────────────────────
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: '입력 정보를 다시 확인해주세요.' },
  RATE_LIMIT_EXCEEDED: { code: 'RATE_LIMIT_EXCEEDED', message: '잠시 후 다시 시도해주세요.' },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: '서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.' },
} as const
