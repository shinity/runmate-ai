# 현재 구현 현황

> 마지막 업데이트: 2026-04-02

---

## 전체 진행률

| 영역 | 상태 | 비고 |
|------|------|------|
| 백엔드 API | ✅ 완료 | Fastify v5, 30+ 엔드포인트 |
| 모바일 앱 | ✅ 완료 | Expo SDK 54, 21개 화면 |
| AI 파이프라인 | ✅ 완료 | Claude API + BullMQ 워커 4종 |
| Route Art | ✅ 완료 | GPS → SVG 자체 렌더링 |
| Animated Route Art | ✅ 완료 | SVG + 배경/캐릭터 → GIF (프리셋 12종) |
| 이메일 OTP | ✅ 완료 | Resend API |
| Google OAuth | ✅ 완료 | Android (Expo Auth Session) |
| Docker 개발환경 | ✅ 완료 | PostgreSQL + Redis |
| CI/CD | ✅ 완료 | GitHub Actions → NAS 자동 배포 |
| NAS 배포 | ✅ 완료 | Tailscale VPN + SSH |
| EAS Android 빌드 | ✅ 완료 | preview 프로파일 APK |

---

## 백엔드 (`services/api`)

### 구현된 엔드포인트

| 그룹 | 엔드포인트 | 설명 |
|------|-----------|------|
| **인증** | `POST /auth/register` | 회원가입 |
| | `POST /auth/login` | 이메일/비밀번호 로그인 |
| | `POST /auth/google` | Google OAuth 로그인 |
| | `POST /auth/refresh` | JWT 토큰 갱신 |
| | `POST /auth/forgot-password` | 비밀번호 찾기 (Resend OTP) |
| | `POST /auth/reset-password` | OTP + 새 비밀번호 재설정 |
| **런** | `POST /runs` | 런 기록 저장 + BullMQ 큐 등록 |
| | `GET /runs` | 런 목록 (커서 페이지네이션) |
| | `GET /runs/:id` | 런 상세 조회 |
| | `PATCH /runs/:id` | 런 정보 수정 |
| | `DELETE /runs/:id` | 런 삭제 |
| | `GET /runs/stats/weekly` | 주간 통계 |
| | `GET /runs/personal-records` | 개인 기록 |
| | `POST /runs/:id/animate` | Animated Route Art 생성 요청 |
| | `GET /runs/:id/animate/status` | 애니메이션 생성 상태 폴링 |
| **AI 코치** | `GET /coaching/insights` | 코칭 인사이트 목록 |
| | `POST /coaching/insights/:id/read` | 인사이트 읽음 처리 |
| | `GET /coaching/recovery` | 오늘의 회복 상태 |
| | `POST /coaching/plans/generate` | 훈련 계획 생성 |
| | `GET /coaching/plans` | 훈련 계획 목록 |
| | `GET /coaching/plans/:id` | 훈련 계획 상세 |
| | `PATCH /coaching/plans/:id` | 훈련 계획 상태 변경 |
| **매칭** | `GET /match/profile` | 매칭 프로필 조회 |
| | `PATCH /match/profile` | 매칭 프로필 수정 |
| | `GET /match/suggestions` | 러닝메이트 추천 (Pinecone → DB 폴백) |
| | `POST /match/request/:userId` | 매칭 요청 |
| | `GET /match/requests` | 받은 매칭 요청 목록 |
| | `PATCH /match/:matchId` | 매칭 수락/거절 |
| | `GET /match/active` | 매칭된 러너 목록 |
| | `GET /match/groups` | 공개 러닝 그룹 목록 |
| | `POST /match/groups` | 그룹 생성 |
| | `POST /match/groups/:id/join` | 그룹 가입 |
| **메시지** | `GET /messages/:matchId` | 메시지 목록 (커서 페이지네이션) |
| | `POST /messages/:matchId` | 메시지 전송 (REST 폴백) |
| | `PATCH /messages/:matchId/read` | 읽음 처리 |
| **WebSocket** | `GET /ws?token=JWT` | 실시간 메시지 |
| **동기화** | `POST /sync/devices/connect` | 기기 등록 (푸시 토큰 포함) |
| | `GET /sync/devices` | 연결된 기기 목록 |
| | `POST /sync/devices/:id/sync` | 수동 동기화 |
| | `DELETE /sync/devices/:id` | 기기 제거 |
| **사용자** | `GET /users/me` | 내 프로필 |
| | `PATCH /users/me` | 프로필 수정 |

### BullMQ 워커

| 워커 | 큐 | 동작 |
|------|-----|------|
| `runAnalysis.worker` | `run-analysis` | 런 저장 후 Claude API로 코칭 인사이트 생성 + MatchProfile 업데이트 |
| `routeArt.worker` | `route-art` | GPS 좌표 → SVG 생성, `/app/uploads/`에 저장 |
| `animateRouteArt.worker` | `animate-route-art` | 배경 + 경로 + 캐릭터 합성 → GIF 인코딩 (Sharp) |
| `embeddingUpdate.worker` | `embedding-update` | Pinecone 벡터 업데이트 |

### 주요 기술 결정

- **AI**: Claude API (claude-sonnet-4-6) — 코칭 인사이트, 훈련 계획
- **Route Art**: GPS 좌표 → SVG 직접 생성 (외부 의존 없음)
- **Animated Route Art**: Sharp로 프레임 합성 → GIF 인코딩 (512×512, 15fps)
- **벡터 검색**: Pinecone 연동, DB 폴백 구현
- **인증**: JWT 15분 + Refresh Token 30일, bcrypt 해싱
- **이메일**: Resend API (OTP 발송)
- **Rate Limiting**: @fastify/rate-limit (100 req/min)
- **에러 코드**: 중앙화된 에러 코드 시스템 (`src/lib/errors.ts`)

---

## 모바일 앱 (`apps/mobile`)

### 화면 목록 (21개)

#### 인증 그룹 `/(auth)`

| 화면 | 경로 | 주요 기능 |
|------|------|---------|
| 로그인 | `/(auth)/login` | 이메일/비밀번호 로그인, Google OAuth, 회원가입 링크 |
| 회원가입 | `/(auth)/register` | 이메일/비밀번호/이름 입력 |
| 비밀번호 찾기 | `/(auth)/forgot-password` | 이메일 입력 → OTP 발송 (Resend) |
| 비밀번호 재설정 | `/(auth)/reset-password` | OTP 인증 + 새 비밀번호 입력 |

#### 온보딩 그룹 `/(onboarding)`

| 화면 | 경로 | 주요 기능 |
|------|------|---------|
| 프로필 설정 | `/(onboarding)/profile-setup` | 3단계: 경험 레벨 → 목표 → 주간 거리 목표 |

#### 메인 탭 `/(tabs)`

| 화면 | 경로 | 주요 기능 |
|------|------|---------|
| 홈 | `/(tabs)/index` | 주간 통계, 오늘의 컨디션, 최근 런, 코칭 인사이트 배너 |
| 런 | `/(tabs)/run` | GPS 실시간 추적 + 타이머/거리/페이스, 런 히스토리 |
| AI 코치 | `/(tabs)/coach` | 인사이트 카드 피드, 회복 상태, 훈련 계획 목록/생성 |
| 갤러리 | `/(tabs)/gallery` | Route Art 2열 그리드, GIF 뱃지, 무한 스크롤 |
| 프로필 | `/(tabs)/profile` | 내 정보, 개인 기록, 건강앱 연동, 기기 관리, 설정 |

#### Route Art

| 화면 | 경로 | 주요 기능 |
|------|------|---------|
| Route Art 상세 | `/route-art/[id]` | SVG 풀스크린, 런 요약, 카메라롤 저장, PNG 공유, 애니메이션 이동 |
| 애니메이션 제작 | `/route-art/[id]/animate` | 배경 12종 + 캐릭터 12종 + 속도 슬라이더 |
| 생성 진행 | `/route-art/[id]/animate/progress` | 단계별 진행 상태 (3초 폴링) |
| 애니메이션 결과 | `/route-art/[id]/animate/result` | GIF 자동 재생, 카메라롤 저장, GIF 공유 |

#### 기타 화면

| 화면 | 경로 | 주요 기능 |
|------|------|---------|
| 채팅 | `/chat/[matchId]` | 실시간 채팅 (WebSocket + REST 폴백, 3초 재연결) |
| 기기 관리 | `/devices` | 연결된 웨어러블 기기 목록 |
| 매칭 설정 | `/match-settings` | 러닝 스타일, 매칭 활성화 토글 |
| 프로필 수정 | `/profile-edit` | 이름, 경험 레벨, 목표, 주간 거리 수정 |

#### 모달

| 컴포넌트 | 위치 | 주요 기능 |
|---------|------|---------|
| RunDetailModal | `components/RunDetailModal.tsx` | 런 상세 (Route Art 폴링 포함), 삭제 |
| Toast | `components/Toast.tsx` | 전역 에러/성공 알림 |

### 상태 관리

| 스토어 | 파일 | 역할 |
|--------|------|------|
| auth | `stores/auth.ts` | JWT, 사용자 정보, 로그인/로그아웃 |
| run | `stores/run.ts` | 진행 중인 런 상태 (GPS, 타이머) |
| gallery | `stores/gallery.ts` | Route Art 갤러리 상태 |
| toast | `stores/toast.ts` | 전역 Toast 메시지 |

### 주요 훅

| 훅 | 파일 | 역할 |
|----|------|------|
| `useRuns` | `hooks/useRuns.ts` | 런 목록 조회 및 캐싱 (TanStack Query) |
| `useGoogleAuth` | `hooks/useGoogleAuth.ts` | Google OAuth (Expo Auth Session) |
| `useSaveImage` | `hooks/useSaveImage.ts` | 카메라롤 저장 (expo-media-library) |
| `useHealthSync` | `hooks/useHealthSync.ts` | Apple HealthKit / Health Connect |
| `usePushNotifications` | `hooks/usePushNotifications.ts` | Expo 푸시 토큰 등록 |
| `useMessages` | `hooks/useMessages.ts` | WebSocket 메시지 (재연결, REST 폴백) |

### EAS 빌드 현황

| 프로파일 | 플랫폼 | 출력 | 상태 |
|---------|--------|------|------|
| `preview` | Android | APK (debug) | ✅ 빌드 성공 |
| `production` | Android | AAB | 미시작 |
| `production` | iOS | IPA | Apple Developer Program 필요 |

---

## 인프라

### 운영 환경 (NAS)

```
Synology NAS (diho-box.synology.me:4000)
├── nginx (포트 4000)       — 리버스 프록시, rate limit, gzip
├── api (포트 3000 내부)    — Fastify API 서버
├── postgres (포트 5432)    — PostgreSQL 16
└── redis (포트 6379)       — BullMQ 작업 큐
```

### CI/CD (GitHub Actions)

| 단계 | 내용 | 조건 |
|------|------|------|
| Test | vitest (postgres/redis 서비스 컨테이너) | PR + master push |
| Build & Push | Docker 이미지 → GHCR (최근 5개 유지) | master push만 |
| Deploy | Tailscale VPN → SSH → NAS 자동 배포 | master push만 |
| Rollback | 헬스체크 실패 시 :previous 이미지로 자동 복구 | 배포 실패 시 |

---

## 환경변수

### 백엔드 (`services/api` / `.env`)

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 연결 문자열 |
| `REDIS_URL` | ✅ | Redis 연결 URL |
| `JWT_SECRET` | ✅ | JWT 서명 키 |
| `ANTHROPIC_API_KEY` | ✅ | Claude API (코칭 인사이트, 훈련 계획) |
| `RESEND_API_KEY` | ✅ | Resend 이메일 (OTP 발송) |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth |
| `PINECONE_API_KEY` | ❌ | 벡터 유사도 검색 (없으면 DB 폴백) |
| `UPLOADS_DIR` | ❌ | Route Art 저장 경로 (기본: `/app/uploads`) |

### 모바일 (`apps/mobile/.env.local`)

| 변수 | 설명 |
|------|------|
| `EXPO_PUBLIC_API_URL` | API 서버 URL |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
