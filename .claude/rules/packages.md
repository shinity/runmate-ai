---
paths:
  - "packages/**"
---

# Workspace 패키지 규칙

## 빌드 순서
`packages/types` → `packages/validators` → `services/api` / `apps/mobile`

## 패키지 역할
- `packages/types`: 공유 TypeScript 타입 정의
- `packages/validators`: Zod 스키마 (API 입력 검증에 사용)

## 주의사항
- 패키지 변경 후 `npx tsc` 빌드 필수 (소비자가 dist/ 를 참조)
- 루트에서 `npm run build` 시 Turborepo가 순서 보장
- `apps/mobile`은 `metro.config.js`의 `extraNodeModules`로 TypeScript 소스 직접 참조 (빌드 없이 개발 가능)
