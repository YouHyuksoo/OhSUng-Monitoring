/**
 * @file PM2_COMMANDS.md
 * @description
 * PM2 프로세스 관리자 명령어 모음집 (Windows 환경 기준)
 * Node.js 애플리케이션을 관리하기 위한 PM2의 주요 명령어들을 정리한 문서입니다.
 *
 * 초보자 가이드:
 * 1. **PM2**: Node.js 애플리케이션을 백그라운드에서 실행하고 관리하는 프로세스 매니저
 * 2. **프로세스 ID**: PM2가 각 애플리케이션에 부여하는 고유 번호 (0, 1, 2...)
 * 3. **프로세스 이름**: 애플리케이션에 지정한 사람이 읽을 수 있는 이름
 * 4. **Windows 주의사항**: 일부 명령어는 Windows에서 다르게 동작하거나 추가 설정이 필요합니다
 */

# PM2 명령어 가이드 (Windows 환경)

PM2(Process Manager 2)는 Node.js 애플리케이션을 프로덕션 환경에서 실행하고 관리하기 위한 프로세스 매니저입니다.

> **⚠️ Windows 사용자 참고**: 이 문서는 Windows 환경에 최적화되어 있습니다. Linux/Mac과 다른 부분은 별도로 표시됩니다.

## 📦 설치

```bash
# PM2 전역 설치
npm install -g pm2

# Windows 자동 시작을 위한 추가 패키지 (선택사항)
npm install -g pm2-windows-startup

# 버전 확인
pm2 --version

# 설치 경로 확인
where pm2
```

### Windows 환경 설정

```bash
# PowerShell 실행 정책 변경 (관리자 권한 필요)
# PowerShell에서만 필요한 경우
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🚀 애플리케이션 시작

### 기본 시작
```bash
# 파일 실행
pm2 start app.js

# 이름 지정하여 실행
pm2 start app.js --name "my-app"

# Next.js 애플리케이션 시작
pm2 start npm --name "nextjs-app" -- start

# 포트 지정
pm2 start app.js --name "my-app" -- --port 3000
```

### 고급 시작 옵션
```bash
# 클러스터 모드 (여러 인스턴스)
pm2 start app.js -i 4           # 4개 인스턴스
pm2 start app.js -i max         # CPU 코어 수만큼

# Watch 모드 (파일 변경 시 자동 재시작)
pm2 start app.js --watch

# 메모리 제한
pm2 start app.js --max-memory-restart 300M

# 환경변수 설정
pm2 start app.js --env production
```

### Ecosystem 파일 사용
```bash
# ecosystem.config.js 파일로 시작
pm2 start ecosystem.config.js

# 특정 앱만 시작
pm2 start ecosystem.config.js --only app1
```

---

## 📋 프로세스 목록 확인

```bash
# 프로세스 목록 보기
pm2 list
pm2 ls
pm2 status

# 상세 정보 보기
pm2 show <id|name>
pm2 describe <id|name>

# 실시간 모니터링
pm2 monit
```

---

## ⏯️ 프로세스 제어

### 중지/재시작
```bash
# 중지
pm2 stop <id|name>              # 특정 프로세스 중지
pm2 stop all                    # 모든 프로세스 중지

# 재시작
pm2 restart <id|name>           # 특정 프로세스 재시작
pm2 restart all                 # 모든 프로세스 재시작

# 리로드 (무중단 재시작, 클러스터 모드 전용)
pm2 reload <id|name>
pm2 reload all

# 그레이스풀 리로드
pm2 gracefulReload <id|name>
```

### 삭제
```bash
# 프로세스 삭제
pm2 delete <id|name>            # 특정 프로세스 삭제
pm2 delete all                  # 모든 프로세스 삭제

# PM2 완전 종료 (모든 프로세스 + 데몬 종료)
pm2 kill
```

---

## 📊 로그 관리

```bash
# 로그 실시간 보기
pm2 logs                        # 모든 프로세스 로그
pm2 logs <id|name>              # 특정 프로세스 로그
pm2 logs --lines 100            # 최근 100줄

# 로그 초기화
pm2 flush                       # 모든 로그 삭제
pm2 flush <id|name>             # 특정 프로세스 로그 삭제

# 로그 파일 위치
pm2 logs --nostream             # 로그 파일 경로 표시
```

---

## 💾 프로세스 목록 저장/복원

```bash
# 현재 프로세스 목록 저장
pm2 save

# 저장된 프로세스 목록 복원
pm2 resurrect

# 저장된 목록 삭제
pm2 cleardump
```

---

## 🔄 자동 시작 설정 (Windows)

> **⚠️ 중요**: Windows에서는 `pm2 startup`/`pm2 unstartup` 명령어가 작동하지 않습니다!

### 방법 1: pm2-windows-startup 사용 (권장)

```bash
# 1. pm2-windows-startup 설치
npm install -g pm2-windows-startup

# 2. 앱 시작
pm2 start app.js --name "my-app"

# 3. 현재 상태 저장
pm2 save

# 4. Windows 시작프로그램에 등록
pm2-startup install

# 자동 시작 해제
pm2-startup uninstall
```

### 방법 2: Windows 작업 스케줄러 사용

```bash
# 1. 작업 스케줄러 열기
# Win + R → taskschd.msc

# 2. 작업 만들기
# - 트리거: 시스템 시작 시
# - 동작: 프로그램 시작
#   프로그램: C:\Program Files\nodejs\node.exe
#   인수: C:\Users\[사용자명]\AppData\Roaming\npm\node_modules\pm2\bin\pm2 resurrect
```

### 방법 3: pm2 save + resurrect

```bash
# 1. 앱 시작 후 저장
pm2 start app.js --name "my-app"
pm2 save

# 2. Windows 시작 시 자동으로 복원하려면
# 시작프로그램 폴더에 배치 파일 생성
# Win + R → shell:startup

# 3. startup.bat 파일 생성 내용:
# @echo off
# pm2 resurrect
```

**사용 순서 (방법 1 권장):**
1. `npm install -g pm2-windows-startup` 설치
2. `pm2 start` 명령으로 앱 실행
3. `pm2 save` 명령으로 현재 상태 저장
4. `pm2-startup install` 명령으로 자동 시작 설정
5. 재부팅 후 자동으로 앱이 실행됨

### 자동 시작 확인

```bash
# 현재 저장된 프로세스 목록 확인
pm2 list

# 저장된 프로세스 수동 복원 테스트
pm2 resurrect
```

---

## 🔍 모니터링 & 정보

```bash
# 실시간 모니터링 대시보드
pm2 monit

# 프로세스 상세 정보
pm2 show <id|name>

# 환경 정보
pm2 info <id|name>

# PM2 버전 및 경로
pm2 --version
where pm2                        # Windows에서는 where 사용 (which 아님)
```

---

## 🔧 설정 관리

```bash
# PM2 설정 파일 경로
pm2 conf

# 설정 초기화
pm2 reset <id|name>             # 재시작 횟수 등 통계 초기화

# 모듈 관리
pm2 install <module-name>       # PM2 모듈 설치
pm2 uninstall <module-name>     # PM2 모듈 제거
```

---

## 🧪 개발 모드

```bash
# 개발 모드로 실행 (로그 실시간 출력)
pm2-dev start app.js

# Watch 모드 + 로그 출력
pm2 start app.js --watch --no-daemon
```

---

## 🌐 클러스터 모드

```bash
# 클러스터 모드로 시작
pm2 start app.js -i 4           # 4개 인스턴스
pm2 start app.js -i max         # CPU 코어 수만큼
pm2 start app.js -i -1          # CPU 코어 수 -1

# 인스턴스 확장/축소
pm2 scale <app-name> 4          # 4개로 조정
pm2 scale <app-name> +2         # 2개 추가
```

---

## 📦 Ecosystem 파일 예시

`ecosystem.config.js` 파일을 생성하여 여러 앱을 관리할 수 있습니다:

```javascript
module.exports = {
  apps: [
    {
      name: 'nextjs-app',
      script: 'npm',
      args: 'start',
      cwd: './my-nextjs-app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'api-server',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
```

**사용법:**
```bash
# Ecosystem 파일로 시작
pm2 start ecosystem.config.js

# 특정 앱만 시작
pm2 start ecosystem.config.js --only nextjs-app

# 프로덕션 환경으로 시작
pm2 start ecosystem.config.js --env production
```

---

## 🗑️ 완전 제거 (Windows)

### 프로세스만 제거 (PM2는 유지)

```bash
# 방법 1: 모든 프로세스 삭제만 (자동 시작은 유지됨!)
pm2 delete all

# 방법 2: PM2 데몬 종료 (모든 프로세스 + 데몬 종료)
pm2 kill
```

> **⚠️ 주의**: `pm2 delete all`은 자동 시작 설정을 제거하지 않습니다!
> 재부팅 시 이전에 저장된 프로세스가 다시 시작될 수 있습니다.

### 자동 시작까지 완전히 제거

```bash
# 방법 1: pm2-windows-startup 사용 시
pm2-startup uninstall           # 자동 시작 해제
pm2 delete all                  # 모든 프로세스 삭제
pm2 save --force                # 빈 상태로 저장

# 방법 2: PM2 완전 초기화 (가장 깨끗함)
pm2 kill                        # PM2 데몬 + 모든 프로세스 종료
pm2-startup uninstall           # 자동 시작 해제 (설치한 경우)
pm2 cleardump                   # 저장된 프로세스 목록 삭제
```

### 수동으로 자동 시작 제거

#### 작업 스케줄러에서 제거
```bash
# 1. 작업 스케줄러 열기
# Win + R → taskschd.msc

# 2. 좌측 "작업 스케줄러 라이브러리" 선택

# 3. PM2 관련 작업 찾기 (PM2 또는 node 이름)

# 4. 우클릭 → 삭제
```

#### 시작프로그램 폴더 확인
```bash
# 시작프로그램 폴더 열기
# Win + R → shell:startup

# pm2 또는 startup.bat 파일이 있다면 삭제
```

### PM2 완전 제거 (소프트웨어 삭제)

```bash
# 1. 모든 프로세스 제거
pm2 kill

# 2. 자동 시작 제거
pm2-startup uninstall

# 3. PM2 설정 폴더 삭제 (선택사항)
# Windows 탐색기에서 아래 폴더 삭제:
# C:\Users\[사용자명]\.pm2

# 4. PM2 npm 패키지 제거
npm uninstall -g pm2
npm uninstall -g pm2-windows-startup
npm uninstall -g pm2-startup

# 5. npm 캐시 정리 (선택사항)
npm cache clean --force
```

### 제거 확인

```bash
# PM2 명령어 확인 (제거되었다면 에러 발생)
pm2 --version

# 프로세스 목록 확인
pm2 list

# 설치 경로 확인 (제거되었다면 결과 없음)
where pm2
```

---

## 📝 자주 사용하는 명령어 조합

### 기본 워크플로우 (Windows)
```bash
# 1. 앱 시작
pm2 start app.js --name "my-app"

# 2. 상태 확인
pm2 list

# 3. 로그 확인
pm2 logs my-app

# 4. 저장
pm2 save

# 5. 자동 시작 설정 (Windows)
pm2-startup install
```

### 문제 해결
```bash
# 1. 프로세스 상태 확인
pm2 list

# 2. 로그 확인
pm2 logs <app-name> --lines 50

# 3. 재시작
pm2 restart <app-name>

# 4. 완전히 삭제 후 재시작
pm2 delete <app-name>
pm2 start app.js --name <app-name>
```

### 배포 시
```bash
# 1. 코드 업데이트 후
pm2 reload all              # 무중단 재시작 (클러스터 모드)
# 또는
pm2 restart all             # 일반 재시작

# 2. 로그 확인
pm2 logs

# 3. 상태 저장
pm2 save
```

---

## 💡 유용한 팁 (Windows)

1. **프로세스 ID vs 이름**: ID는 삭제 후 재등록 시 변경될 수 있으므로, 이름으로 관리하는 것이 좋습니다.

2. **무중단 배포**: 클러스터 모드에서 `pm2 reload`를 사용하면 무중단 배포가 가능합니다.

3. **로그 관리**: 로그 파일이 커질 수 있으므로 `pm2 flush`로 주기적으로 정리하세요.
   - Windows 로그 위치: `C:\Users\[사용자명]\.pm2\logs\`

4. **메모리 관리**: `--max-memory-restart` 옵션으로 메모리 누수 방지가 가능합니다.

5. **Watch 모드 주의**: 프로덕션 환경에서는 `--watch` 옵션을 사용하지 마세요.

6. **Windows 자동 시작**:
   - `pm2 startup`/`pm2 unstartup`은 Windows에서 작동하지 않습니다
   - 대신 `pm2-windows-startup` 패키지를 사용하세요

7. **관리자 권한**: 일부 작업은 관리자 권한으로 실행한 명령 프롬프트가 필요할 수 있습니다.

8. **경로 주의**: Windows에서 경로에 공백이 있으면 따옴표로 감싸세요
   ```bash
   pm2 start "C:\Program Files\myapp\app.js"
   ```

9. **포트 충돌**: Windows 방화벽에서 포트를 열어야 외부 접속이 가능합니다.

10. **PM2 업데이트**: 정기적으로 PM2를 업데이트하세요
    ```bash
    npm update -g pm2
    ```

---

## 🔗 참고 자료

- **PM2 공식 문서**: https://pm2.keymetrics.io/docs/usage/quick-start/
- **PM2 GitHub**: https://github.com/Unitech/pm2
- **PM2 모니터링 도구**: https://pm2.io/
- **pm2-windows-startup GitHub**: https://github.com/marklagendijk/node-pm2-windows-startup
- **Windows 환경 설정 가이드**: https://pm2.keymetrics.io/docs/usage/startup/#windows-consideration

---

## 🆘 문제 해결 (Windows)

### PM2가 설치되지 않는 경우
```bash
# npm 캐시 정리 후 재설치
npm cache clean --force
npm install -g pm2
```

### PM2 명령어가 인식되지 않는 경우
```bash
# npm 전역 경로 확인
npm config get prefix

# 환경 변수에 추가 (시스템 속성 → 환경 변수)
# Path에 추가: C:\Users\[사용자명]\AppData\Roaming\npm
```

### 자동 시작이 작동하지 않는 경우
```bash
# 1. 저장된 프로세스 확인
pm2 list

# 2. 수동으로 복원 테스트
pm2 resurrect

# 3. pm2-startup 재설치
pm2-startup uninstall
pm2-startup install
pm2 save
```

### 프로세스가 자꾸 재시작되는 경우
```bash
# 로그 확인
pm2 logs <app-name> --lines 50

# 재시작 횟수 확인
pm2 list

# 자동 재시작 비활성화
pm2 start app.js --no-autorestart
```

### 포트가 이미 사용 중인 경우
```bash
# Windows에서 포트 사용 확인
netstat -ano | findstr :3000

# 프로세스 강제 종료
taskkill /PID [프로세스ID] /F
```

---

## 📋 빠른 참조 (치트시트)

| 작업 | 명령어 |
|------|--------|
| **설치** | `npm install -g pm2` |
| **앱 시작** | `pm2 start app.js --name "my-app"` |
| **목록 보기** | `pm2 list` |
| **로그 보기** | `pm2 logs` |
| **재시작** | `pm2 restart <name>` |
| **중지** | `pm2 stop <name>` |
| **삭제** | `pm2 delete <name>` |
| **모니터링** | `pm2 monit` |
| **저장** | `pm2 save` |
| **복원** | `pm2 resurrect` |
| **자동 시작 설정** | `pm2-startup install` (Windows) |
| **자동 시작 해제** | `pm2-startup uninstall` (Windows) |
| **전체 삭제** | `pm2 delete all` |
| **완전 종료** | `pm2 kill` |
| **로그 삭제** | `pm2 flush` |

---

**작성일**: 2025-11-25
**환경**: Windows 11
**프로젝트**: OhSung Monitoring System
**작성자**: Claude Code Assistant
