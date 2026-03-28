---
paths:
  - "**/__tests__/**"
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
---

# 테스트 규칙

## API 테스트 (Vitest)
- 앱 팩토리: `services/api/src/test/app.ts`
- `coaching.test.ts`: `vi.mock('../workers/planGeneration')`을 파일 최상단에 직접 선언

## 모바일 테스트 (Jest)
- mock 위치: `src/__mocks__/` 또는 각 테스트 파일 내
- 필수 mock: `expo-location`, `expo-secure-store`, `fetch`
- TanStack Query 훅 테스트: `QueryClientProvider` wrapper + `renderHook` + `waitFor`

```typescript
// TanStack Query 훅 테스트 패턴
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)
const { result } = renderHook(() => useXxx(), { wrapper })
await waitFor(() => expect(result.current.isSuccess).toBe(true))
```

## 공통 원칙
- 구현 → **테스트** → 문서화 순서 준수 (테스트 없이 완료로 판단 금지)
- DB mock 사용 금지 — 실제 DB 또는 완전한 통합 환경 사용
