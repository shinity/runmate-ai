import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/routes/**', 'src/lib/**'],
      exclude: ['src/lib/prisma.ts', 'src/lib/queue.ts', 'src/lib/redis.ts'],
    },
  },
})
