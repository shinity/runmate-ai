---
name: new-route
description: 새 Fastify API 라우트를 스캐폴딩합니다
argument-hint: <route-name>
---

`services/api/src/routes/$ARGUMENTS.ts` 파일을 아래 패턴으로 생성하고, `services/api/src/index.ts`에 등록하세요.

## 라우트 파일 구조

```typescript
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function $ARGUMENTSRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] }

  // GET /$ARGUMENTS
  app.get('/', { ...authenticate }, async (request, reply) => {
    const userId = (request.user as any).sub
    // TODO: 구현
    return reply.send({ data: [] })
  })
}
```

## index.ts 등록

```typescript
await app.register($ARGUMENTSRoutes, { prefix: '/api/v1/$ARGUMENTS' })
```

## 체크리스트
- [ ] `@runmate/validators`에 필요한 Zod 스키마 추가
- [ ] `@runmate/types`에 필요한 TypeScript 타입 추가
- [ ] Prisma 스키마에 모델 추가 필요 여부 확인
- [ ] `npx tsc --noEmit`으로 타입 오류 없는지 확인
