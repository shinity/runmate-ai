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

## 4. 라우트 아트 플로우

```
갤러리 탭 진입
    │
    ├─ Route Art 목록 → GET /runs?limit=10 (커서 기반 무한 스크롤)
    │       │
    │       ├─ [routeArtUrl 있음] → SVG 썸네일 + 거리/날짜 오버레이
    │       │       └─ [animatedRouteArtUrl 있음] → GIF 뱃지 오버레이
    │       ├─ [routeArtUrl 없음 + GPS 있음] → shimmer + "생성 중..."
    │       ├─ [dataSource: manual] → "GPS 없음" placeholder
    │       └─ [빈 상태] → 안내 문구 + "런 시작하기" CTA
    │
    └─ 아이템 탭 → Route Art 상세 화면 (/route-art/:id)
            │
            ├─ SVG 풀스크린 표시
            ├─ 런 요약 (거리, 시간, 페이스, 날짜)
            ├─ [저장] → 카메라롤 저장 (expo-media-library, 준비 중)
            ├─ [공유] → Share.share (URL + 텍스트)
            ├─ [런 상세 보기] → RunDetailModal
            └─ [애니메이션 만들기] → Animated Route Art 플로우 (아래 참조)

홈 탭 → 최근 Route Art 카드 (routeArtUrl 있는 런 중 최신 1개)
    │
    └─ 카드 탭 → Route Art 상세 화면 (/route-art/:id)

런 저장 직후 (Route Art 생성 중 폴링)
    │
    ├─ routeArtUrl === null && datapoints >= 2
    │       │
    │       └─ TanStack Query refetchInterval: 5초 × 최대 6회 (30초)
    │               │
    │               ├─ [routeArtUrl 채워짐] → 폴링 중단, UI 업데이트
    │               └─ [6회 초과] → 폴링 중단 (생성 실패로 간주)
    │
    └─ datapoints < 2 → 폴링 없음 (GPS 데이터 부족)
```

---

## 5. Animated Route Art 플로우

```
Route Art 상세 화면 → "애니메이션 만들기" 탭
    │
    ├─ [animatedRouteArtUrl 있음] → 결과물 화면으로 바로 이동
    │
    └─ [animatedRouteArtUrl 없음] → 애니메이션 제작 화면
            │
            ├─ 배경 선택
            │       │
            │       ├─ [프리셋] → 6종 중 선택 (도시 야경, 공원, 해변, 산길, 우주, 석양)
            │       │       └─ 즉시 미리보기 반영
            │       │
            │       └─ [AI 생성] → 텍스트 프롬프트 입력 (최대 100자)
            │               └─ "생성하기" 후 미리보기 반영
            │
            ├─ 캐릭터 선택 → 6종 (러너, 닌자, 로봇, 고양이, 유니콘, 우주인)
            │       └─ 즉시 미리보기 반영
            │
            ├─ 속도 조절 → 슬라이더 (0.5x ~ 3.0x)
            │
            └─ "생성하기" 탭
                    │
                    ├─ POST /runs/:id/animate
                    │       └─ 202 Accepted + jobId
                    │
                    └─ 생성 중 화면
                            │
                            ├─ GET /runs/:id/animate/status (3초 폴링)
                            │       │
                            │       ├─ step: generating_background → "배경 생성 중..."
                            │       ├─ step: rendering_frames → "프레임 렌더링 중..."
                            │       └─ step: encoding_gif → "GIF 생성 중..."
                            │
                            ├─ [completed] → 결과물 화면
                            │       │
                            │       ├─ GIF 자동 재생 (루프)
                            │       ├─ 런 요약 정보
                            │       ├─ [저장] → expo-media-library 카메라롤 저장
                            │       ├─ [공유] → Share.share (GIF 파일)
                            │       └─ [다시 만들기] → 제작 화면 복귀 (설정 유지)
                            │
                            ├─ [failed] → 에러 메시지 + "다시 시도" 버튼
                            │
                            └─ [취소] → 제작 화면 복귀
```

---

## 6. 러너 매칭 플로우 (준비 중)

> 현재 탭에서 제거됨. 프로필 > 설정에서 진입 ("준비 중" 라벨).

```
프로필 탭 → 러닝메이트 찾기 (준비 중)
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

## 7. 토큰 갱신 플로우

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

## 8. 비동기 AI 파이프라인 플로우

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
    ├─ BullMQ route-art 큐 (5초 지연)
    │       │
    │       └─ [Phase 3] GPS 좌표 → SDXL 프롬프트 → Replicate API
    │               │
    │               └─ webhook으로 routeArtUrl 업데이트
    │
    └─ BullMQ animate-route-art 큐 (사용자 수동 트리거)
            │
            └─ animateRouteArt.worker.ts
                    │
                    ├─ 배경 준비 (프리셋 로드 또는 FLUX.1 API 호출)
                    ├─ GPS → SVG Path (기존 모듈)
                    ├─ 프레임 합성 (Sharp: 배경 + 경로 + 캐릭터 x N프레임)
                    ├─ GIF 인코딩 (gifenc, 512x512, 15fps)
                    └─ Run.animatedRouteArtUrl 업데이트
```
