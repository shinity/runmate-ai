# User Scenarios

## 개요

RunMate AI의 핵심 사용자 시나리오를 페르소나 기반으로 정의합니다. 각 시나리오는 사용자의 목표, 행동 흐름, 기대 결과, 그리고 시스템 반응을 포함합니다.

---

## 페르소나

### 페르소나 A — 김지수 (입문 러너)
- **나이**: 28세, 직장인
- **상황**: 3개월 전부터 달리기 시작. 주 2~3회, 3~5km 정도 달림
- **목표**: 6개월 안에 5km를 쉬지 않고 완주하고 싶음
- **고민**: 어떻게 훈련해야 할지 모르고, 부상이 두렵다
- **기기**: iPhone + Apple Watch

### 페르소나 B — 박민준 (중급 러너)
- **나이**: 35세, 개발자
- **상황**: 2년째 달리고 있으며 하프마라톤 완주 경험 있음. 주 4~5회, 7~10km 달림
- **목표**: 올해 풀마라톤 완주 (서울 마라톤 D-90일)
- **고민**: 혼자 훈련하다 보니 페이스 조절이 어렵고 훈련 계획이 체계적이지 않음
- **기기**: Android + Garmin Forerunner

### 페르소나 C — 이서연 (소셜 러너)
- **나이**: 31세, 디자이너
- **상황**: 달리기는 좋아하지만 혼자는 지루함. 주 2회, 거리보다 즐기는 것 중시
- **목표**: 함께 달릴 러닝 메이트를 찾고 싶음
- **고민**: 주변에 비슷한 페이스의 러너를 찾기 어려움
- **기기**: iPhone

---

## 시나리오 1: 첫 온보딩 (페르소나 A — 김지수)

### 목표
앱 설치 후 첫 런을 기록하고 AI 코칭 인사이트를 받는다.

### 사전 조건
- 앱 최초 설치
- Apple Watch 보유

### 시나리오 흐름

```
1. 앱 실행 → 회원가입 화면
   입력: 이메일, 비밀번호, 닉네임 "지수"
   → POST /auth/register
   결과: 가입 완료, 홈 화면 이동

2. 프로필 설정 화면
   입력: 경험 레벨 "beginner", 목표 "5k", 주간 목표 거리 15km
   → PATCH /users/me
   결과: 프로필 저장

3. Apple Watch 연결
   → POST /sync/devices/connect { deviceType: "apple_watch", deviceId: "..." }
   결과: 기기 등록 완료

4. 런 탭 → 런 시작
   GPS 권한 허용 → 실시간 GPS 추적 시작
   3.2km 달린 후 런 종료

5. 런 저장
   → POST /runs { distanceMeters: 3200, durationSeconds: 1920, avgPaceSecPerKm: 600, ... }
   결과: 런 저장 완료 (201)
   백그라운드: AI 코칭 인사이트 생성 큐 등록

6. 약 30초 후 코칭 탭 확인
   → GET /coaching/insights
   결과: "오늘 페이스(10:00/km)가 안정적이에요. 입문자에게는 이 속도가 이상적입니다.
         한 번에 5분 이상 달릴 수 있게 되면 다음 단계로 넘어가세요." 표시
```

### 기대 결과
- 첫 런 기록 저장
- AI 인사이트 1건 생성 (type: `performance_analysis`, priority: `medium`)
- 다음 런까지의 회복 권장사항 제공

### 엣지 케이스
- GPS 신호 불량 → 수동 입력 모드 (`dataSource: "manual"`)
- Apple Watch 연결 실패 → 앱 자체 GPS로 대체

---

## 시나리오 2: 훈련 계획 생성 (페르소나 A — 김지수)

### 목표
AI가 생성한 맞춤 훈련 계획으로 체계적으로 준비한다.

### 사전 조건
- 회원가입 완료
- 최소 1회 런 기록 있음

### 시나리오 흐름

```
1. 코칭 탭 → "훈련 계획 만들기" 버튼

2. 계획 설정 입력
   - 목표: "5km 완주 (초보자용 훈련)"
   - 목표일: 12주 후
   - 훈련 가능 요일: 화, 목, 토 (주 3회)
   - 현재 체력 수준: "low"
   → POST /coaching/plans/generate

3. AI 처리 (2~5초)
   Claude API: 최근 런 이력 + 목표 분석
   → 12주 훈련 계획 생성:
     Week 1-3: 걷기/달리기 혼합 (런 15분)
     Week 4-6: 연속 달리기 늘리기 (런 25분)
     Week 7-9: 3km 완주 목표
     Week 10-12: 5km 완주 준비
   결과: 계획 저장 (201)

4. 계획 상세 화면
   주차별 세션 확인
   오늘 세션: "20분 걷기/달리기 인터벌 (1분 달리기 + 2분 걷기 반복)"

5. 3주 후 — 계획 일시 정지
   출장으로 인해 훈련 중단
   → PATCH /coaching/plans/:id { status: "paused" }

6. 복귀 후 계획 재개
   → PATCH /coaching/plans/:id { status: "active" }
```

### 기대 결과
- 12주 맞춤 훈련 계획 생성
- 주차별 거리/세션 유형 정의
- 계획 일시 정지 및 재개 가능

### 시스템 반응
- AI는 최근 30일 런 기록을 분석해 현재 수준에 맞는 강도로 계획 생성
- 부하 급증 감지 시 `injury_risk_alert` 인사이트 우선 생성

---

## 시나리오 3: 고강도 훈련 후 회복 관리 (페르소나 B — 박민준)

### 목표
마라톤 준비 중 과훈련을 방지하고 최적의 회복을 관리한다.

### 사전 조건
- 훈련 중 (D-90일)
- 최근 7일간 5회 훈련, 총 52km

### 시나리오 흐름

```
1. 일요일 장거리 런 완료
   25km, 2:15:00, 평균 페이스 5:24/km, 심박수 평균 158bpm, 노력도 9/10
   → POST /runs { distanceMeters: 25000, durationSeconds: 8100, effortScore: 9, ... }

2. AI 분석 (백그라운드)
   훈련 부하 급증 감지 (7일 누적 부하: 380)
   → CoachingInsight 생성:
     type: "injury_risk_alert"
     priority: "urgent"
     content: "이번 주 훈련 부하가 평소 대비 35% 높습니다.
               내일은 반드시 완전 휴식을 취하고,
               화요일은 40분 이내 가벼운 조깅으로 시작하세요."
     actionItems: ["월요일 완전 휴식", "화요일 40분 이하 easy run", "수분 충분히 섭취"]

3. 월요일 아침 — 코칭 탭 확인
   → GET /coaching/recovery
   결과:
     score: 28 (매우 낮음)
     recommendation: "rest"
     reasons: ["이번 주 누적 부하 380 — 매우 높음", "어제 달림 — 근육 회복 중"]

4. 인사이트 확인
   → GET /coaching/insights
   urgent 인사이트 상단 노출
   → POST /coaching/insights/:id/read (읽음 처리)

5. 화요일 — 회복 런 후 체크
   → GET /coaching/recovery
   score: 55 (보통)
   recommendation: "easy"
```

### 기대 결과
- 과훈련 위험 즉시 감지 및 알림
- 회복 점수 일별 추적
- 맞춤 휴식/훈련 강도 권장

---

## 시나리오 4: 러너 매칭 (페르소나 C — 이서연)

### 목표
비슷한 페이스와 스타일의 러닝 메이트를 찾아 함께 달린다.

### 사전 조건
- 회원가입 완료
- 최소 5회 런 기록 있음

### 시나리오 흐름

```
1. 매칭 탭 진입
   → GET /match/profile (없으면 자동 생성)
   결과: 평균 페이스 6:30/km, 주간 거리 15km 기반 프로필 생성

2. 프로필 세부 설정
   - 러닝 스타일: "social" (대화하며 달리기 선호)
   - 선호 달리기 시간: "morning"
   - 선호 요일: 토, 일
   - 페이스 허용 차이: 45초/km
   → PATCH /match/profile

3. 추천 러너 확인
   → GET /match/suggestions
   결과: 5명 추천
   1위: 최유나 (호환성 0.92)
      - 페이스 6:25/km, 소셜 스타일, 주말 선호
      - 서울 거주

4. 최유나에게 매칭 요청
   → POST /match/request/:userId
   결과: 매칭 요청 전송 (status: "pending")

5. 최유나가 수락
   → PATCH /match/:matchId { status: "accepted" }
   결과: 매칭 활성화 (status: "active")

6. 활성 매칭 목록 확인
   → GET /match/active
   결과: 최유나와의 매칭 표시
```

### 기대 결과
- 페이스 유사도 기반 러너 5명 추천
- 1:1 매칭 성사
- 함께 달릴 파트너 확보

### Phase 2 개선
- 임베딩 기반 다차원 매칭 (페이스 40% + 일정 30% + 목표 20% + 스타일 10%)
- 위치 기반 필터링

---

## 시나리오 5: 러닝 그룹 참여 (페르소나 C — 이서연)

### 목표
지역 러닝 그룹에 가입해 정기적으로 함께 달린다.

### 사전 조건
- 회원가입 완료

### 시나리오 흐름

```
1. 매칭 탭 → 그룹 탭
   → GET /match/groups
   결과: 공개 그룹 목록 (20개 이하)
   "한강 새벽 러너스" — 멤버 12명, 태그: [한강, 새벽, 소셜]

2. 그룹 가입
   → POST /match/groups/:id/join
   결과: 가입 완료 (204)

3. 그룹 내 일정에 맞춰 함께 달리기
   런 종료 후 기록 저장
   → POST /runs { isPublic: true, title: "한강 새벽 달리기 🌅" }
```

### 기대 결과
- 공개 그룹 탐색 및 가입
- 그룹 런 기록

---

## 시나리오 6: 개인 기록 갱신 (페르소나 B — 박민준)

### 목표
훈련 중 개인 기록(PR)을 추적하고 동기부여를 받는다.

### 사전 조건
- 충분한 런 기록 보유
- 풀마라톤 훈련 진행 중

### 시나리오 흐름

```
1. 10km 기록 달리기 완료
   10.05km, 48:30, 평균 페이스 4:49/km (기존 PR: 50:15)
   → POST /runs { distanceMeters: 10050, avgPaceSecPerKm: 289, effortScore: 9 }

2. AI 분석
   이전 10km 기록 대비 1:45 단축 감지
   → CoachingInsight 생성:
     type: "performance_analysis"
     priority: "high"
     content: "10km 개인 신기록을 세웠습니다! 🎉
               지난 기록 대비 1분 45초 단축했어요.
               현재 페이스라면 서울 마라톤 목표 시간(4시간) 달성이 충분히 가능합니다."

3. 홈 탭 — 개인 기록 확인
   → GET /runs/personal-records
   결과:
     5k: 24:10 (3주 전)
     10k: 48:30 (오늘) 🆕 신기록
```

### 기대 결과
- 개인 기록 자동 감지 및 저장
- 동기부여 인사이트 생성
- 기록 히스토리 관리

---

## 시나리오 7: 웨어러블 동기화 (페르소나 B — 박민준)

### 목표
Garmin 데이터를 자동으로 동기화해 수동 입력 없이 런을 기록한다.

### 사전 조건
- Garmin Forerunner 보유
- 앱 설치 완료

### 시나리오 흐름

```
1. 기기 연결
   → POST /sync/devices/connect { deviceType: "garmin", deviceId: "FR955-XXXXX" }
   결과: 기기 등록 완료

2. Garmin으로 달리기 완료
   장치에서 자동 업로드 (또는 수동 동기화)
   → POST /sync/devices/:id/sync
   결과: { status: "sync_queued" }

3. 동기화 상태 확인
   → GET /sync/status
   결과: { lastSyncedAt: "2026-03-21T08:30:00Z", status: "idle" }

4. 런 목록에서 확인
   → GET /runs
   결과: Garmin 데이터 기반 런 자동 등록 (dataSource: "garmin_connect")
```

### 기대 결과
- 수동 입력 없이 런 자동 기록
- Garmin 원본 데이터 보존

---

## 시나리오 8: 회원 탈퇴 (공통)

### 목표
개인정보 보호를 위해 계정과 모든 데이터를 삭제한다.

### 시나리오 흐름

```
1. 설정 → 계정 관리 → 회원 탈퇴

2. 확인 모달 표시
   "모든 런 기록, 코칭 인사이트, 매칭 정보가 삭제됩니다."

3. 탈퇴 확인
   → DELETE /users/me
   결과: 204 (Cascade 삭제)
   - User 삭제 → Run, CoachingPlan, CoachingInsight, MatchProfile, ConnectedDevice 모두 삭제

4. 로그인 화면으로 이동
```

### 기대 결과
- 계정 및 연관 데이터 완전 삭제
- GDPR 대응 (데이터 삭제권 보장)

---

## 시나리오 요약

| 시나리오 | 페르소나 | 핵심 API | 우선순위 |
|----------|----------|---------|---------|
| 1. 첫 온보딩 | 김지수 (입문) | register, POST /runs, GET /insights | MVP |
| 2. 훈련 계획 생성 | 김지수 (입문) | POST /plans/generate | MVP |
| 3. 회복 관리 | 박민준 (중급) | GET /recovery, GET /insights | MVP |
| 4. 러너 매칭 | 이서연 (소셜) | GET /suggestions, POST /request | MVP |
| 5. 그룹 참여 | 이서연 (소셜) | GET /groups, POST /join | MVP |
| 6. 개인 기록 | 박민준 (중급) | GET /personal-records | MVP |
| 7. 웨어러블 연동 | 박민준 (중급) | POST /devices/connect, POST /sync | MVP |
| 8. 회원 탈퇴 | 공통 | DELETE /users/me | MVP |
