---
paths:
  - "apps/mobile/**"
---

# 모바일 개발 규칙 (apps/mobile)

## 스택
Expo SDK 54 / React Native 0.81.5 / Expo Router (파일 기반 라우팅)

## 라우팅 구조
```
app/_layout.tsx          QueryClientProvider + AuthGuard (isInitialized 후 리디렉션)
app/(auth)/login.tsx     로그인
app/(auth)/register.tsx  회원가입
app/(tabs)/index.tsx     홈 (주간 통계, 회복 상태)
app/(tabs)/run.tsx       런 기록 (GPS 추적)
app/(tabs)/coach.tsx     AI 코치 (인사이트, 훈련 계획 생성 모달)
app/(tabs)/match.tsx     러닝메이트 매칭
app/(tabs)/profile.tsx   프로필
```

## 상태 관리
- **서버 상태** (API 데이터): TanStack Query → `hooks/` 에 커스텀 훅으로 분리
- **클라이언트 상태**: Zustand → `stores/`
  - `useAuthStore` — `user`, `isAuthenticated`, `login`, `logout`, `loadUser`
  - `useRunStore` — GPS 트래킹, 타이머, 데이터포인트

## API 클라이언트 (`lib/api.ts`)
401 시 자동 refresh → 재시도 → 실패 시 토큰 삭제

## Monorepo hoisting 대응
- `metro.config.js`: `nodeModulesPaths`로 `apps/mobile/node_modules` 우선
- `babel.config.js`: `expoRouterBabelPlugin` 직접 require (hasModule 체크 우회)

## 패키지 설치
```bash
npm install <pkg> --legacy-peer-deps  # 항상 필수
npx expo install --fix               # SDK 54 호환 버전 자동 수정
```

## 개발 명령어
```bash
npx expo start --clear   # Metro 실행 (--clear 권장)
npm test                 # Jest
```
