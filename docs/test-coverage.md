# 테스트 커버리지 문서

RunMate AI 테스트 현황 및 전체 케이스 목록.

**마지막 업데이트**: 2026-03-28
**전체 결과**: 모바일 45/45 ✅ | API 작성 중

---

## 모바일 테스트 (Jest)

위치: `apps/mobile/src/__tests__/`
실행: `npx jest --forceExit` (apps/mobile 디렉토리에서)

### 결과 요약

| 파일 | 케이스 수 | 상태 |
|------|-----------|------|
| `auth-store.test.ts` | 6 | ✅ PASS |
| `api-client.test.ts` | 5 | ✅ PASS |
| `run-store.test.ts` | 15 | ✅ PASS |
| `hooks/useRuns.test.ts` | 11 | ✅ PASS |
| `format.test.ts` | 8 | ✅ PASS |
| **합계** | **45** | ✅ |

---

### auth-store.test.ts (6개)

대상: `stores/auth.ts` — Zustand 인증 스토어

| 번호 | 설명 |
|------|------|
| 1 | 로그인 성공 시 user 및 isAuthenticated 설정 |
| 2 | 로그인 실패 시 isLoading 복원 |
| 3 | 회원가입 성공 시 user 설정 |
| 4 | 로그아웃 시 상태 초기화 |
| 5 | 토큰 유효 시 user 로드 |
| 6 | 토큰 만료 시 isAuthenticated false |

**Mock**: `expo-secure-store`, `lib/api` (api.post, api.get, saveTokens, clearTokens)

---

### api-client.test.ts (5개)

대상: `lib/api.ts` — fetch 기반 API 클라이언트

| 번호 | 설명 |
|------|------|
| 1 | GET 성공 응답 반환 |
| 2 | 액세스 토큰이 있으면 Authorization 헤더 포함 |
| 3 | 401 응답 시 refresh 토큰으로 재시도 성공 |
| 4 | refresh 실패 시 Session expired 에러 throw |
| 5 | POST body를 JSON으로 직렬화 |
| 6 | 서버 에러 시 에러 메시지 throw |

**Mock**: `expo-secure-store`, `global.fetch`

---

### run-store.test.ts (15개)

대상: `stores/run.ts` — GPS 런 트래킹 스토어

#### startRun (2개)
| 번호 | 설명 |
|------|------|
| 1 | 위치 권한 허용 시 런 시작 |
| 2 | 위치 권한 거부 시 에러 |

#### pauseRun / resumeRun (3개)
| 번호 | 설명 |
|------|------|
| 3 | 일시정지 및 재개 |
| 4 | 일시정지 중에도 isRunning은 true 유지 |
| 5 | 재개 후 isRunning true, isPaused false |

#### tick (2개)
| 번호 | 설명 |
|------|------|
| 6 | 실행 중에 elapsedSeconds 증가 |
| 7 | 일시정지 중에는 증가하지 않음 |

#### addDatapoint (5개)
| 번호 | 설명 |
|------|------|
| 8 | 첫 번째 포인트는 거리 0 |
| 9 | 두 번째 포인트에서 거리 계산 |
| 10 | 포인트가 3개 이상일 때 거리가 누적된다 |
| 11 | pace가 있을 때 avgPaceSecPerKm을 계산한다 |

#### stopRun (3개)
| 번호 | 설명 |
|------|------|
| 12 | 런 정지 후 상태 초기화, datapoints 반환 |
| 13 | stopRun 반환값에 기록된 datapoint 좌표가 포함된다 |
| 14 | stopRun 후 distanceMeters가 0으로 초기화된다 |

**Mock**: `expo-location`

---

### hooks/useRuns.test.ts (11개)

대상: `hooks/useRuns.ts` — TanStack Query 런 데이터 훅

**패턴**: `renderHook` + `QueryClientProvider` wrapper + `waitFor`

#### useRuns (3개)
| 번호 | 설명 |
|------|------|
| 1 | 런 목록을 정상 조회한다 (`GET /runs?limit=20`) |
| 2 | 빈 런 목록도 정상 처리한다 |
| 3 | API 에러 시 error 상태가 된다 |

#### useRun (2개)
| 번호 | 설명 |
|------|------|
| 4 | id가 있을 때 런 상세를 조회한다 (`GET /runs/:id`) |
| 5 | id가 빈 문자열이면 쿼리를 실행하지 않는다 |

#### useRunDetail (2개)
| 번호 | 설명 |
|------|------|
| 6 | id가 null이면 쿼리를 실행하지 않는다 |
| 7 | id가 있으면 데이터포인트 포함 상세를 조회한다 |

#### useWeeklyStats (1개)
| 번호 | 설명 |
|------|------|
| 8 | 주간 통계를 조회한다 (`GET /runs/stats/weekly`) |

#### useCreateRun (3개)
| 번호 | 설명 |
|------|------|
| 9 | 러닝 생성 성공 시 runs 쿼리가 invalidate된다 |
| 10 | 러닝 생성 성공 시 coaching/insights 쿼리가 invalidate된다 |
| 11 | 러닝 생성 실패 시 error 상태가 된다 |

**Mock**: `lib/api` (api.get, api.post)

---

### format.test.ts (8개)

대상: `lib/format.ts` — 숫자 포맷 유틸리티

#### formatPace (2개)
| 번호 | 설명 |
|------|------|
| 1 | 정상 페이스 포맷 (360 → "6:00") |
| 2 | 초가 두 자리로 패딩됨 (361 → "6:01") |

#### formatDistance (3개)
| 번호 | 설명 |
|------|------|
| 3 | 1km 미만은 m로 표시 |
| 4 | 1km 이상은 km로 표시 (소수점 1자리) |
| 5 | 경계값: 정확히 1000m |

#### formatDuration (3개)
| 번호 | 설명 |
|------|------|
| 6 | 1시간 미만은 MM:SS |
| 7 | 1시간 이상은 H:MM:SS |
| 8 | 분/초 두 자리 패딩 |

---

## API 테스트 (Vitest)

위치: `services/api/src/__tests__/`
실행: `npm run test` (services/api 디렉토리에서)

**Mock**: Prisma (`src/test/app.ts`의 `vi.mock('../lib/prisma')`), BullMQ 큐

### auth.test.ts (10개)

대상: `routes/auth.ts`

#### POST /api/v1/auth/register (3개)
| 번호 | 설명 |
|------|------|
| 1 | 신규 유저를 등록하고 토큰을 반환한다 |
| 2 | 이미 존재하는 이메일이면 409 (EMAIL_TAKEN) |
| 3 | 필수 필드 누락 시 400 |

#### POST /api/v1/auth/login (3개)
| 번호 | 설명 |
|------|------|
| 4 | 올바른 자격증명으로 로그인하면 토큰을 반환한다 |
| 5 | 존재하지 않는 이메일이면 401 (INVALID_CREDENTIALS) |
| 6 | 비밀번호가 틀리면 401 (INVALID_CREDENTIALS) |

#### POST /api/v1/auth/refresh (3개)
| 번호 | 설명 |
|------|------|
| 7 | 유효한 refresh token으로 새 access token 발급 |
| 8 | 잘못된 토큰이면 401 (INVALID_TOKEN) |
| 9 | access token을 refresh token으로 사용하면 401 |

---

### runs.test.ts (26개)

대상: `routes/runs.ts`

#### POST /api/v1/runs (8개)
| 번호 | 설명 |
|------|------|
| 1 | 런을 저장하고 AI 분석 큐에 등록한다 |
| 2 | 스플릿 데이터를 포함한 런을 저장한다 |
| 3 | GPS 데이터포인트를 포함한 런을 저장한다 |
| 4 | 인증 없이 접근하면 401 |
| 5 | distanceMeters 누락 시 400 (VALIDATION_ERROR) |
| 6 | durationSeconds 누락 시 400 (VALIDATION_ERROR) |
| 7 | dataSource가 유효하지 않으면 400 |
| 8 | bestPaceSecPerKm 미제공 시 avgPaceSecPerKm으로 대체 |
| 9 | 빈 datapoints 배열은 datapoints 필드를 생성하지 않는다 |

#### GET /api/v1/runs (5개)
| 번호 | 설명 |
|------|------|
| 10 | 런 목록을 cursor 페이지네이션으로 반환한다 |
| 11 | limit 파라미터를 문자열로 전달해도 숫자로 coerce 처리한다 |
| 12 | limit이 최대값(100) 초과하면 400 |
| 13 | hasMore가 true이면 응답에 cursor가 포함된다 |
| 14 | 다른 유저의 런은 조회되지 않는다 |
| 15 | 인증 없이 접근하면 401 |

#### GET /api/v1/runs/stats/weekly (5개)
| 번호 | 설명 |
|------|------|
| 16 | 최근 7일 통계를 반환한다 |
| 17 | 런이 없으면 0 통계를 반환한다 |
| 18 | 7일 이내 런만 조회한다 (startedAt 필터 확인) |
| 19 | 런 생성 후 주간 통계에 반영된다 |
| 20 | 인증 없이 접근하면 401 |

#### GET /api/v1/runs/:id (5개)
| 번호 | 설명 |
|------|------|
| 21 | 런 상세를 반환한다 |
| 22 | 다른 유저의 런에 접근하면 404 (NOT_FOUND) |
| 23 | userId 필터가 쿼리에 포함된다 |
| 24 | 존재하지 않는 런이면 404 (NOT_FOUND) |
| 25 | 인증 없이 접근하면 401 |

#### PATCH /api/v1/runs/:id (5개)
| 번호 | 설명 |
|------|------|
| 26 | 런 제목과 메모를 수정한다 |
| 27 | isPublic 상태를 변경한다 |
| 28 | 존재하지 않는 런이면 404 (NOT_FOUND) |
| 29 | 다른 유저의 런은 수정할 수 없다 |
| 30 | 인증 없이 접근하면 401 |

#### DELETE /api/v1/runs/:id (4개)
| 번호 | 설명 |
|------|------|
| 31 | 런을 삭제한다 |
| 32 | 다른 유저의 런은 삭제할 수 없다 |
| 33 | 존재하지 않는 런이면 404 |
| 34 | 인증 없이 접근하면 401 |

#### GET /api/v1/runs/personal-records (3개)
| 번호 | 설명 |
|------|------|
| 35 | 기록이 있는 거리의 개인 최고 기록을 반환한다 |
| 36 | 기록이 없으면 빈 배열을 반환한다 |
| 37 | 인증 없이 접근하면 401 |

---

### coaching.test.ts (10개)

대상: `routes/coaching.ts`

**주의**: `vi.mock('../workers/planGeneration')` 파일 최상단 선언 필수

#### GET /api/v1/coaching/insights (2개)
| 번호 | 설명 |
|------|------|
| 1 | 인사이트 피드를 반환한다 |
| 2 | 인증 없이 접근하면 401 |

#### POST /api/v1/coaching/insights/:id/read (1개)
| 번호 | 설명 |
|------|------|
| 3 | 인사이트를 읽음 처리한다 |

#### GET /api/v1/coaching/recovery (3개)
| 번호 | 설명 |
|------|------|
| 4 | 런이 없을 때 높은 회복 점수를 반환한다 |
| 5 | 최근 높은 훈련 부하가 있으면 낮은 점수를 반환한다 |
| 6 | recommendation이 유효한 값만 반환한다 |

#### GET /api/v1/coaching/plans (1개)
| 번호 | 설명 |
|------|------|
| 7 | 훈련 계획 목록을 반환한다 |

#### POST /api/v1/coaching/plans/generate (1개)
| 번호 | 설명 |
|------|------|
| 8 | AI 훈련 계획을 생성하고 저장한다 |

#### PATCH /api/v1/coaching/plans/:id (2개)
| 번호 | 설명 |
|------|------|
| 9 | 계획 상태를 변경한다 |
| 10 | 존재하지 않는 계획이면 404 |

---

### matching.test.ts (10개)

대상: `routes/matching.ts`

#### GET /api/v1/match/profile (2개)
| 번호 | 설명 |
|------|------|
| 1 | 기존 프로필을 반환한다 |
| 2 | 프로필이 없으면 런 기록 기반으로 자동 생성한다 |

#### PATCH /api/v1/match/profile (1개)
| 번호 | 설명 |
|------|------|
| 3 | 프로필을 수정하고 임베딩 업데이트 큐에 등록한다 |

#### GET /api/v1/match/suggestions (2개)
| 번호 | 설명 |
|------|------|
| 4 | 페이스 유사도 기반 추천 러너를 반환한다 |
| 5 | 프로필이 없으면 빈 배열을 반환한다 |

#### POST /api/v1/match/request/:targetId (3개)
| 번호 | 설명 |
|------|------|
| 6 | 매칭 요청을 생성한다 |
| 7 | 자기 자신에게 매칭 요청하면 400 (INVALID_REQUEST) |
| 8 | 이미 매칭이 존재하면 409 (ALREADY_MATCHED) |

#### PATCH /api/v1/match/:matchId (2개)
| 번호 | 설명 |
|------|------|
| 9 | 매칭 요청을 수락한다 |
| 10 | 요청을 받지 않은 매칭이면 404 |

---

## 테스트 작성 패턴

### 모바일 — Zustand 스토어 테스트

```typescript
import { useAuthStore } from '../../stores/auth'

function getStore() { return useAuthStore.getState() }
function resetStore() { useAuthStore.setState({ user: null, isLoading: false, isAuthenticated: false }) }

beforeEach(() => { resetStore(); jest.clearAllMocks() })

it('테스트 설명', async () => {
  await act(async () => { await getStore().someAction() })
  expect(getStore().someState).toBe(expected)
})
```

### 모바일 — TanStack Query 훅 테스트

```typescript
import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

it('테스트 설명', async () => {
  api.get.mockResolvedValue({ data: mockData })
  const { result } = renderHook(() => useXxx(), { wrapper: createWrapper() })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual(mockData)
})
```

### API — Fastify 통합 테스트

```typescript
import { buildApp, signToken } from '../test/app'
import { prisma } from '../lib/prisma'

let app, token
beforeEach(async () => {
  app = await buildApp()
  token = signToken(app, 'user-id')
  vi.clearAllMocks()
})

it('테스트 설명', async () => {
  vi.mocked(prisma.someModel.someMethod).mockResolvedValue(mockData)
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/...',
    headers: { authorization: `Bearer ${token}` },
    payload: { ... },
  })
  expect(res.statusCode).toBe(201)
})
```
