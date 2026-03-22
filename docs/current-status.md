# 현재 구현 현황

> 마지막 업데이트: 2026-03-22

---

## 전체 진행률

| 영역 | 상태 | 비고 |
|------|------|------|
| 백엔드 API | ✅ 완료 | Fastify v5, 주요 엔드포인트 구현 |
| 모바일 앱 | ✅ 완료 | Expo SDK 54, iOS 빌드 성공 |
| AI 파이프라인 | ✅ 완료 | Gemini 2.0 Flash, matplotlib 라우트 아트 |
| Docker 개발환경 | ✅ 완료 | 4개 서비스 구성 |
| CI/CD | 🔧 설정 중 | GitHub Actions 워크플로우 작성 완료, NAS 연결 미완 |
| NAS 배포 | ⏳ 대기 | SSH 접속 문제 해결 중 |

---

## 백엔드 (`services/api`)

### 구현된 엔드포인트

| 그룹 | 엔드포인트 | 설명 |
|------|-----------|------|
| **인증** | `POST /auth/register` | 회원가입 |
| | `POST /auth/login` | 로그인 |
| | `POST /auth/refresh` | 토큰 갱신 |
| | `POST /auth/forgot-password` | 비밀번호 찾기 (6자리 OTP, 응답에 코드 포함 — MVP) |
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
| `runAnalysis.worker` | `run-analysis` | 런 저장 후 Gemini로 코칭 인사이트 생성, MatchProfile 업데이트 |
| `routeArt.worker` | `route-art` | GPS 데이터 → ai-pipeline 호출 → 라우트 아트 이미지 저장 |
| `embeddingUpdate.worker` | `embedding-update` | ai-pipeline에 임베딩 업데이트 요청 |

### 주요 기술 결정

- **AI**: Anthropic → **Google Gemini 2.0 Flash** 교체 (무료 1500 req/day)
- **라우트 아트**: Replicate/SDXL → **matplotlib 3D** (완전 무료)
- **벡터 검색**: Pinecone 연동, DB 폴백 구현
- **푸시 알림**: Expo Push Notification Service (REST API)

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

### 네이티브 빌드 현황

- **빌드 방식**: Expo Prebuild (bare workflow)
- **Xcode 버전**: 26.3 (베타)
- **iOS 시뮬레이터**: iPhone 17 Pro (iOS 26.3)
- **빌드 상태**: ✅ 성공
- **알려진 제약**: HealthKit은 실기기 + Custom Dev Build 필요

---

## AI 파이프라인 (`services/ai-pipeline`)

### 구현된 API

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /art/generate` | GPS 좌표 → matplotlib 3D/2D 라우트 아트 (base64 PNG) |
| `POST /embeddings/update` | 러너 임베딩 벡터 Pinecone 업데이트 |

### 라우트 아트 렌더링

- **3D 모드**: 고도 분산 ≥ 5m 시 활성화. `Line3DCollection`, plasma 컬러맵, Z축=고도, 시작(#00ff88)/끝(#ff4455) 마커, 바닥 그림자
- **2D 모드**: 고도 데이터 없거나 분산 < 5m 시 `LineCollection` 폴백

---

## 인프라

### Docker Compose (개발)

```
infrastructure/docker/docker-compose.yml
├── postgres (TimescaleDB, 5432)
├── redis (7-alpine, 6379)
├── api (dev 스테이지, 3000 + 9229 디버거)
└── ai-pipeline (Python FastAPI, 8000)
```

**주요 설정**:
- `api` 빌드 컨텍스트: 모노레포 루트 (`../..`) — 워크스페이스 패키지 해결을 위해
- `node_modules` 익명 볼륨으로 호스트와 분리
- `GEMINI_API_KEY` 환경변수 명시 필요 (docker compose 실행 위치: 프로젝트 루트)

### Docker Compose (프로덕션)

```
infrastructure/docker/docker-compose.prod.yml
├── postgres (외부 포트 미노출)
├── redis (비밀번호 인증)
├── api (GHCR 이미지)
└── ai-pipeline (로컬 빌드)
```

### CI/CD (GitHub Actions)

```
.github/workflows/ci-cd.yml
```

| 단계 | 내용 | 조건 |
|------|------|------|
| Test | vitest (postgres/redis 서비스 컨테이너) | PR + master push |
| Build & Push | Docker 이미지 → GHCR | master push만 |
| Deploy | Tailscale VPN → SSH → NAS | master push만 |

**현재 상태**: 워크플로우 파일 작성 완료, GitHub Secrets 미등록

---

## 환경변수

### 백엔드 (`services/api` / `.env`)

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 연결 문자열 |
| `REDIS_URL` | ✅ | Redis 연결 URL |
| `JWT_SECRET` | ✅ | JWT 서명 키 |
| `GEMINI_API_KEY` | ✅ | Google Gemini API (무료 1500 req/day) |
| `AI_PIPELINE_SECRET` | ✅ | ai-pipeline 인증 시크릿 |
| `OPENAI_API_KEY` | ❌ | 임베딩 생성용 (Pinecone 사용 시) |
| `PINECONE_API_KEY` | ❌ | 벡터 유사도 검색 |

### 모바일 (`apps/mobile/.env.local`)

| 변수 | 설명 |
|------|------|
| `EXPO_PUBLIC_API_URL` | API 서버 URL (Mac IP 바뀌면 수동 갱신 필요) |

> ⚠️ Mac IP가 재부팅/네트워크 변경 시 바뀜. Mac 고정 IP 설정 권장.
