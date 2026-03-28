# CI/CD 파이프라인

## 트리거 조건

| 이벤트 | 동작 |
|--------|------|
| `master` 브랜치에 push | 테스트 → 빌드 → 배포 전체 실행 |
| `master` 브랜치로 PR 생성 | 테스트만 실행 (빌드/배포 생략) |

> **개발 흐름**: `develop` 브랜치에서 작업 → PR → `master` 머지 시 자동 배포

---

## 전체 플로우

```
master push
     │
     ▼
┌─────────────┐
│  1. TEST    │  약 1~2분
│             │
│ PostgreSQL  │
│ + Redis     │  실제 DB/Redis 컨테이너 실행
│ 스핀업      │
│             │
│ npm install │
│ build pkgs  │  packages/types, validators 빌드
│ prisma push │  스키마 → 테스트 DB 반영
│ vitest run  │  66개 테스트 (API 전체)
└──────┬──────┘
       │ 성공 시
       ▼
┌─────────────────┐
│  2. BUILD       │  약 3~5분
│                 │
│ GHCR 로그인     │  ghcr.io/shinity/runmate-api
│ Docker Buildx   │  멀티플랫폼 빌드 + GHA 캐시
│ image push      │  :latest + :sha-xxxxxxx 태그
│ 오래된 이미지   │  최근 5개만 유지, 나머지 삭제
│ 정리            │
└────────┬────────┘
         │ 성공 시 (master만)
         ▼
┌──────────────────────┐
│  3. DEPLOY           │  약 1~2분
│                      │
│ Tailscale VPN 연결   │  GitHub → NAS 사설망 접근
│ SCP: 설정파일 전송   │  docker-compose.prod.yml, nginx.conf
│                      │
│ SSH 접속 후:         │
│  ① 현재 이미지 백업  │  :latest → :previous 태그
│  ② GHCR 로그인       │
│  ③ 새 이미지 pull    │
│  ④ docker compose up │  api + nginx만 재시작
│  ⑤ 헬스체크 60초    │  http://localhost:4000/health
│     (5초 간격 12회)  │
│                      │
│  성공 → 이미지 정리  │  태그없는 이미지 + 7일 이상 된 이미지 삭제
│  실패 → 자동 롤백    │  :previous → :latest 복구 후 재시작
└──────────────────────┘
```

---

## 인프라 구성 (NAS)

```
Synology NAS (diho-box.synology.me:4000)
├── nginx (포트 4000)          — 리버스 프록시, rate limit, gzip
├── api (포트 3000 내부)       — Fastify API 서버
├── postgres (포트 5432)       — PostgreSQL 16
└── redis (포트 6379)          — BullMQ 작업 큐
```

---

## GitHub Secrets 목록

| 시크릿 | 용도 |
|--------|------|
| `TAILSCALE_AUTH_KEY` | Tailscale VPN 연결 인증 |
| `NAS_TAILSCALE_IP` | NAS의 Tailscale 내부 IP |
| `NAS_SSH_USER` | NAS SSH 사용자명 |
| `NAS_SSH_KEY` | NAS SSH 개인키 |
| `NAS_SSH_PORT` | NAS SSH 포트 |
| `NAS_PROJECT_PATH` | NAS 배포 경로 (`/volume1/docker/runmate-ai`) |
| `GEMINI_API_KEY` | 테스트 환경 AI API 키 |
| `GITHUB_TOKEN` | GHCR 이미지 push/pull (자동 발급) |

---

## 롤백 방법

**자동 롤백**: 헬스체크 실패 시 이전 이미지로 자동 복구

**수동 롤백**: NAS SSH 접속 후
```bash
cd /volume1/docker/runmate-ai
docker tag ghcr.io/shinity/runmate-api:previous ghcr.io/shinity/runmate-api:latest
docker compose -f docker-compose.prod.yml up -d --no-deps api
```

---

## EAS 모바일 빌드 (별도)

GitHub Actions와 별개로 `eas build` 명령어로 수동 트리거.

```bash
cd apps/mobile
eas build --platform android --profile preview --no-wait
```

| 프로파일 | 출력 | 용도 |
|----------|------|------|
| `preview` | APK | 내부 테스터 배포 |
| `production` | AAB | Play Store 제출 |
