# User Flow

## 1. 온보딩 플로우

```
앱 최초 실행
    │
    ├─ [비회원] ──→ 회원가입 화면
    │                  │
    │                  ├─ 이메일 + 비밀번호 + 닉네임 입력
    │                  ├─ POST /auth/register
    │                  └─ 프로필 설정 화면 (경험 레벨, 목표, 주간 목표 거리)
    │                         │
    │                         └─ PATCH /users/me → 홈 탭
    │
    └─ [기존 유저] → 로그인 화면
                        │
                        ├─ POST /auth/login
                        └─ 홈 탭
```

---

## 2. 런 기록 플로우

```
런 탭 진입
    │
    ├─ [GPS 권한 허용] → 런 시작
    │       │
    │       ├─ 실시간 GPS 추적 (useRunStore)
    │       ├─ 타이머 + 거리 + 페이스 표시
    │       └─ 런 종료
    │              │
    │              ├─ 데이터 요약 화면 (거리, 시간, 페이스, 심박수)
    │              └─ POST /runs
    │                     │
    │                     ├─ [즉시] 런 저장 → 201 응답
    │                     └─ [비동기 큐]
    │                            ├─ run-analysis → Claude AI 코칭 인사이트 생성
    │                            └─ route-art (5초 지연) → 라우트 아트 생성
    │
    ├─ [웨어러블 연동] → POST /sync/devices/connect
    │       │
    │       └─ 기기 등록 → POST /sync/devices/:id/sync
    │
    └─ 런 목록 조회 → GET /runs?after=&limit=20
```

---

## 3. AI 코칭 플로우

```
코칭 탭 진입
    │
    ├─ 인사이트 피드 → GET /coaching/insights
    │       │
    │       ├─ [인사이트 탭] → POST /coaching/insights/:id/read
    │       └─ [dismiss] → (UI only, API 미구현)
    │
    ├─ 회복 상태 → GET /coaching/recovery
    │       │
    │       └─ score 기반 오늘의 추천 강도 표시
    │              (hard / moderate / easy / rest)
    │
    └─ 훈련 계획
            │
            ├─ 계획 목록 → GET /coaching/plans
            ├─ 새 계획 생성
            │       │
            │       ├─ 목표 / 목표일 / 현재 주간 거리 / 훈련 일수 입력
            │       └─ POST /coaching/plans/generate
            │               │
            │               └─ Claude API 동기 호출 → 주차별 세션 계획 반환 → 저장
            │
            └─ 계획 상세
                    │
                    ├─ 주차별 세션 확인
                    └─ PATCH /coaching/plans/:id (pause / resume / abandon)
```

---

## 4. 러너 매칭 플로우

```
매칭 탭 진입
    │
    ├─ 내 매칭 프로필 → GET /match/profile
    │       │
    │       └─ (없으면 자동 생성 from 런 기록)
    │
    ├─ 추천 러너 → GET /match/suggestions
    │       │
    │       ├─ 페이스 유사도 기반 최대 5명
    │       └─ 매칭 요청 → POST /match/request/:targetId
    │
    ├─ 받은 매칭 요청
    │       │
    │       └─ PATCH /match/:matchId (accepted / declined)
    │
    ├─ 활성 매칭 → GET /match/active
    │
    └─ 그룹
            │
            ├─ 공개 그룹 목록 → GET /match/groups
            ├─ 그룹 가입 → POST /match/groups/:id/join
            └─ 그룹 생성 → POST /match/groups
```

---

## 5. 토큰 갱신 플로우

```
API 요청
    │
    ├─ [200 OK] → 정상 처리
    │
    └─ [401 INVALID_TOKEN]
            │
            ├─ expo-secure-store에서 refreshToken 로드
            ├─ POST /auth/refresh
            │       │
            │       ├─ [성공] → 새 accessToken 저장 → 원래 요청 재시도
            │       └─ [실패] → 로그아웃 → 로그인 화면으로
            │
            └─ (lib/api.ts 인터셉터에서 자동 처리)
```

---

## 6. 비동기 AI 파이프라인 플로우

```
POST /runs 완료
    │
    ├─ BullMQ run-analysis 큐
    │       │
    │       └─ runAnalysis.worker.ts
    │               │
    │               ├─ 유저 컨텍스트 조회 (경험, 목표, 최근 런 30일)
    │               ├─ Claude API 호출 (analyzeRunWithClaude)
    │               │       └─ temperature 0.7, max_tokens 512
    │               └─ CoachingInsight DB 저장
    │
    └─ BullMQ route-art 큐 (5초 지연)
            │
            └─ [Phase 3] GPS 좌표 → SDXL 프롬프트 → Replicate API
                    │
                    └─ webhook으로 routeArtUrl 업데이트
```
