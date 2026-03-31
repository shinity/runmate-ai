# TODO 목록

## ✅ 완료

- [x] CI/CD 파이프라인 (GitHub Actions → GHCR → Synology NAS via Tailscale)
- [x] 상용 수준 인프라 (Nginx, Uptime Kuma, DB 자동 백업, 자동 롤백)
- [x] 프로덕션 Docker 빌드 수정 (workspace 패키지, prisma 자동 마이그레이션)
- [x] 로컬 프로덕션 테스트 (회원가입, 로그인, 런 생성, AI 코칭 인사이트)
- [x] NAS 배포 완료 (runmate-ai 전용 계정, 전체 스택 운영 중)
- [x] GHCR 이미지 정리 정책 (최신 5개 유지, NAS 7일 이상 자동 삭제)
- [x] **Route Art 갤러리 탭 (P0)** — 매칭 탭 → 갤러리 탭 전환, 2열 그리드, 생성 중 shimmer, GPS 없음 상태
- [x] **Route Art 상세 화면** — 풀스크린 SVG, 런 요약, 공유, 런 상세 연결
- [x] **홈 최근 Route Art 카드** — routeArtUrl 있는 최신 런 하이라이트
- [x] **Route Art 생성 중 폴링** — RunDetailModal에서 5초×6회 TanStack Query refetchInterval

---

## 🔥 P0 — 서비스 오픈 전 필수

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

### 라우트 아트 고도화 (P1)
- [x] RunDetailModal Route Art 섹션 강화 (위치 이동, 크기 300px, 탭으로 상세 이동)
- [x] 카메라롤 저장 (expo-media-library)
- [x] SVG → PNG 변환 공유 (react-native-view-shot)
- [x] 매칭 기능 → 프로필 하위 이동 ("준비 중" 라벨)

### 라우트 아트 AI 이미지 (P2)
- [ ] Hugging Face FLUX.1-schnell (무료)로 GPS 경로 아트 이미지 생성
- [ ] routeArtQueue 워커 완성
- [ ] Route Art 스타일 선택 (색상 테마, 배경)
- [x] Route Art 스와이프 탐색 (갤러리 내 이전/다음)

### Animated Route Art — MVP (P2, 스펙: docs/feature-spec-animated-route-art.md)
- [x] `POST /runs/:id/animate` + `GET /runs/:id/animate/status` 엔드포인트
- [x] BullMQ `animate-route-art` 워커 (SVG animateMotion 기반, 프리셋 배경/캐릭터)
- [x] Run 모델에 `animatedRouteArtUrl`, `animateStatus`, `animateStep`, `animateJobId` 필드 추가
- [x] 애니메이션 제작 화면 (배경 6종 + 캐릭터 6종 선택 + 미리보기)
- [x] 생성 중 화면 (단계별 진행 UI + 3초 폴링)
- [x] 결과물 화면 (애니메이션 표시 + 공유)
- [x] Route Art 상세에 "애니메이션 만들기" 버튼 추가

### Animated Route Art — AI 배경 + 확장 (P2)
- [ ] FLUX.1-schnell AI 배경 생성 연동
- [x] 애니메이션 속도 조절 슬라이더
- [x] 갤러리 탭 GIF 뱃지 오버레이
- [x] 프리셋 배경/캐릭터 추가 (6종 → 12종)
- [ ] 경로 색상/두께 커스터마이징
- [ ] GIF → MP4 비디오 지원 (파일 크기 최적화)

### Docker dev/prod 환경 분리
- [ ] `-p` 프로젝트명 분리 + Makefile (`make dev-up` / `make prod-up`)
- **Why:** 볼륨 충돌 방지 (오늘 `runmate_dev` vs `runmate_prod_test` 충돌 경험)

---

## 📌 보류 — 비용/리소스 필요 시

- Pinecone 벡터 매칭 (OPENAI_API_KEY 필요, 유료)
- WebSocket 실시간 메시지 (매칭 후 채팅)
- Apple Health / Health Connect 연동
- Push 알림 (EXPO_ACCESS_TOKEN 발급 필요)
- 사용자 커스텀 캐릭터 업로드 (에셋 관리 부담)
- 실시간 러닝 중 애니메이션 (배터리/성능 이슈)
