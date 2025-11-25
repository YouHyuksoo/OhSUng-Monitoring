@echo off
chcp 65001
cls

:MENU
cls
echo ========================================================
echo        PLC 모니터링 시스템 - 서버 관리 메뉴
echo ========================================================
echo.
echo 1. 초기 설정 (Initial Setup) - 최초 1회 실행 (PM2 설치 등)
echo 2. 서버 업그레이드 (Upgrade) - Git Pull, Build, Restart
echo 3. 서버 시작 (Start Server) - PM2로 서버 시작 (빌드 없이 실행)
echo 4. 종료 (Exit)
echo.
echo ========================================================
set /p choice="원하는 작업을 선택하세요 (1-4): "

if "%choice%"=="1" goto INITIAL_SETUP
if "%choice%"=="2" goto UPGRADE
if "%choice%"=="3" goto START_SERVER
if "%choice%"=="4" goto EXIT
goto MENU

:INITIAL_SETUP
cls
echo ========================================================
echo        PLC 모니터링 시스템 - 서버 초기 설정
echo ========================================================
echo.
echo 이 스크립트는 서버(Windows)에 필요한 도구들을 설치하고
echo 자동 실행 환경을 구성합니다. (최초 1회만 실행)
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
echo (deploy.bat를 호출하여 빌드 및 실행을 진행합니다)
echo.
call deploy.bat

echo.
echo [4/4] 현재 실행 상태 저장 (재부팅 대비)
call pm2 save

echo.
echo ========================================================
echo                 초기 설정이 완료되었습니다!
echo ========================================================
pause
goto MENU

:UPGRADE
cls
call deploy.bat
goto MENU

:START_SERVER
cls
echo ========================================================
echo        PLC 모니터링 시스템 - 서버 시작 (PM2)
echo ========================================================
echo.
echo PM2를 사용하여 서버를 시작합니다...
echo.
call pm2 start npm --name "plc-monitor" -- start
IF %ERRORLEVEL% NEQ 0 (
    echo [알림] 이미 실행 중이거나 오류가 발생했습니다. 상태를 확인합니다.
    call pm2 restart plc-monitor
)
call pm2 save
echo.
echo 서버 시작 시도가 완료되었습니다.
pause
goto MENU

:EXIT
exit
