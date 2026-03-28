---
paths:
  - "services/api/**"
---

# API 개발 규칙 (services/api)

## 스택
Fastify v5 + Prisma + PostgreSQL + BullMQ(Redis) + Claude API

## 핵심 제약사항

- `setErrorHandler`는 라우트 등록 **전에** 위치해야 plugin scope 적용됨
- ZodError 감지: `err.name === 'ZodError' || Array.isArray(err.issues)`
- BullMQ Redis 연결: `{ url: REDIS_URL }` 방식 (ioredis 인스턴스 직접 전달 시 타입 충돌)
- `RunningGoal` enum: `@map("5k")`, `@map("10k")` — 스키마 변경 후 `npx prisma generate` 필수

## 테스트
- 앱 팩토리: `src/test/app.ts`
- 테스트 위치: `src/__tests__/` (auth·runs·coaching·matching)
- `coaching.test.ts`는 `vi.mock('../workers/planGeneration')`을 파일 내 직접 선언

## 핵심 데이터 흐름
```
POST /runs → DB 저장 → BullMQ run-analysis
  → Claude API → CoachingInsight 저장
  → MatchProfile 업데이트
  → BullMQ route-art (5초 지연)
```

## 환경변수
필수: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`
선택: `OPENAI_API_KEY`, `PINECONE_API_KEY`, `REPLICATE_API_TOKEN`, `AI_PIPELINE_URL`

## AI 파이프라인
MVP: `services/api/src/workers/claude.ts`가 Claude API 직접 호출.
Phase 2+: BullMQ 워커 → `services/ai-pipeline` HTTP 위임.

## 개발 명령어
```bash
npm run dev          # tsx watch --env-file=../../.env (포트 3000)
npm run test         # vitest run
npx prisma db push   # 스키마 반영
npx prisma generate  # Client 재생성
```
