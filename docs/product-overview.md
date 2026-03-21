# Product Overview

## 서비스 개요

**RunMate AI**는 러너의 습관·기록·루틴을 AI가 분석해 개인 맞춤 코칭을 제공하고, 비슷한 러너를 연결해주는 모바일 앱입니다.

> "혼자 달리지 않아도 됩니다. AI 코치와 함께, 나와 닮은 러너와 함께."

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **AI 코칭** | 런 완료 후 Claude가 페이스·심박수·훈련 부하를 분석해 코칭 인사이트 자동 생성 |
| **훈련 계획** | 목표(5k/마라톤 등)와 현재 수준을 입력하면 AI가 주차별 맞춤 훈련 계획 생성 |
| **회복 관리** | 최근 훈련 부하를 기반으로 오늘의 회복 점수와 권장 강도 제공 |
| **러너 매칭** | 페이스·스타일·일정이 비슷한 러너 추천 및 1:1 매칭 |
| **그룹 런** | 지역·목표 기반 러닝 그룹 생성 및 참여 |
| **웨어러블 연동** | Apple Watch, Garmin, Galaxy Watch 등 6개 기기 지원 |
| **라우트 아트** | GPS 경로를 AI 이미지로 변환 (Phase 3) |

---

## 타겟 유저

| 세그먼트 | 특징 |
|----------|------|
| 입문 러너 | 처음 달리기 시작, 코칭이 필요하지만 PT 비용 부담 |
| 중급 러너 | 기록 향상을 원하지만 혼자 계획 수립이 어려움 |
| 함께 달리고 싶은 러너 | 러닝 메이트를 찾기 어려운 상황 |

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 모바일 | Expo SDK 52 + React Native + Expo Router |
| 백엔드 | Fastify v5 + TypeScript + Prisma |
| 데이터베이스 | PostgreSQL (TimescaleDB) |
| 캐시/큐 | Redis + BullMQ |
| AI | Claude API (claude-sonnet-4-5) |
| 임베딩 | OpenAI text-embedding-3-small + Pinecone (Phase 2) |
| 이미지 생성 | Replicate SDXL (Phase 3) |
| 인프라 | Docker Compose (로컬), 확장 예정 |

---

## 개발 단계

### MVP (현재)
- 런 기록 + AI 코칭 인사이트 (Claude API 직접 호출)
- AI 훈련 계획 생성
- 페이스 기반 러너 매칭 (DB 쿼리)
- 웨어러블 기기 연동 구조

### Phase 2
- Python AI 파이프라인 분리 (`services/ai-pipeline`)
- OpenAI 임베딩 + Pinecone 벡터 매칭
- GPS 스트림 데이터 (TimescaleDB 하이퍼테이블)
- 푸시 알림 (Expo Push)

### Phase 3
- 라우트 아트 생성 (Replicate SDXL)
- 소셜 피드 (공개 런 공유)
- 러닝 챌린지

---

## 수익 모델 (예정)

| 모델 | 내용 |
|------|------|
| Freemium | 무료: 기본 기록 + 주 3회 AI 인사이트 |
| Pro 구독 | 무제한 AI 코칭 + 훈련 계획 + 라우트 아트 |
| 그룹 플랜 | 팀/클럽 단위 구독 |
