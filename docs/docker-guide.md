# Docker 개발 환경 가이드

## 구성 개요

`infrastructure/docker/docker-compose.yml` 기준으로 4개 서비스가 구성된다.

| 서비스 | 이미지 | 포트 | 역할 |
|--------|--------|------|------|
| postgres | timescale/timescaledb:latest-pg16 | 5432 | 메인 DB |
| redis | redis:7-alpine | 6379 | 큐(BullMQ) / 캐시 |
| api | Node 22 (dev 스테이지) | 3000, 9229 | Fastify API 서버 |
| ai-pipeline | Python 3.12 | 8000 | AI 파이프라인 (Phase 2) |

> `api`는 `dev` 스테이지로 빌드되어 파일 변경 시 자동 재시작되며, 9229 포트로 디버거가 활성화된다.

## 시작

```bash
# infrastructure/docker/ 에서 실행
docker compose up -d

# DB/Redis만 띄울 경우 (로컬에서 API 직접 실행 시)
docker compose up -d postgres redis
```

## 로그 확인

```bash
# api 로그 실시간 스트리밍
docker compose logs -f api

# 마지막 100줄부터
docker compose logs -f --tail=100 api

# 전체 서비스 로그
docker compose logs -f

# 타임스탬프 포함
docker compose logs -t api
```

## 컨테이너 접속 및 명령 실행

```bash
# api 컨테이너 셸 접속
docker compose exec api sh

# Prisma 마이그레이션 실행
docker compose exec api npx prisma db push

# 특정 명령 직접 실행
docker compose exec api npx prisma studio
```

## 상태 확인

```bash
# 서비스 목록 및 상태
docker compose ps

# CPU / 메모리 사용량
docker stats
```

## 디버깅

`api` 컨테이너는 `--inspect=0.0.0.0:9229` 옵션으로 실행된다.

**VS Code** — `.vscode/launch.json`에 아래 설정 추가 후 F5:

```json
{
  "type": "node",
  "request": "attach",
  "name": "Docker API",
  "address": "localhost",
  "port": 9229,
  "localRoot": "${workspaceFolder}/services/api/src",
  "remoteRoot": "/app/services/api/src"
}
```

**Chrome DevTools** — `chrome://inspect` → Remote Target에서 `localhost:9229` 확인

## Dockerfile 스테이지

`services/api/Dockerfile`은 4개 스테이지로 구성된다.

| 스테이지 | 용도 |
|----------|------|
| `base` | node:22-alpine 기반 이미지 |
| `deps` | `npm install --legacy-peer-deps` (모노레포 워크스페이스 패키지 포함) |
| `dev` | 파일 watch + 디버거 활성화 (docker-compose 기본 타겟) |
| `builder` | `tsc` 빌드 |
| `production` | 빌드 결과물만 포함한 경량 이미지 |

## 주의사항

- `npm install` 시 반드시 `--legacy-peer-deps` 사용 (peer dep 충돌)
- build context는 모노레포 루트 (`../..`) — `@runmate/types`, `@runmate/validators` 워크스페이스 패키지를 포함하기 위함
- `.env` 파일이 루트에 있어야 `api`, `ai-pipeline` 서비스가 환경변수를 읽을 수 있음
