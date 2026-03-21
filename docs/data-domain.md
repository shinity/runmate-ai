# Data Domain Structure

## 도메인 개요

RunMate AI의 데이터는 5개 핵심 도메인으로 구성됩니다.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────▶│     Run     │────▶│  Coaching   │
│  (유저)     │     │  (런 기록)  │     │  (AI 코칭)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                        │
       ▼                                        │
┌─────────────┐                         ┌──────┴──────┐
│   Device    │                         │  CoachingPlan│
│ (웨어러블)  │                         │  CoachingInsight│
└─────────────┘                         └─────────────┘
       │
       ▼
┌─────────────┐
│  Matching   │
│ (러너 매칭) │
└─────────────┘
```

---

## 도메인 1: User

**목적**: 유저 계정, 신체 정보, 러닝 프로필

**핵심 모델**: `User`

| 그룹 | 필드 |
|------|------|
| 계정 | `email`, `passwordHash`, `displayName`, `avatarUrl` |
| 신체 | `dateOfBirth`, `gender`, `heightCm`, `weightKg` |
| 러닝 프로필 | `experienceLevel`, `primaryGoal`, `weeklyTargetKm`, `preferredPace` |
| 위치 | `city`, `countryCode`, `timezone` |
| 매칭 설정 | `matchingEnabled`, `preferGroupRuns`, `maxMatchDistanceKm` |

**Enum**
- `ExperienceLevel`: `beginner` | `intermediate` | `advanced` | `elite`
- `RunningGoal`: `fitness` | `5k` | `10k` | `half_marathon` | `marathon` | `ultra`

**설계 결정**
- 비밀번호는 bcrypt hash 저장, API 응답에서 항상 omit
- 매칭 설정은 User 모델에 직접 포함 (별도 테이블 불필요)

---

## 도메인 2: Run

**목적**: 런 기록, 구간 분석, GPS 데이터

**핵심 모델**: `Run`, `RunSplit`

| 그룹 | 필드 |
|------|------|
| 시간 | `startedAt`, `endedAt`, `durationSeconds` |
| 거리/고도 | `distanceMeters`, `elevationGainMeters`, `elevationLossMeters` |
| 퍼포먼스 | `avgPaceSecPerKm`, `bestPaceSecPerKm`, `avgHeartRate`, `avgCadenceSpm`, `avgPowerWatts` |
| 파생 지표 | `vo2maxEstimate`, `trainingLoad`, `effortScore` |
| 환경 | `weatherTempC`, `weatherHumidity`, `surfaceType` |
| 미디어 | `rawGpxUrl`, `routeArtUrl` |

**RunSplit**: 1km 단위 구간 기록 (페이스, 심박수)

**설계 결정**
- GPS 스트림(`RunDatapoint`)은 Phase 2에서 TimescaleDB 하이퍼테이블로 분리 예정
- `trainingLoad`는 런 저장 시 계산 (duration × effortScore 기반)
- `routeArtUrl`은 BullMQ 비동기 처리 후 업데이트

**인덱스**
```
@@index([userId, startedAt DESC])  // 런 목록 (가장 빈번)
@@index([startedAt])               // 기간 필터
```

**DataSource**: `apple_health` | `health_connect` | `garmin_connect` | `manual` | `app_native`

---

## 도메인 3: Coaching

**목적**: AI 생성 훈련 계획 및 실시간 코칭 인사이트

**핵심 모델**: `CoachingPlan`, `CoachingInsight`

### CoachingPlan

| 필드 | 설명 |
|------|------|
| `title`, `description`, `goal` | 계획 메타정보 |
| `startDate`, `endDate` | 계획 기간 |
| `status` | `active` \| `paused` \| `completed` \| `abandoned` |
| `weeks` | JSON 컬럼 — 주차별 세션 배열 (`PlanWeek[]`) |
| `adherenceScore` | 계획 준수율 (0~1) |
| `generatedBy`, `modelVersion` | AI 생성 추적 |

**weeks JSON 구조**
```json
[{
  "weekNumber": 1,
  "targetDistanceKm": 20,
  "targetSessions": 4,
  "theme": "기초 체력",
  "sessions": [{
    "dayOfWeek": 1,
    "sessionType": "easy",
    "targetDistanceKm": 5,
    "targetPaceMinSecPerKm": 330,
    "targetPaceMaxSecPerKm": 360,
    "description": "편안한 속도로 5km"
  }]
}]
```

**설계 결정**: 훈련 계획은 구조가 자주 변경되므로 JSON 컬럼 사용. 개별 세션 쿼리가 필요해지면 정규화 검토.

### CoachingInsight

| 필드 | 설명 |
|------|------|
| `type` | 인사이트 유형 (6종) |
| `content` | AI 생성 텍스트 (2~4문장) |
| `priority` | `low` \| `medium` \| `high` \| `urgent` |
| `metrics` | 관련 수치 JSON (페이스, 심박수 등) |
| `actionItems` | 실행 항목 JSON 배열 (1~3개) |
| `readAt`, `dismissedAt` | 상태 추적 |

**InsightType**: `recovery_advice` | `performance_analysis` | `habit_pattern` | `injury_risk_alert` | `motivation` | `plan_adjustment`

---

## 도메인 4: Matching

**목적**: 러너 간 매칭, 그룹 관리

**핵심 모델**: `MatchProfile`, `RunnerMatch`, `RunnerGroup`, `GroupMember`

### MatchProfile

| 필드 | 설명 |
|------|------|
| `avgPaceSecPerKm` | 평균 페이스 (매칭 핵심 기준) |
| `avgWeeklyKm` | 주간 평균 거리 |
| `consistencyScore` | 훈련 일관성 점수 |
| `preferredRunTime` | `morning` \| `afternoon` \| `evening` \| `night` |
| `runningStyle` | `social` \| `competitive` \| `meditative` \| `mixed` |
| `maxPaceDifferenceSecPerKm` | 허용 페이스 차이 (기본 60초) |

**MVP 매칭 알고리즘**: DB 쿼리 기반 페이스 유사도 (±60초/km 이내)
**Phase 2**: OpenAI 임베딩 + Pinecone 벡터 검색 (페이스 40% + 일정 30% + 목표 20% + 스타일 10%)

### RunnerMatch

- `requesterId` / `matchedUserId` — 양방향 FK
- `status`: `pending` → `accepted` → `active` → `ended`
- `compatibility`: 호환성 점수 breakdown JSON

---

## 도메인 5: Device

**목적**: 웨어러블 기기 연동 및 동기화

**핵심 모델**: `ConnectedDevice`

| 필드 | 설명 |
|------|------|
| `deviceType` | 기기 종류 (6종) |
| `deviceId` | 기기 고유 식별자 |
| `accessToken`, `refreshToken` | 기기 OAuth 토큰 (앱 레벨 암호화) |
| `syncedAt` | 마지막 동기화 시각 |
| `isActive` | soft delete 패턴 |

**DeviceType**: `apple_watch` | `galaxy_watch` | `garmin` | `polar` | `fitbit` | `wahoo`

**설계 결정**: soft delete 사용 — 기기 재연결 시 이력 보존

---

## 공통 설계 원칙

| 원칙 | 내용 |
|------|------|
| ID | UUID (`@default(uuid())`) |
| 삭제 | User 삭제 시 모든 연관 데이터 `onDelete: Cascade` |
| 페이지네이션 | cursor 기반 (`id: { lt: cursor }` + `take: limit+1`) |
| JSON 컬럼 | 구조가 유동적이거나 개별 쿼리가 불필요한 데이터 |
| Timestamp | `createdAt @default(now())`, `updatedAt @updatedAt` |
