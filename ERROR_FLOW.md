# PLC 모니터링 시스템 - 상세 에러 처리 플로우

## 🚨 에러 처리 전략

이 시스템은 **다층 방어** 접근법을 사용합니다:
- **계층 1**: 전역 연결 상태 모니터링
- **계층 2**: 개별 차트 데이터 검증
- **계층 3**: API 레이어 에러 처리

---

## 📋 에러 유형별 처리 방식

### 1. 연결 실패 (Connection Failure)

#### 원인
- PLC가 꺼져있음
- IP/Port 잘못됨
- 네트워크 끊김
- 방화벽 차단

#### 발생 위치
```typescript
// src/lib/plc-connection-context.tsx
const checkConnection = async () => {
  try {
    const res = await fetch(url);
    // ❌ 여기서 네트워크 에러 발생
  } catch (error) {
    // 에러 캡처
    setFailureCount((prev) => prev + 1);
  }
};
```

#### 처리 흐름
```
네트워크 요청 실패
    ↓
에러 캡처 (catch 블록)
    ↓
실패 횟수 증가 (failureCount++)
    ↓
임계값 확인
├─ 초기 연결 (hasEverConnected=false)
│  └─ failureThreshold = 2
│     ├─ failureCount < 2: ⏳ 조용함
│     └─ failureCount >= 2: 🔴 오버레이 표시
│
└─ 연결 중단 (hasEverConnected=true)
   └─ failureThreshold = 0
      ├─ failureCount >= 0: 🔴 즉시 표시
      └─ (첫 실패부터 반응)
    ↓
connectionStatus 업데이트
├─ isConnected = false
├─ error = 에러 메시지
└─ lastChecked = 현재 시간

    ↓
MonitoringPage에 전달
    ↓
중앙 오버레이 렌더링
├─ 배경: 반투명 검은색
├─ 아이콘: 펄스 애니메이션
├─ 메시지: "설정 페이지에서 PLC IP 주소와 포트를 확인하세요"
├─ 상태: "재연결 시도 중..."
└─ 안내: 확인 사항 체크리스트
```

#### 코드 상세 분석

```typescript
// 실패 처리 로직
catch (error) {
  console.error("PLC Connection check failed:", error);

  // 에러 메시지 추출
  const errorMsg = error instanceof Error
    ? error.message
    : "PLC 연결 실패";

  // 실패 횟수 증가
  setFailureCount((prev) => prev + 1);

  // 임계값 계산
  const failureThreshold = hasEverConnected ? 0 : 2;

  // 임계값 도달 시만 오류 표시
  if (failureCount >= failureThreshold) {
    setConnectionStatus({
      isConnected: false,
      error: errorMsg,
      lastChecked: new Date(),
    });
  }
}
```

#### 타임라인 예제

```
시간    이벤트                         failureCount  displayError
────────────────────────────────────────────────────────────────
00:00  페이지 로드
       checkConnection() 호출

00:00  첫 번째 요청 실패              1            ❌ 표시 안함
       (임계값=2, 아직 < 2)                       (조용함)

00:02  두 번째 요청 실패              2            🔴 표시함!
       (임계값=2, 이제 >= 2)                      "PLC 연결 실패"
       hasEverConnected=true로 변경                오버레이 나타남
       failureThreshold=0으로 변경

00:04  세 번째 요청 실패              3            🔴 계속 표시
       (임계값=0, 여전히 >= 0)

00:06  사용자가 설정 수정
       IP/Port 변경

00:08  네 번째 요청 성공! ✅          0            🟢 사라짐!
       connectionStatus.isConnected=true          정상 모드 전환
       failureCount 초기화
       hasEverConnected 유지
```

---

### 2. HTTP 에러 (HTTP Error)

#### 원인
- 400 Bad Request: 잘못된 파라미터
- 403 Forbidden: 권한 부족
- 500 Internal Server Error: 서버 내부 오류
- 503 Service Unavailable: 서비스 이용 불가

#### 발생 위치
```typescript
// src/lib/plc-connection-context.tsx
const res = await fetch(url);

if (!res.ok) {  // ❌ 상태 코드 200-299가 아님
  const errorData = await res.json();
  throw new Error(errorData.error || `HTTP Error: ${res.status}`);
}
```

#### 처리 흐름
```
HTTP 응답 수신 (상태: 500)
    ↓
!res.ok 확인
    ↓
에러 데이터 파싱
├─ 응답 body에서 error 필드 추출
└─ 없으면 "HTTP Error: 500" 사용
    ↓
Error 객체 생성 및 throw
    ↓
catch 블록에서 캡처
    ↓
errorMsg = "Internal Server Error"
또는 "HTTP Error: 500"
    ↓
failureCount 증가
    ↓
임계값 판단
└─ 위의 "연결 실패"와 동일하게 처리
```

#### 예제 에러 메시지

```
상태 코드     에러 메시지
────────────────────────────────────────
400          "Bad Request: invalid address"
401          "Unauthorized"
403          "Forbidden: access denied"
500          "Internal Server Error"
503          "Service Unavailable"
504          "Gateway Timeout"
```

---

### 3. 데이터 유효성 검사 실패 (Data Validation Error)

#### 원인
- 응답이 JSON이 아님
- 응답이 예상 구조가 아님
- 주소 데이터가 숫자가 아님
- null 또는 undefined 응답

#### 발생 위치
```typescript
// src/components/Dashboard/RealtimeChart.tsx
const json = await res.json();

// ❌ 검증 실패
if (!json || typeof json[address] !== 'number') {
  throw new Error(`Invalid data received for address ${address}`);
}
```

#### 처리 흐름
```
데이터 파싱 완료
{ D400: "25.3" }  ❌ 숫자 아님, 문자열!
    ↓
유효성 검사
typeof json[address] !== 'number' → true
    ↓
Error 발생
"Invalid data received for address D400"
    ↓
catch 블록에서 캡처
    ↓
console.error("Failed to fetch data for D400, Error...")
    ↓
에러는 콘솔에만 로깅
(전역 연결 상태에는 영향 없음)
    ↓
차트 데이터 미업데이트
(이전 데이터 그대로 표시)
    ↓
다음 폴링 주기에 재시도
(2초 후 다시 요청)
```

#### 중요한 특징

```
이 에러는 "조용한" 에러입니다:
├─ ❌ 오버레이 표시 안함
├─ ❌ 전역 연결 상태 변경 안함
├─ ✅ 콘솔에 로깅
├─ ✅ 해당 차트만 영향
└─ ✅ 다른 차트는 정상 작동
```

#### 코드 예제

```typescript
// RealtimeChart 데이터 폴링
const fetchData = async () => {
  try {
    const json = await res.json();

    // 검증 1: json 존재
    if (!json) {
      throw new Error("Response is empty");
    }

    // 검증 2: 데이터 타입
    if (typeof json[address] !== 'number') {
      throw new Error(
        `Invalid data received for address ${address}`
      );
    }

    // ✅ 검증 통과
    const currentValue = json[address];

    // 이후 처리...

  } catch (error) {
    // 에러는 콘솔에만 로깅
    console.error("Failed to fetch data for", address, error);

    // 중요: 전역 상태를 변경하지 않음!
    // 이것은 RealtimeChart 내부 에러일 뿐
  }
};
```

---

### 4. 타임아웃 에러 (Timeout Error)

#### 원인
- API 응답 지연 (10초 이상)
- 네트워크 느림
- PLC가 매우 느린 응답

#### 발생 위치
```typescript
// src/app/api/plc/route.ts
const data = await Promise.race([
  plc.readAsync(options),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 10000)
  )
]);
// ❌ 10초 초과 시 Timeout 에러 발생
```

#### 처리 흐름
```
API 요청 시작
    ↓
[0초]  PLC 통신 시작
[5초]  데이터 수신 중...
[10초] 타임아웃 에러!
    ↓
Promise.race에서 Timeout 거부
    ↓
Error: "Timeout" 생성
    ↓
API 라우트에서 catch 처리
    ↓
HTTP 응답: 500 에러
{
  "error": "Timeout: Connection took too long"
}
    ↓
클라이언트에서 받음
    ↓
failureCount 증가
    ↓
임계값 판단
└─ 연결 실패와 동일하게 처리
```

---

### 5. 메모리/리소스 누수 방지

#### 방지 메커니즘

```typescript
// 1. useEffect 정리
useEffect(() => {
  const interval = setInterval(checkConnection, 2000);

  return () => {
    clearInterval(interval);  // ✅ 정리 필수!
  };
}, [settings, failureCount, hasEverConnected]);

// 2. 연결 풀 정리 (API에서)
const connections = new Map();

// 5분 미사용 연결 자동 삭제
setInterval(() => {
  for (const [key, conn] of connections.entries()) {
    if (now - conn.lastUsed > 5 * 60 * 1000) {
      conn.plc.disconnect();
      connections.delete(key);  // ✅ 메모리 해제
    }
  }
}, 60 * 1000);  // 1분마다 확인

// 3. 데이터 포인트 제한
const newData = [...prev, newPoint];
if (newData.length > 20) {
  newData.shift();  // ✅ 최대 20개만 유지
}
return newData;
```

---

## 📊 에러 처리 의사결정 트리

```
에러 발생?
├─ YES → 에러 타입 판단
│  │
│  ├─ 네트워크 에러?
│  │  ├─ YES → 전역 연결 상태 관리
│  │  │       (이중 임계값 적용)
│  │  │
│  │  └─ NO → 다음 확인
│  │
│  ├─ HTTP 에러 (4xx, 5xx)?
│  │  ├─ YES → 에러 메시지 추출
│  │  │       → 전역 연결 상태 관리
│  │  │
│  │  └─ NO → 다음 확인
│  │
│  ├─ 데이터 유효성 에러?
│  │  ├─ YES → 콘솔 로깅만
│  │  │       → 전역 상태 무변경
│  │  │       → 차트는 이전 데이터 유지
│  │  │
│  │  └─ NO → 다음 확인
│  │
│  ├─ 타임아웃 에러?
│  │  ├─ YES → HTTP 500 에러처럼 처리
│  │  │
│  │  └─ NO → 기타 에러
│  │
│  └─ 다른 에러?
│     └─ 콘솔 로깅 + failureCount 증가
│
└─ NO → 정상 작동
   └─ failureCount = 0
      isConnected = true
```

---

## 🎯 에러 우선순위

```
우선순위 1 (🔴 Critical)
├─ 연결 불가능
├─ 응답 불가능
└─ 사용자에게 즉시 알림 필수

우선순위 2 (🟡 Warning)
├─ 일부 데이터 수신 불가
├─ 응답 지연 (타임아웃 근처)
└─ 콘솔 로깅 + 다음 재시도

우선순위 3 (🟢 Info)
├─ 개별 차트 에러
├─ 검증 실패
└─ 해당 차트만 영향
```

---

## 💬 사용자 메시지

### 오버레이에 표시되는 메시지

```
[Primary Message]
"PLC 연결 실패"

[Secondary Message]
"설정 페이지에서 PLC IP 주소와 포트를 확인하세요"

[Status Indicator]
"● 재연결 시도 중..."

[Action Items]
1. 설정 → PLC 연결 설정에서 IP/Port 확인
2. PLC가 정상 작동 중인지 확인
3. 네트워크 연결 상태 확인
```

### 콘솔 메시지 (개발자용)

```
INFO:
  "Ready in 4.6s"
  "Local: http://localhost:3002"

ERROR (연결 실패):
  "PLC Connection check failed: Error: getaddrinfo ENOTFOUND 999.999.999.999"

ERROR (데이터 검증):
  "Failed to fetch data for D400, Error: Invalid data received for address D400"

ERROR (타임아웃):
  "PLC Connection check failed: Error: Timeout: Connection took too long"
```

---

## 🔄 복구 프로세스

### 자동 복구
```
오버레이 표시 중
    ↓
사용자가 설정 수정
    ↓
다음 연결 체크 (2초 후)
    ↓
연결 성공 ✅
    ↓
failureCount = 0
connectionStatus.isConnected = true
    ↓
🟢 오버레이 사라짐
정상 모드로 전환
```

### 수동 복구
```
PLC 전원 문제
    ↓
사용자가 PLC 재시작
    ↓
대기 (몇 초)
    ↓
다음 연결 체크에서 성공
    ↓
자동으로 복구됨
```

---

## 📈 모니터링 및 디버깅

### 브라우저 DevTools
```
F12 > Console 탭
├─ 에러 메시지 확인
├─ 네트워크 요청 추적
└─ 상태 변화 로깅

F12 > Network 탭
├─ API 요청 추적
├─ 응답 시간 확인
└─ 페이로드 검증

F12 > Application 탭
└─ Local Storage에서 설정값 확인
```

### 에러 로그 분석
```
시나리오: "PLC 연결 실패"

1단계: Console 확인
   "PLC Connection check failed: Error: ..."

2단계: Network 탭에서 API 호출 확인
   GET /api/plc?addresses=D400...
   Status: (network error) 또는 500

3단계: 설정값 확인
   IP가 맞는지?
   Port가 맞는지?

4단계: 비즈니스 로직 확인
   PLCConnectionProvider가 래핑했는지?
   useEffect 의존성이 맞는지?
```

---

## ✅ 테스트 체크리스트

```
□ 정상 연결
  └─ 유효한 IP/Port로 연결 확인

□ 연결 실패 (초기)
  └─ 잘못된 IP로 2초 후 오버레이 표시 확인

□ 연결 실패 (진행 중)
  └─ 연결 중 IP 변경 시 1회 실패로 즉시 오버레이 표시

□ 자동 복구
  └─ 올바른 IP로 변경 시 오버레이 사라짐

□ 데이터 검증
  └─ 콘솔에 에러 로그 출력, 차트는 이전 데이터 유지

□ 타임아웃
  └─ 느린 응답 시 10초 후 타임아웃 에러

□ 메모리 누수
  └─ 개발자 도구에서 메모리 증가 없음 확인
```

---

**마지막 업데이트**: 2025-11-22
**작성자**: Claude Code
