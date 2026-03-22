# 개발 로드맵 및 할 일 목록

> 마지막 업데이트: 2026-03-22

---

## 진행 중

### CI/CD + NAS 배포 설정

**남은 작업:**

1. **NAS SSH 접속 해결**
   - 외부 도메인(`diho-box.synology.me:20022`) 타임아웃 → 로컬 IP로 시도
   - DSM → 제어판 → 터미널 → SSH 활성화 확인

2. **Tailscale 설치**
   - NAS: DSM Package Center → Tailscale 설치
   - Tailscale 대시보드에서 NAS IP 확인 (100.x.x.x)

3. **NAS 초기 설정**
   ```bash
   # NAS SSH 접속 후
   mkdir -p /volume1/docker/runmate-ai
   cd /volume1/docker/runmate-ai
   git clone https://github.com/너의레포/runmate-ai.git .
   cp .env.example .env  # 값 채우기
   ```

4. **GitHub Secrets 등록** (저장소 Settings → Secrets → Actions)

   | Secret | 값 |
   |--------|---|
   | `NAS_TAILSCALE_IP` | Tailscale NAS IP (100.x.x.x) |
   | `NAS_SSH_USER` | 시놀로지 사용자명 |
   | `NAS_SSH_KEY` | NAS에서 생성한 SSH 개인키 |
   | `NAS_PROJECT_PATH` | `/volume1/docker/runmate-ai` |
   | `TAILSCALE_OAUTH_CLIENT_ID` | Tailscale Admin → OAuth clients |
   | `TAILSCALE_OAUTH_SECRET` | (위와 동일) |
   | `GEMINI_API_KEY` | Gemini API 키 |

5. **GHCR 이미지 빌드 확인**
   - master 브랜치 push → GitHub Actions 실행 확인
   - `ghcr.io/유저명/runmate-api:latest` 이미지 생성 확인

---

## 다음 우선순위

### 1. Mac 고정 IP 설정
- 문제: 재부팅/네트워크 변경 시 `EXPO_PUBLIC_API_URL` 수동 갱신 필요
- 해결: 시스템 설정 → 네트워크 → Wi-Fi → 세부사항 → TCP/IP → IPv4 수동 설정

### 2. 앱 기능 테스트 및 버그 수정
분석으로 발견된 P0/P1 이슈:

| 우선순위 | 파일 | 이슈 |
|---------|------|------|
| P0 ✅ | `useHealthSync.ts` | `useState` → `useEffect` 수정 완료 |
| P0 ✅ | `_layout.tsx` | AuthGuard 리다이렉트 루프 수정 완료 |
| P1 | `match-settings.tsx` | 저장 시 `matchingEnabled` 누락 |
| P1 | `lib/api.ts` | refresh 후 응답 status 검증 없음 |
| P1 | `coach.tsx` | 훈련 계획 생성 시 `currentFitnessLevel` 하드코딩 |
| P2 | `coach.tsx`, `match.tsx` | ScrollView → FlatList 변환 (성능) |
| P2 | `RunDetailModal.tsx` | split 페이스 바 차트 범위 동적화 |

### 3. Cloudflare Tunnel 설정
- NAS 배포 완료 후 외부 접근용
- `cloudflared` 설치 → tunnel 생성 → `diho-box.synology.me` 연결
- 완료 시 모바일 앱 `EXPO_PUBLIC_API_URL`을 도메인으로 변경 가능

---

## 백로그 (나중에)

### OAuth 소셜 로그인
- **Apple 로그인** (App Store 정책상 소셜 로그인 제공 시 필수)
- **Google 로그인** (iOS/Android 공통)
- **카카오 로그인** (선택, 한국 유입 효과)
- 사전 준비: Apple Developer 계정, Google Cloud Console 설정
- 백엔드: `User` 모델에 `provider`/`providerId` 추가, `POST /auth/oauth`

### Expo 앱 마켓 배포 (EAS Build)
- Apple Developer Program ($99/년) + Google Play Console ($25) 가입 필요
- 순서: `eas build:configure` → `eas build` → `eas submit`
- iOS 심사 시 Apple 로그인 필수 포함 확인

### 비밀번호 찾기 이메일 발송
- 현재: OTP 코드가 API 응답에 노출 (MVP 방식)
- 개선: SendGrid / AWS SES / Resend 연동 → 이메일 발송
- 코드에서 `code` 응답 제거

### 라우트 아트 고도화
- 현재: matplotlib 3D (서버에서 Python 렌더링)
- 개선안: Hugging Face Inference API (FLUX.1-schnell) 활용
- `HUGGINGFACE_API_KEY` 환경변수 추가 필요

### 웨어러블 기기 확장
- 현재: Apple Watch, Garmin, Galaxy Watch만 지원
- 추가 예정: Fitbit, Polar, Suunto

---

## 알려진 기술적 제약

| 항목 | 내용 |
|------|------|
| HealthKit/Health Connect | 실기기 + Custom Dev Build에서만 동작 (시뮬레이터 불가) |
| Gemini API 무료 한도 | 1,500 req/day — 트래픽 증가 시 유료 전환 필요 |
| Pinecone | 계정 있음, 임베딩 업데이트 워커 구현 완료 |
| Mac IP 유동성 | 개발 시 `.env.local` 수동 갱신 필요 |
| iOS 빌드 | Xcode 26.3 베타 사용 중, 정식 릴리즈 후 재검토 권장 |
