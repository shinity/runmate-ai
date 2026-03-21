# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개발 명령어

### 전체 워크스페이스

```bash
npm install                        # 전체 의존성 설치
npm run build                      # 전체 빌드 (Turborepo)
npm run type-check                 # 전체 타입 체크
```

### API 서버 (`services/api`)

```bash
cd services/api
npm run dev                        # tsx watch로 개발 서버 실행 (포트 3000)
npm run build                      # tsc 빌드
npx tsc --noEmit                   # 타입 체크만
npx prisma db push                 # 스키마를 DB에 반영 (마이그레이션 없이)
npx prisma migrate dev             # 마이그레이션 생성 + 적용
npx prisma generate                # Prisma Client 재생성
npx prisma studio                  # DB GUI (포트 5555)
DATABASE_URL="postgresql://..." npm run dev  # 환경변수 직접 지정 시
```

### 공유 패키지 (`packages/*`)

```bash
npm run build --workspace=packages/types       # types 빌드
npm run build --workspace=packages/validators  # validators 빌드
# API나 모바일 작업 전에 반드시 먼저 빌드해야 타입이 인식됨
```

### 모바일 앱 (`apps/mobile`)

```bash
cd apps/mobile
npx expo start                     # Metro Bundler 실행
npx expo start --ios               # iOS 시뮬레이터
npx expo start --android           # Android 에뮬레이터
```

### AI 파이프라인 (`services/ai-pipeline`)

```bash
cd services/ai-pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 로컬 인프라

```bash
brew services start postgresql@16  # PostgreSQL 시작 (Homebrew 설치 기준)
brew services start redis          # Redis 시작
# PostgreSQL 접속: postgresql://devshin@localhost:5432/runmate (OS 유저명)
```

---

## 아키텍처

### 모노레포 구조

Turborepo + npm workspaces. 빌드 의존성: `packages/types` → `packages/validators` → `services/api` / `apps/mobile`.

```
packages/types       공유 TypeScript 인터페이스 (User, Run, CoachingPlan, MatchProfile 등)
packages/validators  공유 Zod 스키마 (API 요청 검증, 모바일/API 양쪽에서 사용)
services/api         Fastify REST API
services/ai-pipeline Python FastAPI (AI 전용 처리)
apps/mobile          Expo React Native 앱
```

### API 서버 (`services/api`)

- **진입점**: `src/index.ts` — Fastify 인스턴스 생성, 플러그인 등록, 라우트 마운트
- **인증**: `@fastify/jwt`. `app.authenticate` 데코레이터로 보호 (`src/types/fastify.d.ts`에 타입 선언)
- **라우트**: `src/routes/` — auth, users, runs, coaching, matching, sync
- **비동기 처리**: BullMQ 큐 4개 (run-analysis, plan-adaptation, embedding-update, route-art). Redis 연결은 URL string 방식 사용 (`{ url: REDIS_URL }`) — ioredis 인스턴스 직접 전달 시 BullMQ 내부 ioredis와 타입 충돌 발생
- **Claude 연동**: `src/workers/claude.ts` — 런 분석 인사이트, 훈련 계획 생성. 응답은 JSON 파싱 후 저장
- **DB**: Prisma + PostgreSQL. `src/lib/prisma.ts`에서 싱글턴 export

#### Prisma 주의사항
- `RunningGoal` enum: DB 값은 `five_k`, `ten_k`이나 `@map("5k")`, `@map("10k")`로 매핑됨
- 스키마 변경 후 `npx prisma generate` 필수

### 모바일 앱 (`apps/mobile`)

- **라우팅**: Expo Router (파일 기반). `app/(tabs)/` 하위 5개 탭 화면
- **상태**: Zustand — `stores/auth.ts` (인증), `stores/run.ts` (활성 런 GPS 추적)
- **서버 상태**: TanStack Query — `hooks/useRuns.ts`, `hooks/useCoaching.ts`
- **API 클라이언트**: `lib/api.ts` — JWT 만료 시 자동 refresh, `expo-secure-store`에 토큰 저장
- **환경변수**: `EXPO_PUBLIC_API_URL`로 API 베이스 URL 설정

### AI 파이프라인 (`services/ai-pipeline`)

API 서버의 BullMQ 워커가 완료된 작업을 이 서비스에 HTTP로 위임하는 구조 (Phase 2+). MVP에서는 `services/api/src/workers/claude.ts`가 Claude API를 직접 호출.

- `coaches/post_run_coach.py` — 런 완료 후 Claude 분석
- `matching/embeddings.py` — OpenAI 임베딩 생성 + Pinecone upsert/query
- `art/route_art.py` — GPS 좌표 → Replicate SDXL 프롬프트 생성 + 요청

### 데이터 흐름 (핵심 경로)

```
모바일 POST /runs
  → RunService DB 저장
  → BullMQ run-analysis 큐 enqueue
  → Worker: Claude API 호출 → CoachingInsight 저장
  → Worker: MatchProfile 업데이트 (avgPace, avgWeeklyKm)
  → BullMQ route-art 큐 enqueue (5초 지연)
```

### 환경변수 (`services/api`)

필수: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`
선택: `OPENAI_API_KEY`, `PINECONE_API_KEY`, `REPLICATE_API_TOKEN`, `AI_PIPELINE_URL`
