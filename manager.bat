@echo off
chcp 65001 > nul
setlocal

:MENU
cls
echo ========================================================
echo        🏭 PLC 모니터링 시스템 관리 도구 (v1.1)
echo ========================================================
echo.
echo   1. [설치] 프로젝트 소스 다운로드 (Git Clone)
echo   2. [세팅] 서버 환경 자동 세팅 (PM2 설치 + 자동실행)
echo   3. [업데이트] 최신 소스 가져오기 및 배포 (Git Pull + Build)
echo   4. [서버관리] 서버 상태 확인 (PM2 List)
echo   5. [서버관리] 서버 로그 보기 (PM2 Logs)
echo   6. [서버관리] 서버 중지 (Stop)
echo   7. [서버관리] 서버 재시작 (Restart)
echo   0. 종료
echo.
echo ========================================================
set /p choice="원하는 작업의 번호를 입력하세요: "

if "%choice%"=="1" goto CLONE
if "%choice%"=="2" goto SETUP
if "%choice%"=="3" goto DEPLOY
if "%choice%"=="4" goto STATUS
if "%choice%"=="5" goto LOGS
if "%choice%"=="6" goto STOP
if "%choice%"=="7" goto RESTART
if "%choice%"=="0" goto END
goto MENU

:CLONE
cls
echo.
echo [1] 프로젝트 소스를 다운로드합니다...
echo.
echo 깃허브에서 최신 소스 코드를 현재 폴더로 가져옵니다.
echo (주의: 이미 폴더가 있다면 에러가 날 수 있습니다)
echo.
git clone https://github.com/YouHyuksoo/OhSUng-Monitoring.git
echo.
echo [알림] 다운로드가 완료되었습니다!
echo [중요] 생성된 'OhSUng-Monitoring' 폴더 안으로 이 파일을 이동시킨 후
echo        다시 실행해서 '2번 세팅'을 진행해주세요.
echo.
pause
goto MENU

:SETUP
cls
echo.
echo [2] 초기 설정을 시작합니다... (관리자 권한 필요)
echo.
echo 2-1. PM2 및 필수 도구 설치 중...
call npm install -g pm2 pm2-windows-startup
echo.
echo 2-2. 윈도우 시작 프로그램 등록 중...
call pm2-startup install
echo.
echo 2-3. 프로젝트 의존성 설치 중...
call npm install --legacy-peer-deps
echo.
echo 2-4. 프로젝트 빌드 중...
call npm run build
echo.
echo 2-5. 서버 프로세스 시작 및 저장...
call pm2 start npm --name "plc-monitor" -- start
call pm2 save
echo.
echo ✅ 초기 설정이 완료되었습니다!
pause
goto MENU

:DEPLOY
cls
echo.
echo [3] 업데이트 및 배포를 시작합니다...
echo.
echo 3-1. 최신 소스 가져오는 중 (Git Pull)...
git pull
echo.
echo 3-2. 라이브러리 동기화 중...
call npm install --legacy-peer-deps
echo.
echo 3-3. 프로젝트 빌드 중...
call npm run build
echo.
echo 3-4. 서버 재시작 중...
call pm2 restart plc-monitor
echo.
echo ✅ 업데이트가 완료되었습니다!
pause
goto MENU

:STATUS
cls
echo.
echo [4] 현재 서버 상태 목록
echo.
call pm2 list
echo.
pause
goto MENU

:LOGS
cls
echo.
echo [5] 실시간 로그 보기 (나가려면 Ctrl+C)
echo.
call pm2 logs plc-monitor
goto MENU

:STOP
cls
echo.
echo [6] 서버를 중지합니다...
call pm2 stop plc-monitor
echo.
pause
goto MENU

:RESTART
cls
echo.
echo [7] 서버를 재시작합니다...
call pm2 restart plc-monitor
echo.
pause
goto MENU

:END
endlocal
exit
