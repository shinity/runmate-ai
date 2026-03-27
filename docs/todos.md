# TODO 목록

## ✅ 완료

- [x] CI/CD 파이프라인 (GitHub Actions → GHCR → Synology NAS via Tailscale)
- [x] 상용 수준 인프라 (Nginx, Uptime Kuma, DB 자동 백업, 자동 롤백)
- [x] 프로덕션 Docker 빌드 수정 (workspace 패키지, prisma 자동 마이그레이션)
- [x] 로컬 프로덕션 테스트 (회원가입, 로그인, 런 생성, AI 코칭 인사이트)

---

## 🔥 진행 중

### NAS 배포 (P0)
- [ ] NAS에 `/volume1/docker/runmate-ai` 폴더 생성
- [ ] `.env` 파일 실제 값으로 작성
- [ ] 첫 배포 확인 (CI/CD 파이프라인 자동 처리)

---

## 📋 백로그

### 인프라
- [ ] **Docker dev/prod 환경 분리** — `-p` 프로젝트명 + Makefile (`make dev-up` / `make prod-up`)로 볼륨 충돌 방지
- [ ] **Cloudflare Tunnel** — NAS 외부 접근용 HTTPS, 동적 IP 해결 (cloudflared → tunnel → 시놀로지 도메인 연결)

### API 테스트
- [ ] 비밀번호 리셋 (`POST /auth/forgot-password`, `POST /auth/reset-password`)
- [ ] 주간 통계 (`GET /runs/stats/weekly`)
- [ ] 러닝메이트 매칭 (`GET /match`)

### 기능 개발
- [ ] **라우트 아트 워커** — Hugging Face FLUX.1-schnell (무료)로 GPS 경로 아트 이미지 생성
- [ ] **OAuth 소셜 로그인** — Apple(필수), Google, 카카오
- [ ] **Expo 앱 마켓 배포** — EAS Build → App Store / Play Store

---

## 📌 보류

- Pinecone 벡터 매칭 (OPENAI_API_KEY 필요, 유료)
- WebSocket 실시간 메시지 (매칭 후 채팅)
- Apple Health / Health Connect 연동
- Push 알림 (EXPO_ACCESS_TOKEN 발급 필요)
