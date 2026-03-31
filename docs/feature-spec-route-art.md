# Feature Spec: Route Art 전면 도입 및 전략 전환

## 1. 전략 변경 요약

| 항목 | AS-IS | TO-BE |
|------|-------|-------|
| 4번째 탭 | match (러닝메이트 매칭) | gallery (Route Art 갤러리) |
| Route Art 위치 | 런 상세 모달 하단, 부차적 | 전용 탭 + 홈 하이라이트 + 런 상세 강화 |
| 매칭 기능 | 탭에서 직접 노출 | 프로필 > 설정에서 진입 (나중에 오픈 라벨) |
| 핵심 가치 | 러닝메이트 찾기 | 내 러닝 경로를 아트로 감상하고 공유하기 |

---

## 2. 탭 구조 변경안

### 변경 전
```
홈 | 런 기록 | 코치 | 매칭 | 프로필
```

### 변경 후
```
홈 | 런 기록 | 코치 | 갤러리 | 프로필
```

| 탭 | 파일 | 아이콘 | 설명 |
|----|------|--------|------|
| 홈 | `index.tsx` | `home-outline` | 그대로 유지 + Route Art 하이라이트 카드 추가 |
| 런 기록 | `run.tsx` | `timer-outline` | 그대로 유지 |
| 코치 | `coach.tsx` | `flash-outline` | 그대로 유지 |
| 갤러리 | `gallery.tsx` (신규) | `color-palette-outline` | Route Art 갤러리 (match.tsx 대체) |
| 프로필 | `profile.tsx` | `person-outline` | 그대로 유지 + 매칭 진입점 이동 |

### 파일 변경 계획
- `app/(tabs)/match.tsx` -- 삭제 (또는 비노출 처리)
- `app/(tabs)/gallery.tsx` -- 신규 생성
- `app/(tabs)/_layout.tsx` -- 탭 교체
- `app/route-art/[id].tsx` -- Route Art 상세 화면 (신규, 모달 또는 스택)

---

## 3. 화면별 기능 명세

### 3-A. Route Art 갤러리 탭 (gallery.tsx)

#### 목적
사용자가 자신의 모든 Route Art를 한눈에 감상하고, 개별 아트를 탭해서 상세 보기/공유할 수 있도록 한다.

#### 사용자 스토리
- As a 러너, I want to 내 모든 런의 Route Art를 갤러리 형태로 보고 싶다, so that 내 러닝 히스토리를 시각적으로 감상할 수 있다.
- As a 러너, I want to Route Art를 탭해서 크게 보고 공유하고 싶다, so that SNS에 자랑할 수 있다.
- As a 러너, I want to 아직 Route Art가 생성되지 않은 런도 구분하고 싶다, so that 생성 상태를 파악할 수 있다.

#### 기능 요구사항
- FR-1: Route Art가 있는 런 목록을 2열 그리드로 표시 (최신순)
- FR-2: 각 그리드 아이템에 SVG 이미지 썸네일 + 날짜 + 거리 오버레이
- FR-3: 아이템 탭 시 Route Art 상세 화면으로 이동
- FR-4: Route Art 미생성 런은 경로 아이콘 + "생성 중" 또는 "GPS 데이터 없음" 표시
- FR-5: 빈 상태: Route Art가 하나도 없을 때 안내 문구 + "런 시작하기" CTA
- FR-6: 커서 기반 무한 스크롤 (기존 GET /runs 활용, routeArtUrl 존재 여부로 필터)
- FR-7: Pull-to-refresh 지원

#### 비기능 요구사항
- 이미지 로딩: SVG는 SvgUri 또는 Image 컴포넌트로 렌더링, placeholder shimmer
- 스크롤 성능: FlatList 기반, 한 번에 10개 로드

#### 와이어프레임

```
+------------------------------------------+
|  나의 라우트 아트                    [필터] |
+------------------------------------------+
| +------------------+ +------------------+ |
| |  [SVG ART]       | |  [SVG ART]       | |
| |                  | |                  | |
| |   3.2km          | |   7.1km          | |
| |   3월 28일        | |   3월 25일        | |
| +------------------+ +------------------+ |
| +------------------+ +------------------+ |
| |  [SVG ART]       | |  [생성 중...]     | |
| |                  | |  shimmer          | |
| |   5.0km          | |   2.1km          | |
| |   3월 22일        | |   3월 21일        | |
| +------------------+ +------------------+ |
+------------------------------------------+
```

---

### 3-B. Route Art 상세 화면 (route-art/[id].tsx)

#### 목적
개별 Route Art를 풀스크린으로 감상하고, 공유/저장할 수 있도록 한다.

#### 사용자 스토리
- As a 러너, I want to Route Art를 풀스크린으로 보고 싶다, so that 디테일을 감상할 수 있다.
- As a 러너, I want to Route Art 이미지를 카메라롤에 저장하고 싶다, so that 나중에 다시 볼 수 있다.
- As a 러너, I want to Route Art를 SNS에 공유하고 싶다, so that 달린 경로를 자랑할 수 있다.
- As a 러너, I want to 해당 런의 기본 정보를 함께 보고 싶다, so that 어떤 런인지 맥락을 파악할 수 있다.

#### 기능 요구사항
- FR-1: Route Art SVG 풀스크린 표시 (pinch-to-zoom 가능)
- FR-2: 하단에 런 요약 정보 (거리, 시간, 페이스, 날짜)
- FR-3: "공유" 버튼 -- 기존 ShareRunButton 활용, Route Art 이미지 + 텍스트 공유
- FR-4: "저장" 버튼 -- 카메라롤에 이미지 저장 (expo-media-library)
- FR-5: "런 상세 보기" 링크 -- 기존 RunDetailModal로 이동
- FR-6: 스와이프로 이전/다음 Route Art 탐색 (선택, P2)

#### 비기능 요구사항
- SVG를 PNG로 변환하여 공유/저장 (react-native-view-shot 또는 서버사이드 변환)
- 이미지 저장 시 MediaLibrary 권한 요청

#### 와이어프레임

```
+------------------------------------------+
|  [<뒤로]         라우트 아트     [저장][공유] |
+------------------------------------------+
|                                          |
|                                          |
|            [  SVG ROUTE ART  ]           |
|            [  풀스크린 512x512 ]           |
|                                          |
|                                          |
+------------------------------------------+
|  3월 28일 아침 달리기                      |
|  7.1 km  |  35:00  |  4:55/km            |
|                                          |
|  [런 상세 보기 >]                         |
+------------------------------------------+
```

---

### 3-C. 홈 화면 Route Art 하이라이트 (index.tsx 수정)

#### 목적
홈에서 가장 최근 Route Art를 보여줘서 갤러리 탭으로의 유입을 유도한다.

#### 사용자 스토리
- As a 러너, I want to 홈에서 최근 Route Art를 미리보기로 보고 싶다, so that 앱을 열자마자 성취감을 느낄 수 있다.

#### 기능 요구사항
- FR-1: "최근 라우트 아트" 카드 -- 가장 최근 routeArtUrl이 있는 런의 SVG 표시
- FR-2: 카드 탭 시 Route Art 상세 화면으로 이동
- FR-3: Route Art가 하나도 없으면 카드 미표시 (홈 레이아웃 유지)
- FR-4: 배치 위치: 주간 통계 카드와 AI 인사이트 배너 사이

#### 와이어프레임 (홈 화면 내 삽입 위치)

```
[인사 + 회복 카드]
[주간 통계]
[최근 라우트 아트 카드]  <-- 신규
[AI 인사이트 배너]
[런 시작하기]
```

---

### 3-D. 런 상세 모달 Route Art 강화 (RunDetailModal.tsx 수정)

#### 현재 상태
- routeArtUrl이 있을 때 하단에 200px 이미지로 표시
- 공유 버튼은 있지만 routeArtUrl을 텍스트 URL로만 포함

#### 변경 사항
- FR-1: Route Art 섹션을 지도 바로 아래로 이동 (더 눈에 띄는 위치)
- FR-2: Route Art 이미지 크기 확대 (200px -> 300px)
- FR-3: Route Art 이미지 탭 시 Route Art 상세 화면으로 이동
- FR-4: 생성 중 상태 표시 (routeArtUrl이 null이고 datapoints가 2개 이상이면 "아트 생성 중" 로딩 UI)
- FR-5: 생성 실패 상태 -- "다시 생성" 버튼 (P2, API 필요)

---

### 3-E. Route Art 생성 상태 UX

#### 상태 흐름

```
런 저장 완료
    |
    v
[생성 중] -- routeArtUrl === null && datapoints >= 2
    |
    +-- 성공 --> routeArtUrl에 URL 세팅
    |
    +-- 실패 --> routeArtUrl === null (변화 없음)
    |
    +-- 스킵 --> datapoints < 2 (GPS 데이터 부족)
```

#### 상태별 UI

| 상태 | 갤러리 | 런 상세 | 홈 |
|------|--------|---------|-----|
| 생성 완료 | SVG 썸네일 | SVG 이미지 | 최근 아트 카드 |
| 생성 중 | shimmer + "생성 중" 텍스트 | shimmer + "라우트 아트를 만들고 있어요" | 미표시 |
| GPS 데이터 없음 | 회색 placeholder + "GPS 없음" | 미표시 | 미표시 |
| 생성 실패 | 회색 placeholder + "생성 실패" | "다시 시도" 버튼 (P2) | 미표시 |

#### 폴링 전략
- 런 저장 직후 런 상세 모달에서 routeArtUrl을 5초 간격으로 폴링 (최대 6회 = 30초)
- TanStack Query의 `refetchInterval` 활용
- routeArtUrl이 채워지면 폴링 중단

---

### 3-F. 매칭 기능 이동

#### 현재: match 탭 직접 노출
#### 변경: 프로필 > 설정에서 진입

- 프로필 화면의 "매칭 설정" 행을 "러닝메이트 찾기 (준비 중)" 으로 변경
- 탭하면 기존 매칭 화면 내용을 모달 또는 스택 화면으로 표시
- 매칭 기능 정식 오픈 전까지는 "준비 중" 라벨 유지
- 정식 오픈 시 다시 탭으로 복귀하거나 갤러리 탭 옆에 추가 검토

---

## 4. API 변경 사항

### 필요한 새 엔드포인트: 없음

기존 엔드포인트로 충분합니다:
- `GET /runs` -- 런 목록에 `routeArtUrl` 포함됨
- `GET /runs/:id` -- 런 상세에 `routeArtUrl` 포함됨

### 고려사항 (P2)
- `GET /runs?hasRouteArt=true` -- Route Art가 있는 런만 필터링하는 쿼리 파라미터 추가
- `POST /runs/:id/regenerate-art` -- Route Art 재생성 트리거 엔드포인트

---

## 5. 우선순위 정리

### P0 (이번 스프린트)
- [ ] gallery.tsx 탭 화면 구현 (2열 그리드, 빈 상태)
- [ ] _layout.tsx 탭 교체 (match -> gallery)
- [ ] Route Art 상세 화면 (route-art/[id].tsx)
- [ ] 홈 화면 최근 Route Art 카드
- [ ] 생성 중 상태 UX (shimmer + 폴링)

### P1 (다음 스프린트)
- [ ] 런 상세 모달 Route Art 섹션 강화
- [ ] 카메라롤 저장 기능 (expo-media-library)
- [ ] SVG -> PNG 변환 공유
- [ ] 매칭 기능 프로필 하위로 이동

### P2 (로드맵)
- [ ] Route Art 스와이프 탐색
- [ ] `GET /runs?hasRouteArt=true` 필터 API
- [ ] Route Art 재생성 (`POST /runs/:id/regenerate-art`)
- [ ] Route Art 스타일 선택 (색상 테마, 배경 변경)
- [ ] Route Art AI 이미지 생성 (Hugging Face FLUX.1-schnell 연동)
