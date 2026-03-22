# API Reference

**Base URL**: `http://localhost:3000`
**인증**: Bearer JWT (`Authorization: Bearer <accessToken>`)
**응답 형식**:
- 성공: `{ data: ... }` 또는 `{ data: ..., meta: { hasMore, cursor } }`
- 실패: `{ error: { code, message } }`

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
- `password`: 8자 이상
- `displayName`: 2~50자

**Response** `201`
```json
{
  "data": {
    "user": { "id": "uuid", "email": "...", "displayName": "...", "createdAt": "..." },
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

> `GET /users/:id` 제외 모든 엔드포인트 `Authorization` 필요

### GET /users/me
내 프로필 조회 (passwordHash 제외, 활성 기기 포함)

**Response** `200`
```json
{
  "data": {
    "id": "...", "email": "...", "displayName": "...",
    "dateOfBirth": "...", "gender": "male",
    "heightCm": 175, "weightKg": 70,
    "experienceLevel": "intermediate",
    "primaryGoal": "10k",
    "weeklyTargetKm": 30,
    "preferredPaceMinSecPerKm": 270,
    "preferredPaceMaxSecPerKm": 330,
    "city": "Seoul", "countryCode": "KR", "timezone": "Asia/Seoul",
    "matchingEnabled": true, "preferGroupRuns": false,
    "maxMatchDistanceKm": 10,
    "avatarUrl": null, "lastActiveAt": "...", "createdAt": "...",
    "devices": [...]
  }
}
```

---

### PATCH /users/me
내 프로필 수정 (모든 필드 선택)

**Request**
```json
{
  "displayName": "...",
  "dateOfBirth": "1990-01-01T00:00:00Z",
  "gender": "male",
  "heightCm": 175,
  "weightKg": 70,
  "experienceLevel": "intermediate",
  "primaryGoal": "10k",
  "weeklyTargetKm": 30,
  "preferredPaceMinSecPerKm": 270,
  "preferredPaceMaxSecPerKm": 330,
  "city": "Seoul",
  "countryCode": "KR",
  "timezone": "Asia/Seoul",
  "matchingEnabled": true,
  "preferGroupRuns": false,
  "maxMatchDistanceKm": 10
}
```

| 필드 | 타입 | 범위 |
|------|------|------|
| `gender` | enum | `male` \| `female` \| `non_binary` \| `prefer_not_to_say` |
| `heightCm` | number | 100~250 |
| `weightKg` | number | 30~300 |
| `experienceLevel` | enum | `beginner` \| `intermediate` \| `advanced` \| `elite` |
| `primaryGoal` | enum | `fitness` \| `five_k` \| `ten_k` \| `half_marathon` \| `marathon` \| `ultra` |
| `weeklyTargetKm` | number | 0~500 |
| `preferredPaceMinSecPerKm` | number | 120~900 |
| `preferredPaceMaxSecPerKm` | number | 120~900 |
| `countryCode` | string | 2자 |
| `maxMatchDistanceKm` | number | 0~100 |

**Response** `200` — 수정된 유저 객체

---

### GET /users/:id
공개 프로필 조회 (인증 불필요)

**Response** `200`
```json
{
  "data": {
    "id": "...", "displayName": "...", "avatarUrl": null,
    "city": "Seoul", "countryCode": "KR",
    "experienceLevel": "intermediate", "primaryGoal": "10k",
    "createdAt": "..."
  }
}
```

**에러**: `404 NOT_FOUND`

---

### DELETE /users/me
회원 탈퇴 (연관 데이터 Cascade 삭제)

**Response** `204`

---

## 런 (Runs)

> 모든 엔드포인트 `Authorization` 필요

### GET /runs
런 목록 조회 (cursor 페이지네이션)

**Query**: `?after={cursor}&limit={n}` (limit: 1~100, 기본 20)

**Response** `200`
```json
{
  "data": [{ "id": "...", "distanceMeters": 5000, "splits": [...] }],
  "meta": { "hasMore": true, "cursor": "uuid" }
}
```

---

### POST /runs
런 기록 저장 → AI 분석 + 라우트 아트 생성 큐 자동 등록

**Request**
```json
{
  "startedAt": "2026-03-21T08:00:00Z",
  "endedAt": "2026-03-21T08:35:00Z",
  "durationSeconds": 2100,
  "distanceMeters": 7000,
  "avgPaceSecPerKm": 300,
  "dataSource": "app_native",
  "elevationGainMeters": 50,
  "elevationLossMeters": 45,
  "bestPaceSecPerKm": 270,
  "avgHeartRate": 155,
  "maxHeartRate": 175,
  "avgCadenceSpm": 175,
  "avgPowerWatts": 220,
  "surfaceType": "road",
  "weatherTempC": 12,
  "weatherHumidity": 60,
  "weatherCondition": "clear",
  "title": "아침 달리기",
  "notes": "컨디션 좋음",
  "effortScore": 7,
  "isPublic": false,
  "splits": [
    { "splitNumber": 1, "splitType": "km", "durationSeconds": 305, "paceSecPerKm": 305, "heartRate": 155 }
  ],
  "datapoints": [
    { "timestamp": "2026-03-21T08:00:00Z", "lat": 37.5, "lng": 126.9, "altitudeM": 30, "heartRate": 140, "paceSecPerKm": 310 }
  ]
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `startedAt` | ✓ | ISO 8601 |
| `endedAt` | ✓ | ISO 8601 |
| `durationSeconds` | ✓ | 양의 정수 |
| `distanceMeters` | ✓ | 양수 |
| `avgPaceSecPerKm` | ✓ | 양수 |
| `dataSource` | ✓ | `apple_health` \| `health_connect` \| `garmin_connect` \| `manual` \| `app_native` |
| `surfaceType` | - | `road` \| `trail` \| `track` \| `treadmill` \| `mixed` |
| `effortScore` | - | 1~10, 기본 5 |
| `avgHeartRate` / `maxHeartRate` | - | 30~250 |
| `avgCadenceSpm` | - | 0~300 |
| `weatherTempC` | - | -50~60 |
| `weatherHumidity` | - | 0~100 |
| `splits[].splitType` | ✓ (splits 내) | `km` \| `mile` |

**Response** `201` — 생성된 런 객체 (splits 포함)

**사이드 이펙트**
- `runAnalysisQueue` → AI 분석 (즉시)
- `routeArtQueue` → 라우트 아트 생성 (5초 지연)

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
    "weekStart": "2026-03-16T..."
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
런 상세 조회 (splits 포함)

**에러**: `404 NOT_FOUND`

---

### PATCH /runs/:id
런 메모 수정 (모든 필드 선택)

**Request**
```json
{ "title": "아침 달리기", "notes": "컨디션 좋음", "isPublic": true }
```

**에러**: `404 NOT_FOUND`

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

**Response** `200` — 코칭 플랜 배열

---

### POST /coaching/plans/generate
AI 훈련 계획 생성 (Claude API 동기 호출, 최근 30일 런 20개 기반)

**Request**
```json
{
  "goal": "10km 완주를 45분 안에 달성하고 싶습니다",
  "targetDate": "2026-06-01T00:00:00Z",
  "availableDaysPerWeek": [1, 3, 5],
  "currentFitnessLevel": "moderate"
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `goal` | ✓ | 5~200자 자유 텍스트 |
| `targetDate` | ✓ | ISO 8601 |
| `availableDaysPerWeek` | ✓ | 요일 배열 (0=일~6=토), 1~7개 |
| `currentFitnessLevel` | - | `low` \| `moderate` \| `high` |

**Response** `201` — 생성된 CoachingPlan (weeks JSON 포함)

---

### GET /coaching/plans/:id
훈련 계획 상세

**에러**: `404 NOT_FOUND`

---

### PATCH /coaching/plans/:id
계획 상태 변경

**Request**
```json
{ "status": "paused" }
```
`status`: `active` | `paused` | `completed` | `abandoned`

**에러**: `404 NOT_FOUND`

---

### GET /coaching/insights
AI 코칭 인사이트 피드 (dismiss 제외, 우선순위·생성시간순)

**Query**: `?after={cursor}&limit={n}` (limit: 1~100, 기본 20)

**Response** `200`
```json
{
  "data": [...],
  "meta": { "hasMore": false, "cursor": null }
}
```

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

> `GET /match/groups` 제외 모든 엔드포인트 `Authorization` 필요

### GET /match/profile
내 매칭 프로필 조회 (없으면 런 기록 기반 자동 생성)

**Response** `200`
```json
{
  "data": {
    "userId": "...", "avgPaceSecPerKm": 295, "avgWeeklyKm": 25,
    "preferredDistanceKm": 10, "runningStyle": "social",
    "communicationPref": "chatty", "lookingFor": "running_partner",
    "maxPaceDifferenceSecPerKm": 45,
    "preferVirtualOnly": false, "isLocationPublic": true
  }
}
```

---

### PATCH /match/profile
매칭 프로필 수정 → 임베딩 업데이트 큐 등록 (모든 필드 선택)

**Request**
```json
{
  "runningStyle": "competitive",
  "communicationPref": "quiet",
  "lookingFor": "running_partner",
  "maxPaceDifferenceSecPerKm": 45,
  "preferVirtualOnly": false,
  "isLocationPublic": true
}
```

| 필드 | enum 값 |
|------|---------|
| `runningStyle` | `social` \| `competitive` \| `meditative` \| `mixed` |
| `communicationPref` | `chatty` \| `quiet` \| `results_only` |
| `lookingFor` | `solo_accountability` \| `running_partner` \| `group` \| `any` |
| `maxPaceDifferenceSecPerKm` | 0~300 |

**Response** `200` — 수정된 매칭 프로필

---

### GET /match/suggestions
러너 매칭 추천 (페이스 유사도 기반, 최대 5명)

**Response** `200`
```json
{
  "data": [{
    "user": { "id": "...", "displayName": "...", "avatarUrl": null, "city": "...", "experienceLevel": "..." },
    "matchProfile": { "avgPaceSecPerKm": 295, "avgWeeklyKm": 25, "runningStyle": "social", "preferredRunTime": "morning" },
    "compatibility": { "pace": 0.92, "schedule": 0.7, "goal": 0.8, "style": 0.85, "overall": 0.85 }
  }]
}
```

---

### POST /match/request/:targetId
매칭 요청 전송

**Response** `201`
```json
{ "data": { "id": "...", "requesterId": "...", "matchedUserId": "...", "status": "pending", "matchedAt": "..." } }
```

**에러**: `400 INVALID_REQUEST` (자기 자신), `409 ALREADY_MATCHED`

---

### PATCH /match/:matchId
매칭 요청 수락/거절 (수신자만 가능)

**Request**
```json
{ "status": "accepted" }
```
`status`: `accepted` | `declined`

**Response** `200` — 수정된 매치 객체 (`status`, `respondedAt` 포함)

**에러**: `404 NOT_FOUND`

---

### GET /match/requests
받은 pending 매칭 요청 목록

**Response** `200`
```json
{
  "data": [{
    "id": "...", "status": "pending", "matchedAt": "...", "respondedAt": null,
    "requester": { "id": "...", "displayName": "...", "avatarUrl": null }
  }]
}
```

---

### GET /match/active
활성 매칭 목록

**Response** `200`
```json
{
  "data": [{
    "id": "...", "requesterId": "...", "matchedUserId": "...", "status": "accepted",
    "requester": { "id": "...", "displayName": "...", "avatarUrl": null },
    "matchedUser": { "id": "...", "displayName": "...", "avatarUrl": null }
  }]
}
```

---

## 그룹 (Groups)

### GET /match/groups
공개 그룹 목록 (인증 불필요, 최대 20개 최신순)

**Response** `200`
```json
{
  "data": [{
    "id": "...", "name": "새벽 러너스", "description": "...",
    "isPublic": true, "maxMembers": 20,
    "tags": ["한강", "새벽"], "createdAt": "...",
    "_count": { "members": 5 }
  }]
}
```

---

### POST /match/groups
그룹 생성 (생성자는 admin으로 자동 추가)

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

| 필드 | 필수 | 제약 |
|------|------|------|
| `name` | ✓ | 2~50자 |
| `description` | ✓ | 최대 500자 |
| `maxMembers` | - | 2~100, 기본 20 |
| `tags` | - | 최대 10개, 각 30자 이내 |

**Response** `201` — 생성된 그룹 객체

---

### POST /match/groups/:id/join
그룹 가입

**Response** `204`
**에러**: `404 NOT_FOUND`, `400 GROUP_FULL`

---

## 기기 동기화 (Sync)

> 모든 엔드포인트 `Authorization` 필요

### GET /sync/status
연결된 기기 동기화 상태 목록

**Response** `200`
```json
{
  "data": [{
    "deviceId": "...", "deviceType": "apple_watch",
    "lastSyncedAt": null, "status": "idle", "errorMessage": null
  }]
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

**Response** `201` — 연결된 기기 객체 (`id, userId, deviceType, deviceId, accessToken, isActive, syncedAt`)

---

### POST /sync/devices/:id/sync
수동 동기화 트리거

**Response** `200`
```json
{ "data": { "deviceId": "...", "status": "sync_queued" } }
```

**에러**: `404 NOT_FOUND`

---

### DELETE /sync/devices/:id
기기 연결 해제 (soft delete, `isActive: false`)

**Response** `204`

---

## 공통 에러 코드

| HTTP | Code | 설명 |
|------|------|------|
| 400 | `INVALID_REQUEST` | 잘못된 요청 (자기 자신 매칭 포함) |
| 400 | `GROUP_FULL` | 그룹 최대 인원 초과 |
| 401 | `INVALID_CREDENTIALS` | 이메일/비밀번호 불일치 |
| 401 | `INVALID_TOKEN` | 토큰 만료 또는 무효 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `EMAIL_TAKEN` | 이메일 중복 |
| 409 | `ALREADY_MATCHED` | 이미 매칭 존재 |
