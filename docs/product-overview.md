# Product Overview

## 서비스 개요

**RunMate AI**는 러너의 습관·기록·루틴을 AI가 분석해 개인 맞춤 코칭을 제공하고, GPS 경로를 아트로 변환하는 모바일 앱입니다.

> "달릴 때마다 당신만의 아트가 만들어집니다. AI 코치와 함께, 더 스마트하게."

---

## 핵심 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| **러닝 기록** | GPS 실시간 추적, 페이스/거리/심박수 기록 | ✅ 완료 |
| **AI 코칭** | 런 완료 후 Claude가 자동으로 코칭 인사이트 생성 | ✅ 완료 |
| **훈련 계획** | 목표와 현재 수준 입력 → AI가 주차별 맞춤 계획 생성 | ✅ 완료 |
| **회복 관리** | 훈련 부하 기반 오늘의 컨디션 & 권장 강도 제공 | ✅ 완료 |
| **Route Art** | GPS 경로 → SVG 아트 자동 생성, 갤러리 관리 | ✅ 완료 |
| **Animated Route Art** | SVG 경로 + 배경/캐릭터 프리셋 → GIF 애니메이션 생성 | ✅ 완료 |
| **러닝메이트 매칭** | 페이스·스타일·일정이 비슷한 러너 추천 및 1:1 매칭 | 🚧 준비 중 |
| **채팅** | 매칭된 러너와 실시간 채팅 (WebSocket) | ✅ 완료 |
| **웨어러블 연동** | Apple HealthKit / Health Connect 동기화 | ✅ 완료 |

---

## 타겟 유저

| 세그먼트 | 특징 |
|----------|------|
| 입문 러너 | 처음 달리기 시작, AI 코칭이 필요하지만 PT 비용 부담 |
| 중급 러너 | 기록 향상을 원하지만 혼자 계획 수립이 어려움 |
| 아트 러버 | GPS 경로를 감성적인 아트로 남기고 싶은 러너 |

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 모바일 | Expo SDK 54 + React Native 0.81 + Expo Router |
| 백엔드 | Fastify v5 + TypeScript + Prisma |
| 데이터베이스 | PostgreSQL 16 |
| 캐시/큐 | Redis + BullMQ |
| AI | Claude API (claude-sonnet-4-6) |
| 이미지 처리 | Sharp (GIF 프레임 합성) |
| 벡터 검색 | Pinecone (선택적, DB 폴백 지원) |
| 이메일 | Resend (OTP 발송) |
| 인프라 | Docker Compose + Nginx + Synology NAS |
| CI/CD | GitHub Actions → GHCR → NAS 자동 배포 |
| 모바일 빌드 | EAS Build (Android APK) |

---

## 개발 단계

### ✅ MVP (완료)
- 런 기록 + GPS 추적
- AI 코칭 인사이트 (Claude API)
- AI 훈련 계획 생성
- Route Art (GPS → SVG)
- Animated Route Art (SVG + 배경/캐릭터 → GIF)
- Google OAuth (Android)
- 이메일 OTP 비밀번호 재설정
- 웨어러블 연동 구조
- EAS Android APK 빌드

### 🚧 진행 중
- 러닝메이트 매칭 (UI 준비 중, API 완료)
- Animated Route Art 배경 이미지 실사 생성 (FLUX.1 연동 예정)

### 📋 예정
- iOS 프로덕션 빌드 (Apple Developer Program 필요)
- 소셜 피드 (공개 런 공유)
- 러닝 챌린지
- 푸시 알림

---

## 수익 모델 (예정)

| 모델 | 내용 |
|------|------|
| Freemium | 무료: 기본 기록 + 주 3회 AI 인사이트 |
| Pro 구독 | 무제한 AI 코칭 + 훈련 계획 + Animated Route Art |
| 그룹 플랜 | 팀/클럽 단위 구독 |
