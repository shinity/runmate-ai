# TODO 목록

## ✅ 완료

- [x] CI/CD 파이프라인 (GitHub Actions → GHCR → Synology NAS via Tailscale)
- [x] 상용 수준 인프라 (Nginx, Uptime Kuma, DB 자동 백업, 자동 롤백)
- [x] 프로덕션 Docker 빌드 수정 (workspace 패키지, prisma 자동 마이그레이션)
- [x] 로컬 프로덕션 테스트 (회원가입, 로그인, 런 생성, AI 코칭 인사이트)

---

## 🔥 P0 — 서비스 오픈 전 필수

### NAS 배포 (진행 중)
- [ ] NAS에 `/volume1/docker/runmate-ai` 폴더 생성
- [ ] `.env` 파일 실제 값으로 작성
- [ ] 첫 배포 확인 (CI/CD 파이프라인 자동 처리)

### Cloudflare Tunnel
- [ ] cloudflared 설치 → tunnel 생성 → 시놀로지 도메인 DNS 연결
- [ ] 외부에서 앱 → API 접근 가능 확인
- **Why:** 가정용 동적 IP 해결, 집 IP 노출 없이 HTTPS 무료 제공

### API 테스트
- [ ] 비밀번호 리셋 (`POST /auth/forgot-password`, `POST /auth/reset-password`)
- [ ] 주간 통계 (`GET /runs/stats/weekly`)
- [ ] 러닝메이트 매칭 (`GET /match`)

---

## 🟡 P1 — 사용자 획득에 필요

### OAuth 소셜 로그인
- [ ] Apple 로그인 (App Store 심사 통과 필수)
- [ ] Google 로그인 (iOS/Android 공통)
- [ ] 카카오 로그인 (선택)
- **Why:** 이메일 가입 마찰 감소, App Store 심사 요건

### Expo 앱 마켓 배포
- [ ] Apple Developer Program 가입 ($99/년)
- [ ] Google Play Console 가입 ($25)
- [ ] EAS Build 설정 → 빌드 → 심사 제출

---

## 🔵 P2 — 차별화 기능 / 개발 편의

### 라우트 아트 워커
- [ ] Hugging Face FLUX.1-schnell (무료)로 GPS 경로 아트 이미지 생성
- [ ] routeArtQueue 워커 완성

### Docker dev/prod 환경 분리
- [ ] `-p` 프로젝트명 분리 + Makefile (`make dev-up` / `make prod-up`)
- **Why:** 볼륨 충돌 방지 (오늘 `runmate_dev` vs `runmate_prod_test` 충돌 경험)

---

## 📌 보류 — 비용/리소스 필요 시

- Pinecone 벡터 매칭 (OPENAI_API_KEY 필요, 유료)
- WebSocket 실시간 메시지 (매칭 후 채팅)
- Apple Health / Health Connect 연동
- Push 알림 (EXPO_ACCESS_TOKEN 발급 필요)
