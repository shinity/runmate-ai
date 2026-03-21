---
name: type-check
description: 전체 워크스페이스 타입 체크를 순서대로 실행합니다
---

아래 순서로 타입 체크를 실행하세요. 각 단계가 성공해야 다음으로 넘어갑니다.

## 실행 순서

```bash
# 1. 공유 패키지 빌드 (API/모바일이 참조하므로 먼저)
npm run build --workspace=packages/types
npm run build --workspace=packages/validators

# 2. API 타입 체크
cd services/api && npx tsc --noEmit

# 3. 결과 요약
echo "타입 체크 완료"
```

## 오류가 있으면
- `@runmate/types` 또는 `@runmate/validators` 관련 오류 → 먼저 패키지를 빌드했는지 확인
- Prisma 관련 오류 → `npx prisma generate` 실행 후 재시도
- BullMQ Queue 오류 → `Queue<DataType, void, string>` 형태로 세 번째 제네릭을 `string`으로 명시
