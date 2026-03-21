---
name: test-api
description: 로컬 API 서버의 주요 엔드포인트를 curl로 빠르게 테스트합니다
---

로컬 API 서버(`http://localhost:3000`)가 실행 중인지 확인 후, 아래 순서로 테스트하세요.

## 1. 서버 상태 확인

```bash
curl -s http://localhost:3000/health | python3 -m json.tool
```

## 2. 회원가입 + 토큰 획득

```bash
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.io","password":"password123","displayName":"Dev Runner"}')

echo $RESPONSE | python3 -m json.tool
TOKEN=$(echo $RESPONSE | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['tokens']['accessToken'])")
echo "TOKEN=$TOKEN"
```

## 3. 런 생성

```bash
curl -s -X POST http://localhost:3000/api/v1/runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "startedAt":"2026-03-21T06:00:00Z",
    "endedAt":"2026-03-21T06:30:00Z",
    "durationSeconds":1800,
    "distanceMeters":5000,
    "elevationGainMeters":30,
    "elevationLossMeters":30,
    "avgPaceSecPerKm":360,
    "dataSource":"manual",
    "effortScore":6
  }' | python3 -m json.tool
```

## 4. 주간 통계 + 회복 상태

```bash
curl -s http://localhost:3000/api/v1/runs/stats/weekly \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

curl -s http://localhost:3000/api/v1/coaching/recovery \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

전체 API 문서: http://localhost:3000/docs
