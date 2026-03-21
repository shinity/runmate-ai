#!/bin/bash
# PostToolUse(Edit) hook: schema.prisma 수정 시 Prisma Client 자동 재생성

INPUT=$(cat)

if echo "$INPUT" | grep -q "schema.prisma"; then
  cd "$(git rev-parse --show-toplevel)/services/api" 2>/dev/null || exit 0
  echo "[Hook] schema.prisma 변경 감지 → prisma generate 실행 중..."
  npx prisma generate 2>&1
fi
