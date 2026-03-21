# ERD (Entity Relationship Diagram)

> Mermaid 문법 사용. GitHub / VS Code Mermaid Preview에서 렌더링 가능.

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string passwordHash
        string displayName
        string avatarUrl
        date dateOfBirth
        string gender
        int heightCm
        float weightKg
        string experienceLevel
        string primaryGoal
        float weeklyTargetKm
        int preferredPaceMinSecPerKm
        int preferredPaceMaxSecPerKm
        string city
        string countryCode
        string timezone
        boolean matchingEnabled
        boolean preferGroupRuns
        float maxMatchDistanceKm
        datetime createdAt
        datetime updatedAt
        datetime lastActiveAt
    }

    ConnectedDevice {
        string id PK
        string userId FK
        string deviceType
        string deviceId
        string accessToken
        string refreshToken
        datetime syncedAt
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Run {
        string id PK
        string userId FK
        datetime startedAt
        datetime endedAt
        int durationSeconds
        float distanceMeters
        float elevationGainMeters
        float elevationLossMeters
        float avgPaceSecPerKm
        float bestPaceSecPerKm
        int avgHeartRate
        int maxHeartRate
        int avgCadenceSpm
        float avgPowerWatts
        float vo2maxEstimate
        float trainingLoad
        int effortScore
        float weatherTempC
        float weatherHumidity
        string weatherCondition
        string surfaceType
        string dataSource
        string rawGpxUrl
        string routeArtUrl
        boolean isPublic
        string title
        string notes
        datetime createdAt
    }

    RunSplit {
        string id PK
        string runId FK
        int splitNumber
        string splitType
        int durationSeconds
        float paceSecPerKm
        int heartRate
    }

    CoachingPlan {
        string id PK
        string userId FK
        string title
        string description
        string goal
        datetime startDate
        datetime endDate
        string status
        json weeks
        float adherenceScore
        datetime lastAdaptedAt
        int adaptationCount
        string generatedBy
        string modelVersion
        datetime createdAt
        datetime updatedAt
    }

    CoachingInsight {
        string id PK
        string userId FK
        string runId FK
        string planId FK
        string type
        string content
        string priority
        json metrics
        json actionItems
        datetime readAt
        datetime dismissedAt
        datetime createdAt
    }

    MatchProfile {
        string id PK
        string userId FK "unique"
        float avgPaceSecPerKm
        float avgWeeklyKm
        float consistencyScore
        string preferredRunTime
        json preferredRunDays
        float preferredDistanceKm
        string runningStyle
        string communicationPref
        string lookingFor
        int maxPaceDifferenceSecPerKm
        boolean preferVirtualOnly
        boolean isLocationPublic
        datetime embeddingUpdatedAt
        datetime updatedAt
    }

    RunnerMatch {
        string id PK
        string requesterId FK
        string matchedUserId FK
        string matchType
        string groupId
        float similarityScore
        json compatibility
        string status
        datetime matchedAt
        datetime respondedAt
        datetime endedAt
        string endReason
    }

    RunnerGroup {
        string id PK
        string name
        string description
        string createdBy
        int maxMembers
        boolean isPublic
        json tags
        datetime createdAt
        datetime updatedAt
    }

    GroupMember {
        string userId FK
        string groupId FK
        string role
        datetime joinedAt
    }

    User ||--o{ ConnectedDevice : "has"
    User ||--o{ Run : "records"
    User ||--o{ CoachingPlan : "has"
    User ||--o{ CoachingInsight : "receives"
    User ||--o| MatchProfile : "has"
    User ||--o{ RunnerMatch : "requests (as requester)"
    User ||--o{ RunnerMatch : "receives (as matched)"
    User ||--o{ GroupMember : "joins"

    Run ||--o{ RunSplit : "has"
    Run ||--o{ CoachingInsight : "generates"

    CoachingPlan ||--o{ CoachingInsight : "related to"

    RunnerGroup ||--o{ GroupMember : "has"
```

---

## 관계 요약

| 관계 | 설명 |
|------|------|
| `User` → `Run` | 1:N — 유저는 여러 런 기록을 가짐 |
| `User` → `MatchProfile` | 1:1 — 매칭 프로필은 유저당 하나 |
| `User` → `CoachingPlan` | 1:N — 유저는 여러 훈련 계획을 가짐 |
| `User` → `CoachingInsight` | 1:N — 유저는 여러 AI 인사이트를 받음 |
| `User` → `ConnectedDevice` | 1:N — 유저는 여러 기기를 연결 가능 |
| `Run` → `RunSplit` | 1:N — 런은 여러 구간 기록을 가짐 |
| `Run` → `CoachingInsight` | 1:N — 런 완료 시 인사이트 생성 |
| `User` → `RunnerMatch` | 1:N (양방향) — requester / matched 두 FK |
| `RunnerGroup` → `GroupMember` | 1:N — 그룹은 여러 멤버를 가짐 |
| `User` → `GroupMember` | 1:N — 유저는 여러 그룹에 가입 가능 |

---

## 인덱스 전략

| 모델 | 인덱스 | 목적 |
|------|--------|------|
| `User` | `email` | 로그인 조회 |
| `Run` | `(userId, startedAt DESC)` | 런 목록 (메인 쿼리) |
| `Run` | `startedAt` | 기간 필터 |
| `ConnectedDevice` | `userId` | 유저 기기 목록 |
| `CoachingPlan` | `(userId, status)` | 활성 계획 조회 |
| `CoachingInsight` | `(userId, createdAt DESC)` | 인사이트 피드 |
| `CoachingInsight` | `(userId, readAt)` | 읽지 않은 인사이트 |
| `RunnerMatch` | `requesterId`, `matchedUserId` | 매칭 조회 (양방향) |
