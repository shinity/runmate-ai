# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개발 워크플로우

코드 변경 시 **구현 → 테스트 → 문서화** 순서를 따른다. 테스트 없이 구현 완료로 판단하지 않는다.
- 엔드포인트/모델 변경 → `docs/api-reference.md`, `docs/data-domain.md`, `docs/erd.md` 업데이트
- 플로우 변경 → `docs/user-flow.md` 업데이트

## 개발 명령어

```bash
# 전체
npm install --legacy-peer-deps   # peer dep 충돌로 --legacy-peer-deps 필수
npm run build                    # Turborepo 전체 빌드

# API (services/api)
npm run dev          # tsx watch --env-file=../../.env (포트 3000)
npm run test         # vitest run (38개)
npx prisma db push   # 스키마 반영
npx prisma generate  # Client 재생성

# 모바일 (apps/mobile)
npx expo start --clear           # Metro 실행 (--clear 권장)
npm test                         # Jest (28개)
npx expo install --fix           # SDK 54 호환 버전 자동 수정
npm install <pkg> --legacy-peer-deps  # 패키지 설치 시 필수

# 인프라 (Docker)
docker compose up -d    # PostgreSQL(5432) + Redis(6379)
```

DB: `postgresql://runmate:runmate_dev@localhost:5432/runmate`
환경변수: 루트 `.env` (API), `apps/mobile/.env.local` (모바일)

## 아키텍처

### 모노레포
Turborepo + npm workspaces. 빌드 순서: `packages/types` → `packages/validators` → `services/api` / `apps/mobile`.

### API (`services/api`)
- Fastify v5 + Prisma + PostgreSQL + BullMQ(Redis) + Claude API
- `setErrorHandler`는 라우트 등록 **전에** 위치해야 plugin scope 적용됨
- ZodError 감지: `err.name === 'ZodError' || Array.isArray(err.issues)`
- BullMQ Redis 연결: `{ url: REDIS_URL }` 방식 (ioredis 인스턴스 직접 전달 시 타입 충돌)
- `RunningGoal` enum: `@map("5k")`, `@map("10k")` — 스키마 변경 후 `npx prisma generate` 필수
- 테스트: `src/test/app.ts` (앱 팩토리), `src/__tests__/` (auth·runs·coaching·matching)
- `coaching.test.ts`는 `vi.mock('../workers/planGeneration')`을 파일 내 직접 선언

### 모바일 (`apps/mobile`, Expo SDK 54 / RN 0.81.5)

**라우팅 구조**
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

**상태**: Zustand (`stores/auth.ts`, `stores/run.ts`) + TanStack Query (`hooks/`)

**API 클라이언트** (`lib/api.ts`): 401 시 자동 refresh → 재시도 → 실패 시 토큰 삭제

**Monorepo hoisting 대응**
- `metro.config.js`: `nodeModulesPaths`로 `apps/mobile/node_modules` 우선
- `babel.config.js`: `expoRouterBabelPlugin` 직접 require (hasModule 체크 우회)

**테스트** (`src/__tests__/`): format·auth-store·run-store·api-client (expo-location, expo-secure-store, fetch mock)

### AI 파이프라인 (`services/ai-pipeline`)
MVP: `services/api/src/workers/claude.ts`가 Claude API 직접 호출.
Phase 2+: BullMQ 워커 → 이 서비스에 HTTP 위임.

### 핵심 데이터 흐름
```
POST /runs → DB 저장 → BullMQ run-analysis
  → Claude API → CoachingInsight 저장
  → MatchProfile 업데이트
  → BullMQ route-art (5초 지연)
```

### 환경변수 (`services/api`)
필수: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`
선택: `OPENAI_API_KEY`, `PINECONE_API_KEY`, `REPLICATE_API_TOKEN`, `AI_PIPELINE_URL`
