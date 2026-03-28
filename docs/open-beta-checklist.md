# 오픈베타 배포 체크리스트

> 작성일: 2026-03-28
> 목표: App Store / Play Store 오픈베타 런칭

---

## 현재 완성도

| 영역 | 완성도 | 상태 |
|------|--------|------|
| 백엔드 API | 95% | setErrorHandler 미등록 외 완료 |
| 모바일 UI/UX | 90% | 전체 화면 구현, 실기기 QA 필요 |
| 데이터베이스 | 100% | 완성 |
| 인프라 (CI/CD, NAS) | 100% | 완성 |
| 인증/보안 | 70% | OAuth 미구현, OTP 이메일 미발송 |
| 앱스토어 준비 | 0% | 미시작 |

---

## P0 — 배포 차단 항목 (반드시 해결)

### 1. 프로덕션 에러 핸들러 등록

- **현황**: `services/api/src/index.ts`에 `setErrorHandler` 미등록
- **영향**: Zod 검증 실패 시 500 Internal Server Error 반환
- **수정**: `index.ts`에 전역 에러 핸들러 추가 (30분)

### 2. 비밀번호 재설정 이메일 발송

- **현황**: `/auth/forgot-password`가 OTP를 API 응답에 그대로 노출 (MVP 임시 방편)
- **영향**: 실 사용자 배포 불가 — 보안 취약, UX 불완전
- **수정**: Resend 또는 SendGrid 연동하여 실제 이메일 발송 (2시간)
  ```
  추천: Resend (resend.com) — 무료 3,000통/월, Node.js SDK 간단
  ```

### 3. Apple 로그인 구현

- **현황**: 이메일/비밀번호 로그인만 존재
- **영향**: App Store 심사 규정 — 소셜 로그인 제공 시 Apple 로그인 필수
- **수정**: `expo-auth-session` + Apple OAuth 연동 (2~3일)
- **선행 조건**: Apple Developer Program 가입 ($99/년)

### 4. 서버 도메인 안정화

- **현황**: 가정용 포트 포워딩 방식 (diho-box.synology.me:4000)
- **영향**: 집 IP 변경 시 앱 전체 다운. 앱스토어 심사 시 심사관 접근 필요
- **옵션**:
  - Cloudflare Tunnel (권장): 고정 도메인 + HTTPS 자동, 집 IP 숨김
  - 현행 유지: DDNS 설정 확인 및 모니터링 강화

---

## P1 — 오픈베타 품질 항목

### 5. Google OAuth

- **영향**: 가입 마찰 감소, Android 사용자 UX 개선
- **수정**: `expo-auth-session` + Google OAuth 연동 (1일)
- **선행 조건**: Google Cloud Console OAuth 클라이언트 ID 발급

### 6. 개인정보처리방침 / 이용약관

- **영향**: App Store / Play Store 심사 필수 서류
- **방법**: 웹 페이지 URL 제출 (GitHub Pages, Notion 공개 페이지 등 가능)
- **포함 내용**: 수집 데이터 항목, 보존 기간, GPS 데이터 사용 목적

### 7. Apple Developer Program 가입

- **비용**: $99/년
- **역할**: iOS 빌드 서명, TestFlight, App Store 제출
- **소요**: 가입 후 1~2일 승인

### 8. Google Play Console 가입

- **비용**: $25 (1회)
- **역할**: Android APK/AAB 배포, Play Store 제출

### 9. 실기기 QA

- **현황**: 시뮬레이터/에뮬레이터만 테스트됨
- **체크 항목**:
  - [ ] GPS 트래킹 실외 테스트
  - [ ] 백그라운드 위치 추적 (앱 전환 시)
  - [ ] 푸시 알림 수신
  - [ ] HealthKit / Health Connect 연동
  - [ ] 실시간 채팅 WebSocket 안정성

---

## P2 — 품질 개선 항목

### 10. 성능 최적화

| 항목 | 현황 | 개선 |
|------|------|------|
| 런 히스토리 리스트 | `ScrollView` | `FlatList`로 전환 |
| 이미지 캐싱 | 미적용 | `expo-image` 또는 캐시 헤더 추가 |

### 11. 오프라인 대응

- 네트워크 없을 때 런 데이터 로컬 저장 후 온라인 복귀 시 동기화

### 12. 앱 아이콘 / 스플래시 스크린

- 현황: Expo 기본 아이콘 사용 중
- App Store 제출 전 브랜드 아이콘 필요

---

## 추천 진행 순서

```
1주차 — 서버/보안 완성
  Day 1  setErrorHandler 추가 (30분)
  Day 1  Resend 이메일 연동 (2시간)
  Day 2-4  Apple 로그인 구현
  Day 5  Google 로그인 구현

2주차 — 앱스토어 준비
  Day 1  Apple Developer Program 가입
  Day 2  개인정보처리방침 페이지 작성
  Day 3  앱 아이콘 / 스플래시 스크린 제작
  Day 4-5  실기기 QA + 버그 수정

3주차 — 베타 런칭
  Day 1  EAS iOS 빌드 + TestFlight 업로드
  Day 2  App Store 심사 제출 (심사 4~7일 소요)
  Day 3  Play Store 내부 테스트 트랙 등록
  Day 7+  App Store 승인 → 오픈베타 공개
```

---

## 앱스토어 심사 주요 요구사항

### App Store (Apple)

| 요구사항 | 현황 |
|---------|------|
| Apple 로그인 | ❌ 미구현 |
| 개인정보처리방침 URL | ❌ 없음 |
| GPS 사용 목적 설명 (`NSLocationWhenInUseUsageDescription`) | ✅ 있음 |
| 건강 데이터 사용 목적 (`NSHealthShareUsageDescription`) | ✅ 있음 |
| 실제 기능하는 앱 (심사관 테스트 가능) | ✅ 서버 운영 중 |

### Google Play

| 요구사항 | 현황 |
|---------|------|
| 개인정보처리방침 URL | ❌ 없음 |
| 위치 권한 사용 목적 선언 | ✅ 있음 |
| 타겟 SDK 버전 (API 34+) | ✅ 충족 |

---

## 비용 요약

| 항목 | 비용 | 주기 |
|------|------|------|
| Apple Developer Program | $99 | 연간 |
| Google Play Console | $25 | 1회 |
| Resend (이메일) | 무료 3,000통/월 | 월간 |
| Claude API | 사용량 기반 | 월간 |
| NAS 전기요금 | ~₩5,000 | 월간 |
| **합계 (초기)** | **약 ₩170,000** | — |
