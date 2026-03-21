---
name: new-screen
description: 새 Expo 탭 화면을 스캐폴딩합니다
argument-hint: <screen-name>
---

`apps/mobile/app/(tabs)/$ARGUMENTS.tsx` 파일을 아래 패턴으로 생성하고, `apps/mobile/app/(tabs)/_layout.tsx`에 탭을 추가하세요.

## 화면 파일 구조

```tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export default function $ARGUMENTSScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['$ARGUMENTS'],
    queryFn: async () => {
      const { data } = await api.get('/TODO')
      return data
    },
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>$ARGUMENTS</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20 },
  heading: { fontSize: 26, fontWeight: '800', color: '#f8fafc' },
})
```

## _layout.tsx에 탭 추가

```tsx
<Tabs.Screen
  name="$ARGUMENTS"
  options={{
    title: '탭 이름',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="ICON-NAME-outline" size={size} color={color} />
    ),
  }}
/>
```

## 디자인 컨벤션
- 배경: `#0f172a` (최상위), `#1e293b` (카드)
- 텍스트: `#f8fafc` (주요), `#94a3b8` (보조), `#64748b` (비활성)
- 강조색: `#3b82f6` (blue-500)
- 카드: `borderRadius: 16`, `padding: 16`
