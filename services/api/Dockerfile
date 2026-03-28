FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
# 모노레포 워크스페이스 패키지 복사
COPY package.json package-lock.json* ./
COPY packages/types/package.json ./packages/types/package.json
COPY packages/validators/package.json ./packages/validators/package.json
COPY services/api/package.json ./services/api/package.json
RUN npm install --legacy-peer-deps --ignore-scripts

FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY packages/types ./packages/types
COPY packages/validators ./packages/validators
COPY services/api ./services/api
WORKDIR /app/services/api
RUN npx prisma generate
EXPOSE 3000 9229
CMD ["node", "--inspect=0.0.0.0:9229", "--require", "tsx/cjs", "--watch", "src/index.ts"]

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY packages/types ./packages/types
COPY packages/validators ./packages/validators
COPY services/api ./services/api
# 워크스페이스 패키지 먼저 빌드
RUN cd /app/packages/types && npm run build 2>/dev/null || npx tsc
RUN cd /app/packages/validators && npm run build 2>/dev/null || npx tsc
WORKDIR /app/services/api
RUN npx prisma generate && npm run build

FROM base AS production
ENV NODE_ENV=production
WORKDIR /app/services/api
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/prisma ./prisma
COPY --from=builder /app/node_modules /app/node_modules
# workspace 패키지 빌드 결과물 복사 (symlink 대상)
COPY --from=builder /app/packages/types/dist /app/packages/types/dist
COPY --from=builder /app/packages/types/package.json /app/packages/types/package.json
COPY --from=builder /app/packages/validators/dist /app/packages/validators/dist
COPY --from=builder /app/packages/validators/package.json /app/packages/validators/package.json
EXPOSE 3000
# DB 마이그레이션 후 서버 시작
CMD ["sh", "-c", "npx prisma db push --schema ./prisma/schema.prisma --accept-data-loss && node dist/index.js"]
