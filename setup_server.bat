@echo off
chcp 65001
cls

echo ========================================================
echo        PLC 모니터링 시스템 - 서버 초기 설정 마법사
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
    exit /b
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
echo      이제부터는 'deploy.bat'만 사용하여 업데이트하세요.
echo ========================================================
pause
