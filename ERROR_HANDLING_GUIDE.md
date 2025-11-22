# PLC 연결 실패 처리 및 에러 알림 가이드

## 개요

PLC 모니터링 시스템에서 연결 실패 시 사용자에게 명확한 에러 메시지와 시각적 피드백을 제공합니다.

---

## 개선 사항

### 1. RealtimeChart 컴포넌트 개선

**파일**: `src/components/Dashboard/RealtimeChart.tsx`

#### 추가된 기능:

1. **연결 상태 관리**
   ```typescript
   interface ConnectionStatus {
     isConnected: boolean;
     error?: string;
   }

   const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
     isConnected: false
   });
   ```

2. **재시도 로직**
   - 초기 실패는 무시하고 재시도
   - 3회 연속 실패 후 에러 표시
   - 재연결 시도 시 자동으로 상태 초기화

3. **데이터 검증**
   ```typescript
   // 필수 데이터 검증
   if (!json || typeof json[address] !== 'number') {
     throw new Error(`Invalid data received for address ${address}`);
   }
   ```

4. **안전한 기본값**
   ```typescript
   const currentValue = data.length > 0 ? data[data.length - 1].current : 0;
   const setValue = data.length > 0 ? data[data.length - 1].set : 0;
   ```
   - 데이터가 없어도 `0`으로 초기화되어 `.toFixed()` 에러 방지

---

### 2. 에러 알림 UI

#### 시각 디자인:

```
┌─────────────────────────────────────────┐
│  ✗ (에러 아이콘 - 펄스 애니메이션)      │
│                                          │
│  PLC 연결 실패                          │
│  설정 페이지에서 연결 정보를 확인하세요  │
│                                          │
│  ● (점 - 펄스) 재연결 시도 중...       │
└─────────────────────────────────────────┘
```

#### 특징:

- **배경**: 반투명 검은색 (배경이 약간 보임)
- **블러 효과**: `backdrop-blur-sm`로 배경 흐림 처리
- **에러 박스**: 빨간색 배경 + 빨간색 테두리
- **애니메이션**:
  - 에러 아이콘: `animate-pulse` (깜빡임)
  - 박스: `animate-bounce-slow` (위아래 움직임)
  - 재연결 점: `animate-pulse` (깜빡임)

---

### 3. 새로운 Tailwind 애니메이션

**파일**: `tailwind.config.ts`

```typescript
keyframes: {
  "pulse-border": {
    "0%, 100%": { borderColor: "rgb(239, 68, 68)" },
    "50%": { borderColor: "rgb(127, 29, 29)" },
  },
  "bounce-slow": {
    "0%, 100%": { transform: "translateY(0)" },
    "50%": { transform: "translateY(-8px)" },
  },
},
animation: {
  "pulse-border": "pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
  "bounce-slow": "bounce-slow 2s ease-in-out infinite",
},
```

---

## 에러 처리 흐름

```
PLC 데이터 요청
    ↓
[성공]
  ✓ connectionStatus.isConnected = true
  ✓ failureCount = 0
  ✓ 데이터 업데이트
    ↓
  [다음 폴링 주기]

[실패 1회]
  ! failureCount = 1
  ! 재시도 (자동)
    ↓

[실패 2회]
  ! failureCount = 2
  ! 재시도 (자동)
    ↓

[실패 3회]
  ✗ connectionStatus.isConnected = false
  ✗ connectionStatus.error = "에러 메시지"
  ✗ 화면에 에러 박스 표시
  ✗ 애니메이션 시작
    ↓

[재연결 성공]
  ✓ connectionStatus.isConnected = true
  ✓ failureCount = 0
  ✓ 에러 박스 사라짐
```

---

## 사용자 경험 (UX)

### 시나리오 1: 정상 작동
1. 페이지 로드
2. 차트에 데이터 표시
3. 2초마다 자동 업데이트

### 시나리오 2: PLC 연결 실패
1. 페이지 로드
2. 3회 재시도 후 에러 표시
3. 에러 박스:
   - "PLC 연결 실패" 메시지
   - 구체적인 에러 내용
   - "재연결 시도 중..." 상태
4. 사용자가 설정 페이지에서 IP/Port 수정
5. 재연결 자동 감지

### 시나리오 3: 일시적 네트워크 오류
1. 1~2회 실패
2. 자동 재시도로 복구
3. 사용자는 기다리기만 함

---

## 개발자 가이드

### 새로운 차트 추가 시

```typescript
<RealtimeChart
  address="D4000"
  setAddress="D4001"
  title="새로운 차트"
  unit="°C"
  pollingInterval={2000}
  plcIp={PLC_IP}
  plcPort={PLC_PORT}
/>
```

**자동으로 포함되는 기능:**
- ✅ PLC 연결 상태 관리
- ✅ 에러 알림 표시
- ✅ 재시도 로직
- ✅ 데이터 검증

### 커스터마이징

#### 에러 메시지 변경

```typescript
// src/components/Dashboard/RealtimeChart.tsx (200번 줄)
<p className="text-xs text-red-100 mb-2">
  {connectionStatus.error || '설정 페이지에서 연결 정보를 확인하세요'}
</p>
```

#### 재시도 횟수 변경

```typescript
// src/components/Dashboard/RealtimeChart.tsx (136번 줄)
if (failureCount >= 2) {  // 이 숫자 변경 (3회 기본값)
  setConnectionStatus({
    isConnected: false,
    error: errorMsg
  });
}
```

#### 에러 박스 스타일 변경

```typescript
// src/components/Dashboard/RealtimeChart.tsx (178번 줄)
<div className="bg-red-900/95 border-2 border-red-500 rounded-lg p-4 max-w-xs text-center animate-bounce-slow">
  {/* 여기의 클래스 이름 변경 */}
</div>
```

---

## 문제 해결

### Q: 에러 박스가 안 보여요
**A**:
- 설정에서 `plcIp`와 `plcPort`가 올바른지 확인
- 브라우저 콘솔에서 에러 메시지 확인
- `/api/plc` API가 정상 작동하는지 테스트

### Q: 에러 메시지가 이상해요
**A**:
- `failureCount >= 2` 조건을 더 크게 변경해서 재시도 횟수 증가
- 네트워크 느림: `pollingInterval`을 더 크게 설정

### Q: 애니메이션이 동작하지 않아요
**A**:
- Tailwind CSS 빌드 확인: `npm run build`
- 브라우저 캐시 삭제: Ctrl+Shift+Delete
- 다크모드 토글: 테마 변경 후 다시 확인

---

## 성능 고려사항

### 메모리 사용
- 각 차트마다 최대 20개 데이터 포인트 보관
- 유휴 PLC 연결은 5분 후 자동 정리

### CPU 사용
- 폴링 간격: 기본 2초 (설정 가능)
- 애니메이션: GPU 가속 (`transform` 사용)

### 네트워크
- 하나의 요청으로 여러 주소 읽기 가능
- 타임아웃: 10초

---

## 테스트

### 수동 테스트

```bash
# 1. 개발 서버 시작
npm run dev

# 2. 브라우저 열기
# http://localhost:3002/monitoring

# 3. 설정 변경
# - IP: 127.0.0.1 (작동함)
# - IP: 999.999.999.999 (에러 표시)

# 4. 콘솔 확인
# DevTools > Console에서 에러 메시지 확인
```

### 자동화 테스트

```typescript
// 예상: 에러 표시, 재시도 시도, 자동 복구
test('shows error alert on PLC connection failure', async () => {
  render(<RealtimeChart address="D400" />);
  await waitFor(() => {
    expect(screen.getByText(/PLC 연결 실패/)).toBeInTheDocument();
  });
});
```

---

## 관련 파일

| 파일 | 변경사항 |
|------|--------|
| `src/components/Dashboard/RealtimeChart.tsx` | 연결 상태 관리, 에러 UI 추가 |
| `tailwind.config.ts` | 애니메이션 추가 |
| `src/app/api/plc/route.ts` | 타임아웃, 연결 풀 개선 |

---

**마지막 업데이트**: 2025-11-22
**작성자**: Claude Code
