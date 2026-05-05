# CLAUDE.md

RunMate AI — AI 코칭 기반 러닝 앱. Turborepo 모노레포.

## 개발 워크플로우

**구현 → 테스트 → 문서화** 순서 준수.
- 엔드포인트/모델 변경 → `docs/api-reference.md`, `docs/data-domain.md`, `docs/erd.md` 업데이트
- 플로우 변경 → `docs/user-flow.md` 업데이트

## 핵심 명령어

```bash
# 의존성 설치 (항상 --legacy-peer-deps 필수)
npm install --legacy-peer-deps

# 전체 빌드
npm run build

# 인프라
docker compose up -d    # PostgreSQL(5432) + Redis(6379)
```

## 모노레포 구조

```
packages/types       — 공유 타입
packages/validators  — Zod 스키마
services/api         — Fastify API (포트 3000)
apps/mobile          — Expo 앱
```

## 환경변수
- API: 루트 `.env`
- 모바일: `apps/mobile/.env.local`

> 역할별 세부 규칙은 `.claude/rules/` 참조 (파일 열면 자동 로드)

---

## API 엔드포인트 맵

| 도메인 | prefix | 주요 엔드포인트 |
|--------|--------|----------------|
| **Auth** | `/api/v1/auth` | POST /register, /login, /refresh, /logout, /google, /apple, /forgot-password, /reset-password |
| **Runs** | `/api/v1/runs` | GET /, POST /, GET /:id, PATCH /:id, DELETE /:id, GET /stats/weekly, GET /personal-records, POST /:id/animate, GET /:id/animate/status |
| **Coaching** | `/api/v1/coaching` | GET /plans, POST /plans/generate, GET/PATCH /plans/:id, GET /insights, POST /insights/:id/read, GET /recovery |
| **Match** | `/api/v1/match` | GET/PATCH /profile, GET /suggestions, POST /request/:targetId, PATCH /:matchId, GET /requests, GET /active, GET/POST /groups, POST /groups/:id/join |
| **Messages** | `/api/v1/messages` | GET /:matchId, POST /:matchId, PATCH /:matchId/read |
| **Users** | `/api/v1/users` | GET /me, PATCH /me, DELETE /me, GET /:id |
| **Sync** | `/api/v1/sync` | GET /status, POST /devices/connect, POST /devices/:id/sync, DELETE /devices/:id |
| **WS** | `/api/v1/ws` | GET /ws (WebSocket 실시간) |

## 데이터 모델 관계

```
User ──< ConnectedDevice
     ──< Run ──< RunDatapoint
              ──< RunSplit
              ──< CoachingInsight
     ──< CoachingPlan
     ──  MatchProfile ──< RunnerMatch (requester/matchedUser)
                                    ──< Message
                      ──< GroupMember >── RunnerGroup
PasswordResetToken >── User
```

13개 모델: `User`, `ConnectedDevice`, `Run`, `RunDatapoint`, `RunSplit`, `CoachingPlan`, `CoachingInsight`, `MatchProfile`, `RunnerMatch`, `RunnerGroup`, `GroupMember`, `Message`, `PasswordResetToken`

## 에이전트 팀 워크플로우

기능 구현 순서 (항상 이 순서로):
```
스키마 → packages/ 타입 → services/api 라우트 → apps/mobile 화면 → 테스트
```

`/team` 활용 패턴:
```
1. /plan           → 요구사항 분석 + 구현 플랜 확정
2. /team           → db-architect(스키마) + backend-dev(API) 병렬
3. /team           → mobile-dev(화면 구현)
4. code-reviewer   → 타입 안전성 + 패턴 일관성 검토
```

새 엔드포인트 추가 필수 체크리스트:
- [ ] `services/api/src/routes/` 라우트 파일
- [ ] `services/api/src/index.ts` register 등록
- [ ] `packages/validators/` Zod 스키마
- [ ] `packages/types/` TypeScript 타입
- [ ] `services/api/src/__tests__/` 테스트 케이스
- [ ] `docs/api-reference.md` 문서 업데이트

## 개발 우선순위

1. **데이터 무결성 최우선** — 스키마 변경은 반드시 `npx prisma db push` + `npx prisma generate`
2. **타입 안전성** — PR 전 `npm run type-check` 통과 필수
3. **테스트 없이 완료 금지** — 구현 후 반드시 해당 도메인 테스트 추가
4. **모바일 마지막** — API 확정 후 화면 구현 시작
