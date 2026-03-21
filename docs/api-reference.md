# API Reference

**Base URL**: `http://localhost:3000`
**인증**: Bearer JWT (`Authorization: Bearer <accessToken>`)
**응답 형식**: `{ data: ... }` / `{ data: ..., meta: { hasMore, cursor } }` / `{ error: { code, message } }`

---

## 인증 (Auth)

### POST /auth/register
신규 회원가입

**Request**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "홍길동"
}
```

**Response** `201`
```json
{
  "data": {
    "user": { "id": "uuid", "email": "...", "displayName": "..." },
    "tokens": { "accessToken": "...", "refreshToken": "...", "expiresIn": 900 }
  }
}
```

**에러**: `409 EMAIL_TAKEN`

---

### POST /auth/login
로그인

**Request**
```json
{ "email": "user@example.com", "password": "password123" }
```

**Response** `200` — register와 동일 구조
**에러**: `401 INVALID_CREDENTIALS`

---

### POST /auth/refresh
액세스 토큰 갱신

**Request**
```json
{ "refreshToken": "..." }
```

**Response** `200`
```json
{ "data": { "accessToken": "...", "expiresIn": 900 } }
```

**에러**: `401 INVALID_TOKEN`

---

## 유저 (Users)

> 모든 엔드포인트 `Authorization` 필요 (GET /users/:id 제외)

### GET /users/me
내 프로필 조회 (활성 디바이스 포함, passwordHash 제외)

**Response** `200`
```json
{ "data": { "id": "...", "email": "...", "displayName": "...", "devices": [...] } }
```

---

### PATCH /users/me
내 프로필 수정

**Request** (모두 선택)
```json
{
  "displayName": "...",
  "heightCm": 175,
  "weightKg": 70,
  "experienceLevel": "intermediate",
  "primaryGoal": "10k",
  "weeklyTargetKm": 30,
  "city": "Seoul",
  "countryCode": "KR"
}
```

---

### GET /users/:id
공개 프로필 조회 (인증 불필요)

**Response** `200`
```json
{
  "data": { "id": "...", "displayName": "...", "city": "...", "experienceLevel": "...", "primaryGoal": "..." }
}
```

---

### DELETE /users/me
회원 탈퇴 (연관 데이터 Cascade 삭제)

**Response** `204`

---

## 런 (Runs)

> 모든 엔드포인트 `Authorization` 필요

### GET /runs
런 목록 조회 (cursor 페이지네이션)

**Query**: `?after={cursor}&limit={n}`

**Response** `200`
```json
{
  "data": [{ "id": "...", "distanceMeters": 5000, "splits": [...] }],
  "meta": { "hasMore": true, "cursor": "uuid" }
}
```

---

### POST /runs
런 기록 저장 → AI 분석 + 라우트 아트 큐 자동 등록

**Request**
```json
{
  "startedAt": "2026-03-21T08:00:00Z",
  "endedAt": "2026-03-21T08:35:00Z",
  "durationSeconds": 2100,
  "distanceMeters": 7000,
  "avgPaceSecPerKm": 300,
  "dataSource": "app_native",
  "surfaceType": "road",
  "effortScore": 7,
  "splits": [
    { "splitNumber": 1, "splitType": "km", "durationSeconds": 305, "paceSecPerKm": 305, "heartRate": 155 }
  ]
}
```

**Response** `201` — 생성된 런 객체 (splits 포함)

---

### GET /runs/stats/weekly
최근 7일 통계

**Response** `200`
```json
{
  "data": {
    "totalRuns": 3,
    "totalDistanceMeters": 21000,
    "totalDurationSeconds": 6300,
    "avgPaceSecPerKm": 300,
    "totalTrainingLoad": 150,
    "weekStart": "2026-03-14T..."
  }
}
```

---

### GET /runs/personal-records
5k / 10k / 하프 / 풀 마라톤 최고 페이스

**Response** `200`
```json
{
  "data": [
    { "distance": "5k", "id": "...", "avgPaceSecPerKm": 280, "startedAt": "..." }
  ]
}
```

---

### GET /runs/:id
런 상세 조회

**에러**: `404 NOT_FOUND`

---

### PATCH /runs/:id
런 메모 수정

**Request** (선택)
```json
{ "title": "아침 달리기", "notes": "컨디션 좋음", "isPublic": true }
```

---

### DELETE /runs/:id
런 삭제

**Response** `204`
**에러**: `404 NOT_FOUND`

---

## 코칭 (Coaching)

> 모든 엔드포인트 `Authorization` 필요

### GET /coaching/plans
훈련 계획 목록 (최신순)

---

### POST /coaching/plans/generate
AI 훈련 계획 생성 (Claude API 호출, 동기)

**Request**
```json
{
  "goalType": "10k",
  "targetDate": "2026-06-01",
  "currentWeeklyKm": 20,
  "daysPerWeek": 4
}
```

**Response** `201` — 생성된 CoachingPlan (weeks JSON 포함)

---

### GET /coaching/plans/:id
훈련 계획 상세

---

### PATCH /coaching/plans/:id
계획 상태 변경

**Request**
```json
{ "status": "paused" }
```
`status`: `active` | `paused` | `completed` | `abandoned`

---

### GET /coaching/insights
AI 코칭 인사이트 피드 (cursor 페이지네이션, dismiss 제외, 우선순위 정렬)

**Query**: `?after={cursor}&limit={n}`

---

### POST /coaching/insights/:id/read
인사이트 읽음 처리

**Response** `204`

---

### GET /coaching/recovery
현재 회복 상태 분석

**Response** `200`
```json
{
  "data": {
    "score": 75,
    "recommendation": "moderate",
    "reasons": ["Normal training load", "Last run 1 day(s) ago"],
    "estimatedReadyAt": "2026-03-22T..."
  }
}
```
`recommendation`: `hard` | `moderate` | `easy` | `rest`

---

## 매칭 (Match)

> 모든 엔드포인트 `Authorization` 필요 (GET /match/groups 제외)

### GET /match/profile
내 매칭 프로필 조회 (없으면 런 기록 기반 자동 생성)

---

### PATCH /match/profile
매칭 프로필 수정 → 임베딩 업데이트 큐 등록

**Request** (선택)
```json
{
  "runningStyle": "competitive",
  "preferredRunTime": "morning",
  "preferredRunDays": [1, 3, 5],
  "preferredDistanceKm": 10,
  "maxPaceDifferenceSecPerKm": 45
}
```

---

### GET /match/suggestions
러너 매칭 추천 (페이스 유사도 기반, 최대 5명)

**Response** `200`
```json
{
  "data": [{
    "user": { "id": "...", "displayName": "...", "city": "..." },
    "matchProfile": { "avgPaceSecPerKm": 295, "avgWeeklyKm": 25 },
    "compatibility": { "pace": 0.92, "overall": 0.85 }
  }]
}
```

---

### POST /match/request/:targetId
매칭 요청

**Response** `201`
**에러**: `409 ALREADY_MATCHED`, `400 INVALID_REQUEST`

---

### PATCH /match/:matchId
매칭 요청 수락/거절 (대상 유저만 가능)

**Request**
```json
{ "status": "accepted" }
```
`status`: `accepted` | `declined`

---

### GET /match/active
활성 매칭 목록

---

## 그룹 (Groups)

### GET /match/groups
공개 그룹 목록 (인증 불필요)

---

### POST /match/groups
그룹 생성 (생성자는 자동으로 admin)

**Request**
```json
{
  "name": "새벽 러너스",
  "description": "매일 아침 6시 한강",
  "maxMembers": 10,
  "isPublic": true,
  "tags": ["한강", "새벽"]
}
```

---

### POST /match/groups/:id/join
그룹 가입

**Response** `204`
**에러**: `404 NOT_FOUND`, `400 GROUP_FULL`

---

## 기기 동기화 (Sync / Devices)

> 모든 엔드포인트 `Authorization` 필요

### GET /sync/status
연결된 기기 동기화 상태 목록

**Response** `200`
```json
{
  "data": [{ "deviceId": "...", "deviceType": "apple_watch", "lastSyncedAt": "...", "status": "idle" }]
}
```

---

### POST /sync/devices/connect
웨어러블 기기 등록

**Request**
```json
{ "deviceType": "garmin", "deviceId": "device-serial-123" }
```
`deviceType`: `apple_watch` | `galaxy_watch` | `garmin` | `polar` | `fitbit` | `wahoo`

---

### POST /sync/devices/:id/sync
수동 동기화 트리거

**Response** `200`
```json
{ "data": { "deviceId": "...", "status": "sync_queued" } }
```

---

### DELETE /sync/devices/:id
기기 연결 해제 (soft delete)

**Response** `204`

---

## 공통 에러 코드

| HTTP | Code | 설명 |
|------|------|------|
| 400 | `INVALID_REQUEST` | 잘못된 요청 |
| 400 | `GROUP_FULL` | 그룹 최대 인원 초과 |
| 401 | `INVALID_CREDENTIALS` | 이메일/비밀번호 불일치 |
| 401 | `INVALID_TOKEN` | 토큰 만료 또는 무효 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `EMAIL_TAKEN` | 이메일 중복 |
| 409 | `ALREADY_MATCHED` | 이미 매칭 존재 |
