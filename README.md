# RunMate AI 🏃

러너의 습관·기록·루틴을 모아 AI가 코칭하고, 비슷한 러너들을 매칭해주는 서비스

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| 🏃 **런 기록** | GPS 트래킹, 페이스·심박수·케이던스 기록, 웨어러블 자동 동기화 |
| 🤖 **AI 코칭** | 런 완료 후 Claude AI가 회복 조언·훈련 분석·습관 개선 인사이트 제공 |
| 🎯 **훈련 계획** | 목표·레벨·가용 요일 기반 AI 맞춤 훈련 계획 자동 생성 |
| 👥 **러너 매칭** | 유사한 페이스·스타일의 러너를 매칭해 러닝메이트·그룹 연결 |
| 🎨 **라우트 아트** | 내 러닝 경로를 AI가 수채화 아트로 변환 (Phase 3) |

---

## 기술 스택

### 모바일
- **React Native (Expo)** — iOS / Android 단일 코드베이스
- **Expo Router** — 파일 기반 네비게이션
- **Zustand** — 클라이언트 상태 관리
- **TanStack Query** — 서버 상태 및 캐싱

### 백엔드
- **Node.js + Fastify + TypeScript** — REST API
- **Prisma + PostgreSQL** — 데이터베이스 ORM
- **BullMQ + Redis** — 비동기 AI 작업 큐
- **JWT** — 인증

### AI / ML
- **Claude API** (claude-sonnet-4-5) — 코칭 인사이트, 훈련 계획 생성
- **OpenAI Embeddings** (text-embedding-3-small) — 러너 유사도 임베딩
- **Pinecone** — 벡터 검색 (러너 매칭)
- **Replicate SDXL** — 라우트 아트 이미지 생성

### 인프라
- **Docker Compose** — 로컬 개발 환경
- **Turborepo** — 모노레포 빌드 시스템

---

## 프로젝트 구조

```
runmate-ai/
├── apps/
│   └── mobile/              # Expo React Native 앱
│       ├── app/             # Expo Router 화면
│       │   └── (tabs)/      # 홈 / 런 기록 / AI코치 / 매칭 / 프로필
│       ├── stores/          # Zustand 상태 (auth, run)
│       ├── hooks/           # React Query 훅
│       └── lib/             # API 클라이언트, 포맷 유틸
├── services/
│   ├── api/                 # Fastify 백엔드
│   │   ├── src/routes/      # auth, runs, coaching, matching, sync
│   │   ├── src/workers/     # BullMQ + Claude 워커
│   │   └── prisma/          # DB 스키마
│   └── ai-pipeline/         # Python FastAPI AI 서비스
│       ├── coaches/         # Claude 코칭 파이프라인
│       ├── matching/        # Pinecone 임베딩
│       └── art/             # Replicate 라우트 아트
├── packages/
│   ├── types/               # 공유 TypeScript 타입
│   └── validators/          # 공유 Zod 스키마
└── infrastructure/
    └── docker/              # Docker Compose 설정
```

---

## 시작하기

### 사전 요구사항

- Node.js 22+
- Python 3.12+
- PostgreSQL 16
- Redis 7

### 1. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일에서 아래 키를 설정합니다:

```env
DATABASE_URL=postgresql://user@localhost:5432/runmate
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. 의존성 설치

```bash
npm install
```

### 3. DB 스키마 적용

```bash
cd services/api
npx prisma db push
```

### 4. API 서버 실행

```bash
cd services/api
npm run dev
# → http://localhost:3000
# → Swagger: http://localhost:3000/docs
```

### 5. 모바일 앱 실행

```bash
cd apps/mobile
npx expo start
```

Expo Go 앱으로 QR 코드를 스캔하거나 시뮬레이터에서 실행합니다.

### 6. AI 파이프라인 실행 (선택)

```bash
cd services/ai-pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## API 문서

서버 실행 후 http://localhost:3000/docs 에서 Swagger UI로 전체 API를 확인할 수 있습니다.

### 주요 엔드포인트

```
POST /api/v1/auth/register       회원가입
POST /api/v1/auth/login          로그인

GET  /api/v1/runs                런 목록
POST /api/v1/runs                런 기록 생성
GET  /api/v1/runs/stats/weekly   주간 통계
GET  /api/v1/runs/personal-records  개인 최고 기록

POST /api/v1/coaching/plans/generate  AI 훈련 계획 생성
GET  /api/v1/coaching/insights        코칭 인사이트 피드
GET  /api/v1/coaching/recovery        오늘의 회복 상태

GET  /api/v1/match/suggestions        러닝메이트 추천
POST /api/v1/match/request/:userId    매칭 요청
```

---

## 개발 로드맵

### Phase 1 — MVP (현재)
- [x] 프로젝트 스캐폴딩 (모노레포, 공유 타입)
- [x] 인증 (JWT)
- [x] 런 기록 API
- [x] AI 코칭 인사이트 (Claude API)
- [x] AI 훈련 계획 생성
- [x] 러너 매칭 (DB 기반)
- [x] 모바일 앱 5개 탭 화면
- [ ] HealthKit / Health Connect 자동 동기화
- [ ] 푸시 알림

### Phase 2 — 소셜 + 웨어러블
- [ ] Garmin Connect API 연동
- [ ] Apple Watch 컴패니언 앱
- [ ] 실시간 런 추적 (WebSocket)
- [ ] Pinecone 임베딩 기반 매칭
- [ ] 러닝 그룹 챌린지

### Phase 3 — 고도화
- [ ] 라우트 아트 생성 (Replicate SDXL)
- [ ] 부상 위험도 예측 (XGBoost)
- [ ] 레이스 타임 예측
- [ ] 커뮤니티 피드

---

## 라이선스

Private — All rights reserved
