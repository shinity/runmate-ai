---
name: db
description: Prisma DB 작업을 실행합니다 (push/migrate/studio/reset)
argument-hint: push | migrate | studio | reset
---

`$ARGUMENTS` 작업을 실행하세요.

## 명령어

```bash
# push - 마이그레이션 파일 없이 스키마를 DB에 바로 반영 (개발 중 권장)
cd services/api && DATABASE_URL="postgresql://devshin@localhost:5432/runmate" npx prisma db push

# migrate - 마이그레이션 파일 생성 + 적용 (프로덕션 전 권장)
cd services/api && npx prisma migrate dev --name <설명>

# studio - DB GUI 실행 (포트 5555)
cd services/api && npx prisma studio

# reset - DB 초기화 후 재생성 (개발 데이터 전체 삭제)
cd services/api && npx prisma db push --force-reset
```

## 스키마 변경 후 체크리스트
- [ ] `npx prisma generate` — Prisma Client 재생성
- [ ] `packages/types/src/` — 필요 시 TypeScript 타입 업데이트
- [ ] `packages/validators/src/index.ts` — 필요 시 Zod 스키마 업데이트
- [ ] `npm run build --workspace=packages/types && npm run build --workspace=packages/validators` — 패키지 재빌드

## 주의사항
- `RunningGoal` enum은 `five_k @map("5k")`, `ten_k @map("10k")` 매핑 유지
- Prisma Client를 직접 타입으로 쓸 때 enum 값이 `five_k`임을 주의 (JS 값은 `"5k"`)
