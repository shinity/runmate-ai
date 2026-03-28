# 현재 구현 현황

> 마지막 업데이트: 2026-03-28

---

## 전체 진행률

| 영역 | 상태 | 비고 |
|------|------|------|
| 백엔드 API | ✅ 완료 | Fastify v5, 27개 엔드포인트 |
| 모바일 앱 | ✅ 완료 | Expo SDK 54, 18개 화면 |
| AI 파이프라인 | ✅ 완료 | Claude API, SVG 라우트 아트 (BullMQ 워커 내장) |
| Docker 개발환경 | ✅ 완료 | PostgreSQL + Redis |
| CI/CD | ✅ 완료 | GitHub Actions → NAS 자동 배포 |
| NAS 배포 | ✅ 완료 | Tailscale VPN + SSH, diho-box.synology.me:4000 |
| EAS Android 빌드 | ✅ 완료 | preview 프로파일 APK 빌드 |

---

## 백엔드 (`services/api`)

### 구현된 엔드포인트

| 그룹 | 엔드포인트 | 설명 |
|------|-----------|------|
| **인증** | `POST /auth/register` | 회원가입 |
| | `POST /auth/login` | 로그인 |
| | `POST /auth/refresh` | 토큰 갱신 |
| | `POST /auth/forgot-password` | 비밀번호 찾기 (OTP 응답 — MVP) |
| | `POST /auth/reset-password` | 비밀번호 재설정 |
| **런** | `POST /runs` | 런 기록 저장 + BullMQ 분석 큐 등록 |
| | `GET /runs` | 런 목록 조회 |
| | `GET /runs/:id` | 런 상세 조회 |
| | `GET /runs/stats/weekly` | 주간 통계 |
| | `GET /runs/personal-records` | 개인 기록 |
| **AI 코치** | `GET /coaching/insights` | 코칭 인사이트 목록 |
| | `POST /coaching/training-plan` | 훈련 계획 생성 |
| | `GET /coaching/training-plan/active` | 활성 훈련 계획 |
| **매칭** | `GET /match/suggestions` | 러닝메이트 추천 (Pinecone → DB 폴백) |
| | `GET /match/requests` | 받은 매칭 요청 |
| | `POST /match/request/:userId` | 매칭 요청 |
| | `POST /match/accept/:matchId` | 매칭 수락 |
| | `GET /match/matches` | 매칭된 목록 |
| | `GET /match/profile` | 매칭 프로필 조회 |
| | `PATCH /match/profile` | 매칭 프로필 수정 |
| **메시지** | `GET /messages/:matchId` | 메시지 목록 (커서 페이지네이션) |
| | `POST /messages/:matchId` | 메시지 전송 (REST 폴백) |
| | `PATCH /messages/:matchId/read` | 읽음 처리 |
| **WebSocket** | `GET /ws?token=JWT` | 실시간 메시지 |
| **동기화** | `POST /sync/devices/connect` | 기기 연결 (푸시 토큰 포함) |
| | `GET /sync/devices` | 연결된 기기 목록 |
| **사용자** | `GET /users/me` | 내 프로필 |
| | `PATCH /users/me` | 프로필 수정 |

### BullMQ 워커

| 워커 | 큐 | 동작 |
|------|-----|------|
| `runAnalysis.worker` | `run-analysis` | 런 저장 후 Claude API로 코칭 인사이트 생성, MatchProfile 업데이트 |
| `routeArt.worker` | `route-art` | GPS 데이터 → SVG 라우트 아트 생성 (자체 렌더링, 외부 의존 없음) |
| `embeddingUpdate.worker` | `embedding-update` | Pinecone 벡터 업데이트 |
| `planGeneration` | `plan-adaptation` | Claude API로 훈련 계획 생성 |

### 주요 기술 결정

- **AI**: Claude API (코칭 인사이트, 훈련 계획)
- **라우트 아트**: GPS 좌표 → SVG 직접 생성 (외부 의존 없음, `@fastify/static`으로 서빙)
- **벡터 검색**: Pinecone 연동, DB 폴백 구현
- **인증**: JWT 15분 + Refresh 30일, bcrypt 해싱
- **Rate Limiting**: @fastify/rate-limit (100 req/min)
- **로깅**: Pino (프로덕션: warn, 개발: info)

---

## 모바일 앱 (`apps/mobile`)

### 구현된 화면

| 화면 | 경로 | 주요 기능 |
|------|------|---------|
| 로그인 | `/(auth)/login` | 이메일/비밀번호, 비밀번호 찾기 링크 |
| 회원가입 | `/(auth)/register` | 이메일/비밀번호/이름 |
| 비밀번호 찾기 | `/(auth)/forgot-password` | 이메일 입력 → OTP 발급 |
| 비밀번호 재설정 | `/(auth)/reset-password` | OTP + 새 비밀번호 |
| 프로필 설정 | `/(onboarding)/profile-setup` | 경험 수준, 목표, 주간 거리 (3단계) |
| 홈 | `/(tabs)/index` | 주간 통계, 회복 상태, 최근 런, 코칭 인사이트 배너 |
| 런 | `/(tabs)/run` | GPS 실시간 추적, 런 종료 후 요약, 기록 히스토리 |
| AI 코치 | `/(tabs)/coach` | 인사이트 카드, 훈련 계획 생성/조회 |
| 매칭 | `/(tabs)/match` | 러닝메이트 추천, 요청/수락, 매칭 목록 |
| 프로필 | `/(tabs)/profile` | 내 정보, 건강 앱 동기화, 기기 관리 |
| 채팅 | `/chat/[matchId]` | 실시간 채팅 (WebSocket + REST 폴백) |
| 기기 관리 | `/devices` | 연결된 웨어러블 기기 |
| 매칭 설정 | `/match-settings` | 러닝 스타일, 매칭 활성화 토글 |

### 상태 관리

- **Zustand**: 인증(`stores/auth.ts`), 런(`stores/run.ts`)
- **TanStack Query**: 서버 상태 (캐싱, 리페치)

### 주요 훅

| 훅 | 역할 |
|----|------|
| `useHealthSync` | Apple HealthKit / Health Connect 워크아웃 동기화 |
| `usePushNotifications` | Expo 푸시 토큰 발급 및 기기 등록 |
| `useMessages` | WebSocket 메시지 (3초 재연결, REST 폴백) |
| `useRuns` | 런 목록 조회 및 캐싱 |

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
| Test | vitest 66개 (postgres/redis 서비스 컨테이너) | PR + master push |
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
| `PINECONE_API_KEY` | ❌ | 벡터 유사도 검색 (없으면 DB 폴백) |
| `UPLOADS_DIR` | ❌ | 라우트 아트 SVG 저장 경로 (기본: `/app/uploads`) |

### 모바일 (`apps/mobile/.env.local`)

| 변수 | 설명 |
|------|------|
| `EXPO_PUBLIC_API_URL` | API 서버 URL |
