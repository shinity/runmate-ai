---
paths:
  - "services/api/prisma/**"
---

# DB 스키마 규칙 (Prisma)

## 핵심 제약사항

- `RunningGoal` enum은 `@map("5k")`, `@map("10k")` 형태로 DB 값 매핑됨
  - 코드에서 enum 값 사용 시 `"5k"`, `"10k"` 문자열 (not `"five_k"`, `"ten_k"`)
  - 스키마 변경 후 반드시 `npx prisma generate` 실행
- `PersonalRecord` 모델의 페이스 필드명: `paceSecPerKm` (not `avgPaceSecPerKm`)

## 명령어
```bash
npx prisma db push      # 스키마 → DB 반영 (마이그레이션 없이)
npx prisma generate     # Prisma Client 재생성
npx prisma migrate dev  # 마이그레이션 생성 + 적용
npx prisma studio       # GUI 브라우저
```

## DB 연결
```
postgresql://runmate:runmate_dev@localhost:5432/runmate
```
