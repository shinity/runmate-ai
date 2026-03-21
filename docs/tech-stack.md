# Tech Stack

## 전체 구조

```
┌─────────────────────────────────────────┐
│           apps/mobile                   │
│     Expo + React Native (iOS/Android)   │
└──────────────────┬──────────────────────┘
                   │ REST API (JWT)
┌──────────────────▼──────────────────────┐
│           services/api                  │
│        Fastify v5 + TypeScript          │
│   Prisma │ BullMQ │ Claude API          │
└──────┬───────────────────┬──────────────┘
       │                   │ BullMQ Queue
┌──────▼──────┐   ┌────────▼────────────┐
│ PostgreSQL  │   │       Redis         │
│(TimescaleDB)│   │  (Queue + Cache)    │
└─────────────┘   └─────────────────────┘
                   │ HTTP (Phase 2+)
┌──────────────────▼──────────────────────┐
│         services/ai-pipeline            │
│   Python FastAPI + OpenAI + Pinecone    │
└─────────────────────────────────────────┘
```

---

## 모바일 (`apps/mobile`)

### 핵심 프레임워크

| 기술 | 버전 | 역할 |
|------|------|------|
| **Expo** | SDK 52 | React Native 빌드/배포 플랫폼 |
| **React Native** | 0.76 | 크로스플랫폼 네이티브 UI |
| **Expo Router** | v4 | 파일 기반 라우팅 (`app/` 디렉토리) |
| **TypeScript** | 5.x | 정적 타입 |

### 상태 관리

| 기술 | 용도 |
|------|------|
| **Zustand** | 클라이언트 상태 (인증, 활성 런 GPS 추적) |
| **TanStack Query** | 서버 상태 (API 데이터 캐싱, 재검증) |

**원칙**: 서버에서 오는 데이터는 TanStack Query, UI·기기 상태는 Zustand로 명확히 분리.

### 네트워킹

| 기술 | 역할 |
|------|------|
| **axios** | HTTP 클라이언트 (`lib/api.ts`) |
| **expo-secure-store** | JWT 토큰 안전 저장 (iOS Keychain / Android Keystore) |

`lib/api.ts` 인터셉터가 401 응답 시 `refreshToken`으로 자동 재발급 처리.

### 주요 라이브러리

| 라이브러리 | 용도 |
|-----------|------|
| `expo-location` | GPS 좌표 수집 (런 추적) |
| `expo-sensors` | 가속도계 (케이던스 측정) |
| `@expo/vector-icons` | Ionicons 아이콘 |
| `react-native-maps` | 지도 렌더링 |

---

## 백엔드 (`services/api`)

### 핵심 프레임워크

| 기술 | 버전 | 역할 |
|------|------|------|
| **Fastify** | v5 | HTTP 서버 (Node.js 최고 성능 프레임워크) |
| **TypeScript** | 5.x | 정적 타입 |
| **tsx** | 4.x | TypeScript 직접 실행 (개발) / `--env-file` 지원 |

Fastify 선택 이유: Express 대비 2~3배 높은 처리량, 스키마 기반 직렬화, 플러그인 시스템.

### Fastify 플러그인

| 플러그인 | 역할 |
|---------|------|
| `@fastify/jwt` | JWT 발급/검증, `app.authenticate` 데코레이터 |
| `@fastify/cors` | CORS 설정 |
| `@fastify/rate-limit` | 요청 속도 제한 |
| `@fastify/swagger` + `swagger-ui` | API 문서 자동 생성 (`/docs`) |

### ORM / 데이터베이스

| 기술 | 역할 |
|------|------|
| **Prisma** | ORM — 스키마 정의, 마이그레이션, 타입 안전 쿼리 |
| **PostgreSQL 16** | 메인 데이터베이스 |
| **TimescaleDB** | PostgreSQL 확장 — Phase 2에서 GPS 시계열 데이터 하이퍼테이블 |

Prisma 선택 이유: TypeScript 타입 자동 생성, 직관적인 스키마 DSL, 마이그레이션 관리.

### 비동기 처리

| 기술 | 역할 |
|------|------|
| **BullMQ** | Redis 기반 작업 큐 |
| **Redis** | BullMQ 브로커 + 향후 캐시 레이어 |

**큐 4개**:
- `run-analysis` — 런 완료 후 Claude AI 코칭 인사이트 생성
- `plan-adaptation` — 훈련 계획 자동 조정
- `embedding-update` — 매칭 프로필 임베딩 갱신 (Phase 2)
- `route-art` — 라우트 아트 생성 (Phase 3, 5초 지연)

Redis 연결: `{ url: REDIS_URL }` 방식 (ioredis 인스턴스 직접 전달 시 BullMQ 내부 버전 충돌 발생).

### AI 연동

| 기술 | 역할 |
|------|------|
| **Claude API** (`@anthropic-ai/sdk`) | 코칭 인사이트 생성, 훈련 계획 생성 |
| **모델** | `claude-sonnet-4-5` |
| **temperature** | 계획 생성 `0.3` (일관성) / 동기부여 `0.7` (다양성) |

응답 파싱: JSON 코드블록 정규식 추출 → `JSON.parse` → 스키마 검증.

### 유효성 검사

| 기술 | 역할 |
|------|------|
| **Zod** | 런타임 입력 검증 (`@runmate/validators` 공유 패키지) |
| **bcryptjs** | 비밀번호 해시 (salt rounds: 12) |

---

## 공유 패키지 (`packages/`)

| 패키지 | 역할 |
|--------|------|
| `@runmate/types` | TypeScript 인터페이스 — API/모바일 공통 타입 |
| `@runmate/validators` | Zod 스키마 — API 요청 검증 + 모바일 폼 검증 공유 |

빌드 순서: `types` → `validators` → `api` / `mobile`.
변경 시 반드시 `npm run build --workspace=packages/types` 먼저 실행.

---

## AI 파이프라인 (`services/ai-pipeline`) — Phase 2+

| 기술 | 역할 |
|------|------|
| **Python 3.11** | 런타임 |
| **FastAPI** | HTTP 서버 (비동기) |
| **OpenAI SDK** | `text-embedding-3-small` (1536차원) 임베딩 생성 |
| **Pinecone** | 벡터 DB — 러너 프로필 유사도 검색 |
| **Replicate** | SDXL 이미지 생성 — 라우트 아트 (Phase 3) |

MVP에서는 API 서버가 Claude API를 직접 호출. Phase 2부터 이 서비스로 AI 처리 분리.

---

## 인프라

### 로컬 개발

| 기술 | 역할 |
|------|------|
| **Docker Desktop** | 컨테이너 런타임 |
| **Docker Compose** | PostgreSQL + Redis 로컬 실행 (`infrastructure/docker/`) |
| **TimescaleDB 이미지** | `timescale/timescaledb:latest-pg16` |

### 모노레포

| 기술 | 역할 |
|------|------|
| **Turborepo** | 모노레포 빌드 오케스트레이션, 캐싱 |
| **npm workspaces** | 패키지 간 의존성 관리 |

---

## 개발 도구

| 도구 | 역할 |
|------|------|
| **Claude Code** | AI 코딩 어시스턴트 (에이전트 팀 구성) |
| **Prisma Studio** | DB GUI (`npx prisma studio`) |
| **Expo Go / Dev Client** | 모바일 앱 실시간 미리보기 |
| **GitHub** | 버전 관리 (`master` / `develop` 브랜치 전략) |

---

## 환경변수 요약

| 변수 | 서비스 | 필수 |
|------|--------|------|
| `DATABASE_URL` | API | ✅ |
| `REDIS_URL` | API | ✅ |
| `JWT_SECRET` | API | ✅ |
| `ANTHROPIC_API_KEY` | API | ✅ (AI 기능) |
| `OPENAI_API_KEY` | AI Pipeline | Phase 2 |
| `PINECONE_API_KEY` | AI Pipeline | Phase 2 |
| `REPLICATE_API_TOKEN` | AI Pipeline | Phase 3 |
| `EXPO_PUBLIC_API_URL` | Mobile | ✅ |
