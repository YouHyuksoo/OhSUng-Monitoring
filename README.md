# 🏭 PLC 모니터링 시스템

> **실시간 PLC 데이터 모니터링 대시보드**
> Next.js + React를 활용한 산업용 모니터링 솔루션

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 🎯 주요 기능

### 📊 실시간 모니터링
- **8개 온도 센서**: 수절/열풍 건조로 온도 실시간 추적
- **전력 사용 현황**: 시간별 누적 전력량 시각화
- **라이브 차트**: 2초 주기로 자동 업데이트
- **알람 시각화**: 임계값 초과 시 빨간색 테두리 + 애니메이션

### 🛡️ 안정적인 연결 관리
- **중앙 집중식 모니터링**: 모든 차트가 하나의 연결 상태 공유
- **이중 임계값**: 초기 연결은 관대하게, 연결 중단은 즉각적으로 대응
- **자동 복구**: 설정 변경 시 자동으로 재연결 시도

### ⚙️ 유연한 설정
- **IP/Port 커스터마이징**: 어떤 PLC와도 연결 가능
- **임계값 조정**: 온도 범위 커스터마이징
- **차트 설정 관리**: 주소 매핑 및 이름 변경
- **설정 영속성**: LocalStorage에 자동 저장

### 🎨 사용자 경험
- **다크/라이트 모드**: 설정에 따라 자동 전환
- **직관적 UI**: 한눈에 알 수 있는 대시보드
- **반응형 디자인**: 데스크톱/태블릿 모두 지원
- **명확한 에러 메시지**: 무엇이 잘못됐는지 즉시 파악

---

## 📋 목차

- [시스템 요구사항](#-시스템-요구사항)
- [설치 및 실행](#-설치-및-실행)
- [기본 사용법](#-기본-사용법)
- [구조](#-시스템-구조)
- [에러 처리](#-에러-처리)
- [문제 해결](#-문제-해결)
- [개발](#-개발)
- [배포](#-배포)

---

## ✅ 시스템 요구사항

### 필수 요구사항
- **Node.js**: v18 이상
- **npm**: v8 이상 (또는 yarn, pnpm)
- **PLC**: Mitsubishi FX 시리즈 또는 호환 장비
- **네트워크**: PLC와 안정적인 연결

### 권장 사항
- **CPU**: 2코어 이상
- **메모리**: 2GB 이상
- **브라우저**: Chrome, Firefox, Safari 최신 버전

---

## 🚀 설치 및 실행

### 1단계: 저장소 클론
```bash
git clone https://github.com/YouHyuksoo/OhSUng-Monitoring.git
cd OhSUng-Monitoring
```

### 2단계: 의존성 설치
```bash
npm install
```

### 3단계: 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:3002 로 접속하면 완료! 🎉

### 프로덕션 빌드
```bash
npm run build
npm run start
```

---

## 📖 기본 사용법

### 1️⃣ 모니터링 페이지 접속

**URL**: http://localhost:3002/monitoring

화면 구성:
- **상단 좌측**: 실시간 순방향 유효전력량 (라이브 차트)
- **상단 우측**: 전력 사용 현황 (시간별 바 그래프)
- **하단**: 온도 현황 (8개 차트)

### 2️⃣ 설정 확인/변경

**URL**: http://localhost:3002/settings

설정 항목:
- **PLC IP 주소**: 기본값 127.0.0.1
- **포트**: 기본값 502 (Modbus)
- **폴링 간격**: 기본값 2000ms
- **온도 임계값**: 수절/열풍별로 설정
- **차트 주소**: 각 센서의 메모리 주소 입력

### 3️⃣ 오류 상황 대처

**"PLC 연결 실패" 오버레이가 표시될 때:**

1. 설정 페이지 방문
2. IP 주소 확인
3. PLC가 켜져있는지 확인
4. 네트워크 연결 상태 확인
5. 설정 저장 후 자동 복구 대기

---

## 🏗️ 시스템 구조

```
PLC 모니터링 시스템
├─ Frontend (React + Next.js)
│  ├─ 페이지
│  │  ├─ /monitoring (대시보드)
│  │  ├─ /settings (설정)
│  │  └─ / (홈)
│  │
│  └─ 상태 관리 (Context API)
│     ├─ SettingsContext (설정값)
│     └─ PLCConnectionContext (연결 상태) ⭐
│
├─ Backend (Next.js API)
│  └─ /api/plc (PLC 데이터 읽기)
│     ├─ 연결 풀 관리
│     ├─ MC 프로토콜 처리
│     └─ 타임아웃 관리
│
└─ 외부 시스템
   └─ PLC 장비 (Mitsubishi FX)
```

**핵심 아키텍처**: 모든 차트가 **하나의 연결 상태**를 공유하여 효율성 향상

---

## 🚨 에러 처리

### 에러 유형별 대응

| 에러 | 증상 | 대응 |
|------|------|------|
| **연결 실패** | 빨간 오버레이 표시 | IP/Port 확인 후 설정 저장 |
| **잘못된 데이터** | 콘솔 에러, 차트 미업데이트 | 주소 확인 후 재시도 |
| **타임아웃** | 10초 후 오버레이 표시 | PLC 응답 대기 또는 IP 재확인 |
| **네트워크 끊김** | 즉시 오버레이 표시 | 네트워크 복구 후 자동 재연결 |

### 이중 임계값 정책

```
초기 연결 (관대함):
  ❌ ❌ 🔴 (3회 실패 후 표시)
  └─ 일시적 네트워크 오류 무시

연결 중단 (엄격함):
  ❌ 🔴 (1회 실패로 즉시 표시)
  └─ 빠른 대응 보장
```

---

## 🔧 문제 해결

### Q1: "PLC 연결 실패"가 계속 표시됨

**원인**: 잘못된 IP 주소 또는 PLC가 꺼져있음

**해결**:
1. 설정 페이지 접속
2. IP 주소 확인 (ping으로 테스트 권장)
3. PLC 전원 및 네트워크 확인
4. 설정 저장

```bash
# Linux/Mac에서 연결 테스트
ping 192.168.1.100

# Windows
ping 192.168.1.100
```

### Q2: 차트에 데이터가 안 보임

**원인**: PLC 주소가 잘못되었거나 센서가 없음

**해결**:
1. 설정 페이지 → 차트 주소 매핑 확인
2. PLC에 해당 주소가 존재하는지 확인
3. 콘솔(F12 > Console)에서 에러 메시지 확인

### Q3: 느린 응답 속도

**원인**: 네트워크 지연 또는 PLC 과부하

**해결**:
1. 폴링 간격 증가 (설정 → 2000ms 이상)
2. PLC의 다른 작업 확인
3. 네트워크 대역폭 확인

### Q4: 알람이 자꾸 깜빡임

**원인**: 온도가 임계값 근처에서 변동

**해결**:
1. 임계값 조정 (설정 → 더 넓은 범위)
2. PLC 센서 확인
3. 센서가 정상 범위인지 확인

---

## 💻 개발

### 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   └── plc/
│   │       └── route.ts (PLC API)
│   ├── monitoring/
│   │   └── page.tsx (대시보드)
│   ├── settings/
│   │   └── page.tsx (설정)
│   └── layout.tsx (루트 레이아웃)
│
├── components/
│   ├── Dashboard/
│   │   ├── RealtimeChart.tsx (개별 차트)
│   │   └── PowerUsageChart.tsx (전력 차트)
│   └── Layout/
│       └── Header.tsx (네비게이션)
│
└── lib/
    ├── plc-connection-context.tsx (연결 상태) ⭐
    ├── settings-context.tsx (설정)
    └── mcprotocol.d.ts (타입 정의)
```

### 커스터마이징

#### 새로운 차트 추가

```typescript
// src/app/monitoring/page.tsx
<RealtimeChart
  address="D440"           // 센서 주소
  setAddress="D441"        // 설정값 주소 (선택)
  title="새로운 센서"
  unit="°C"
  color="#8b5cf6"
  minThreshold={20}
  maxThreshold={60}
  pollingInterval={2000}
  plcIp={PLC_IP}
  plcPort={PLC_PORT}
/>
```

#### 폴링 간격 변경

```typescript
// src/app/settings/page.tsx
const POLLING_INTERVAL = 5000; // 5초로 변경
```

#### 임계값 조정

```typescript
// 설정 페이지에서 직접 변경 가능
SUJUL_TEMP_MIN = 25;
SUJUL_TEMP_MAX = 55;
```

### 테스트 실행

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 타입 체크
npm run type-check

# 린트
npm run lint
```

---

## 📦 배포

### Vercel 배포 (권장)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

### Docker 배포

```bash
# Dockerfile이 있는 경우
docker build -t plc-monitor .
docker run -p 3002:3002 plc-monitor
```

### 자체 서버 배포

```bash
# 빌드
npm run build

# 실행
npm run start
```

### 환경 변수 설정

`.env.local` 파일 생성:
```
NEXT_PUBLIC_API_URL=http://localhost:3002
```

---

## 📚 문서

상세 문서는 프로젝트 루트에서 확인하세요:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 시스템 아키텍처 (상세)
- **[PROCESS_FLOW.md](./PROCESS_FLOW.md)** - 프로세스 흐름도
- **[ERROR_FLOW.md](./ERROR_FLOW.md)** - 에러 처리 상세 분석
- **[ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md)** - 에러 처리 가이드
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - 빠른 참조
- **[CLAUDE.md](./CLAUDE.md)** - AI 맥락 정보

---

## 🎓 학습 순서

1. **이 README.md 읽기** (5분)
2. **QUICK_REFERENCE.md 읽기** (10분)
3. **ARCHITECTURE.md 읽기** (20분)
4. **PROCESS_FLOW.md 읽기** (30분)
5. **ERROR_FLOW.md 읽기** (20분)
6. **코드 직접 읽기** (1시간)

---

## 🐛 버그 보고

이슈 발생 시 다음 정보와 함께 보고해주세요:

1. **증상**: 무엇이 작동하지 않는가?
2. **재현 방법**: 어떻게 하면 반복되는가?
3. **환경**: Node 버전, OS, 브라우저
4. **스크린샷**: 해당하면 첨부
5. **콘솔 에러**: F12 > Console의 에러 메시지

```bash
# 버그 리포트 템플릿
Title: [BUG] 간단한 제목
Description:
- 증상: ...
- 재현: ...
- 환경: Node.js v18, Windows 11, Chrome 120
- 스크린샷: [첨부]
- 콘솔 에러: [에러 메시지]
```

---

## 📝 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

## 🤝 기여

기여는 언제나 환영합니다! 다음 방법으로 참여하세요:

1. Fork 하기
2. Feature 브랜치 만들기 (`git checkout -b feature/AmazingFeature`)
3. Commit 하기 (`git commit -m 'Add some AmazingFeature'`)
4. Push 하기 (`git push origin feature/AmazingFeature`)
5. Pull Request 열기

---

## 📞 지원

문제가 있거나 질문이 있으신가요?

- **GitHub Issues**: [이슈 등록](https://github.com/YouHyuksoo/OhSUng-Monitoring/issues)
- **Discussion**: [토론 시작](https://github.com/YouHyuksoo/OhSUng-Monitoring/discussions)
- **문서**: 프로젝트 루트의 마크다운 파일들 참조

---

## 🙏 감사의 말

- **Recharts**: 차트 라이브러리
- **Next.js**: 풀스택 프레임워크
- **Tailwind CSS**: 스타일링
- **mcprotocol**: PLC 통신

---

## 📅 업데이트 로그

### v1.0.0 (2025-11-22) ✨
- ✅ 초기 릴리스
- ✅ 실시간 모니터링 기능
- ✅ 중앙 에러 오버레이
- ✅ 설정 페이지
- ✅ 이중 임계값 연결 관리
- ✅ 자동 복구 기능

---

## 🎯 향후 개선 사항

- [ ] 데이터 로깅 및 히스토리 저장
- [ ] 알람 기록 및 분석
- [ ] 멀티 PLC 지원
- [ ] WebSocket 실시간 통신
- [ ] 모바일 앱
- [ ] 클라우드 동기화
- [ ] 사용자 인증
- [ ] 고급 분석 및 리포팅

---

<div align="center">

**⭐ 이 프로젝트가 도움이 됐다면 Star를 눌러주세요!**

Made with ❤️ by Claude Code

</div>
