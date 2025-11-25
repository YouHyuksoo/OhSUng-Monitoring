@echo off
chcp 65001 > nul
setlocal

:MENU
cls
echo ========================================================
echo        🏭 PLC 모니터링 시스템 통합 관리 도구 (v2.0)
echo ========================================================
echo.
echo   [설치 및 초기 설정]
echo   1. 프로젝트 소스 다운로드 (Git Clone)
echo   2. 서버 환경 초기 세팅 (PM2 설치 + 시작프로그램 + 배포)
echo.
echo   [업데이트 및 배포]
echo   3. 전체 업그레이드 (Git Pull + Install + Build + Restart)
echo.
echo   [개별 작업]
echo   4. 소스 가져오기 (Git Pull)
echo   5. 라이브러리 설치 (npm install)
echo   6. 프로젝트 빌드 (npm run build)
echo.
echo   [서버 관리]
echo   7. 서버 시작 (PM2 Start)
echo   8. 서버 재시작 (PM2 Restart)
echo   9. 서버 중지 (PM2 Stop)
echo   10. 서버 상태 확인 (PM2 List)
echo   11. 실시간 로그 보기 (PM2 Logs)
echo   12. 윈도우 시작 프로그램 등록 (Auto Startup)
echo.
echo   0. 종료
echo.
echo ========================================================
set /p choice="원하는 작업의 번호를 입력하세요 (0-12): "

if "%choice%"=="1" goto CLONE
if "%choice%"=="2" goto INITIAL_SETUP
if "%choice%"=="3" goto FULL_UPGRADE
if "%choice%"=="4" goto GIT_PULL
if "%choice%"=="5" goto NPM_INSTALL
if "%choice%"=="6" goto BUILD
if "%choice%"=="7" goto START_SERVER
if "%choice%"=="8" goto RESTART_SERVER
if "%choice%"=="9" goto STOP_SERVER
if "%choice%"=="10" goto STATUS
if "%choice%"=="11" goto VIEW_LOG
if "%choice%"=="12" goto AUTO_STARTUP
if "%choice%"=="0" goto END
goto MENU

:CLONE
cls
echo ========================================================
echo        프로젝트 소스 다운로드 (Git Clone)
echo ========================================================
echo.
echo 깃허브에서 최신 소스 코드를 현재 폴더로 가져옵니다.
echo (주의: 이미 폴더가 있다면 에러가 날 수 있습니다)
echo.
git clone https://github.com/YouHyuksoo/OhSUng-Monitoring.git
echo.
echo [알림] 다운로드가 완료되었습니다!
echo [중요] 생성된 'OhSUng-Monitoring' 폴더 안으로 이 파일을 이동시킨 후
echo        다시 실행해서 '2. 서버 환경 초기 세팅'을 진행해주세요.
echo.
pause
goto MENU

:INITIAL_SETUP
cls
echo ========================================================
echo        서버 환경 초기 세팅 (Initial Setup)
echo ========================================================
echo.
echo [주의] 반드시 '관리자 권한'으로 실행해야 합니다!
echo.
pause

echo.
echo [1/3] PM2 및 윈도우 시작 도구 설치 중...
call npm install -g pm2 pm2-windows-startup
IF %ERRORLEVEL% NEQ 0 (
    echo [오류] npm 설치 실패! Node.js가 설치되어 있는지 확인하세요.
    pause
    goto MENU
)

echo.
echo [2/3] 윈도우 시작 프로그램 등록 중...
call pm2-startup install
IF %ERRORLEVEL% NEQ 0 (
    echo [알림] 이미 등록되어 있거나 권한 문제일 수 있습니다. 계속 진행합니다.
)

echo.
echo [3/3] 초기 배포 및 프로세스 등록 실행...
echo.
echo 라이브러리 설치 중...
call npm install --legacy-peer-deps
echo.
echo 프로젝트 빌드 중...
call npm run build
echo.
echo 서버 시작 중...
call pm2 start ecosystem.config.js

echo.
echo [4/4] 현재 실행 상태 저장
call pm2 save
echo.
echo ✅ 초기 설정이 완료되었습니다!
pause
goto MENU

:FULL_UPGRADE
cls
echo ========================================================
echo        전체 업그레이드 (Full Upgrade)
echo ========================================================
echo.
echo 1. 소스 코드 가져오는 중...
git pull
echo.
echo 2. 라이브러리 설치 중...
call npm install --legacy-peer-deps
echo.
echo 3. 프로젝트 빌드 중...
call npm run build
echo.
echo 4. 서버 재시작 중...
call pm2 restart ecosystem.config.js
IF %ERRORLEVEL% NEQ 0 (
    echo [알림] 실행 중인 프로세스가 없습니다. 새로 시작합니다.
    call pm2 start ecosystem.config.js
)
call pm2 save
echo.
echo ✅ 전체 업그레이드가 완료되었습니다!
pause
goto MENU

:GIT_PULL
cls
echo ========================================================
echo        소스 코드 가져오기 (Git Pull)
echo ========================================================
git pull
IF %ERRORLEVEL% NEQ 0 (
    echo [오류] Git Pull 실패!
) else (
    echo [성공] 최신 소스를 가져왔습니다.
)
pause
goto MENU

:NPM_INSTALL
cls
echo ========================================================
echo        라이브러리 설치 (npm install)
echo ========================================================
call npm install --legacy-peer-deps
IF %ERRORLEVEL% NEQ 0 (
    echo [오류] npm install 실패!
) else (
    echo [성공] 라이브러리 설치 완료.
)
pause
goto MENU

:BUILD
cls
echo ========================================================
echo        프로젝트 빌드 (npm run build)
echo ========================================================
echo 시간이 조금 걸릴 수 있습니다...
call npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo [오류] 빌드 실패!
) else (
    echo [성공] 빌드 완료.
)
pause
goto MENU

:START_SERVER
cls
echo ========================================================
echo        서버 시작 (PM2 Start)
echo ========================================================
call pm2 start ecosystem.config.js
IF %ERRORLEVEL% NEQ 0 (
    echo [알림] 이미 실행 중이거나 오류가 발생했습니다. 재시작을 시도합니다.
    call pm2 restart ecosystem.config.js
)
call pm2 save
echo.
echo [성공] 서버 시작 명령이 완료되었습니다.
echo [알림] 현재 실행 중인 프로세스가 윈도우 시작 시 자동 실행되도록 저장되었습니다.
pause
goto MENU

:RESTART_SERVER
cls
echo ========================================================
echo        서버 재시작 (PM2 Restart)
echo ========================================================
call pm2 restart ecosystem.config.js
IF %ERRORLEVEL% NEQ 0 (
    echo [알림] 실행 중인 프로세스가 없습니다. 새로 시작합니다.
    call pm2 start ecosystem.config.js
    call pm2 save
) else (
    echo [성공] 서버가 재시작되었습니다.
)
pause
goto MENU

:STOP_SERVER
cls
echo ========================================================
echo        서버 중지 (PM2 Stop)
echo ========================================================
call pm2 stop plc-monitor
echo [알림] 서버가 중지되었습니다.
pause
goto MENU

:STATUS
cls
echo ========================================================
echo        서버 상태 확인 (PM2 List)
echo ========================================================
call pm2 list
pause
goto MENU

:VIEW_LOG
cls
echo ========================================================
echo        실시간 로그 보기 (PM2 Logs)
echo ========================================================
echo 로그를 보려면 Ctrl+C를 눌러 종료하세요.
call pm2 logs plc-monitor
pause
goto MENU

:AUTO_STARTUP
cls
echo ========================================================
echo        윈도우 시작 프로그램 등록 (Auto Startup)
echo ========================================================
echo.
echo [주의] 반드시 '관리자 권한'으로 실행해야 합니다!
echo.
echo 1. PM2 Windows Startup 도구 설치 확인...
call npm list -g pm2-windows-startup > nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [알림] 도구가 없어 설치합니다...
    call npm install -g pm2-windows-startup
)

echo.
echo 2. 시작 프로그램 등록 실행...
call pm2-startup install
IF %ERRORLEVEL% NEQ 0 (
    echo [알림] 이미 등록되어 있거나 권한 문제일 수 있습니다.
) else (
    echo [성공] 윈도우 시작 프로그램에 등록되었습니다.
)

echo.
echo 3. 현재 실행 중인 프로세스 목록 저장...
call pm2 save
echo.
echo ✅ 설정이 완료되었습니다! 이제 재부팅 시 서버가 자동 실행됩니다.
pause
goto MENU

:END
endlocal
exit
