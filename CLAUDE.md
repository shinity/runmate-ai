# CLAUDE.md

RunMate AI — AI 코칭 기반 러닝 앱. Turborepo 모노레포.

## 개발 워크플로우

**구현 → 테스트 → 문서화** 순서 준수.
- 엔드포인트/모델 변경 → `docs/api-reference.md`, `docs/data-domain.md`, `docs/erd.md` 업데이트
- 플로우 변경 → `docs/user-flow.md` 업데이트

## 핵심 명령어

```bash
# 의존성 설치 (항상 --legacy-peer-deps 필수)
npm install --legacy-peer-deps

# 전체 빌드
npm run build

# 인프라
docker compose up -d    # PostgreSQL(5432) + Redis(6379)
```

## 모노레포 구조

```
packages/types       — 공유 타입
packages/validators  — Zod 스키마
services/api         — Fastify API (포트 3000)
apps/mobile          — Expo 앱
```

## 환경변수
- API: 루트 `.env`
- 모바일: `apps/mobile/.env.local`

> 역할별 세부 규칙은 `.claude/rules/` 참조 (파일 열면 자동 로드)
