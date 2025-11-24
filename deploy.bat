@echo off
chcp 65001
cls

echo ========================================================
echo      PLC 모니터링 시스템 자동 업데이트 및 배포 스크립트
echo ========================================================

echo.
echo [1/4] 최신 소스 코드를 가져오는 중... (Git Pull)
git pull
IF %ERRORLEVEL% NEQ 0 (
    echo [오류] Git Pull 실패! 인터넷 연결이나 Git 설정을 확인하세요.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] 라이브러리 설치 중... (npm install)
call npm install --legacy-peer-deps
IF %ERRORLEVEL% NEQ 0 (
    echo [오류] npm install 실패!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] 프로젝트 빌드 중... (npm run build)
echo 시간이 조금 걸릴 수 있습니다. 잠시만 기다려주세요...
call npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo [오류] 빌드 실패! 소스 코드에 문제가 있을 수 있습니다.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [4/4] 서버 재시작 중... (PM2 Restart)
call pm2 restart plc-monitor
IF %ERRORLEVEL% NEQ 0 (
    echo [알림] 실행 중인 프로세스가 없습니다. 새로 시작합니다.
    call pm2 start npm --name "plc-monitor" -- start
    call pm2 save
)

echo.
echo ========================================================
echo                 배포가 완료되었습니다!
echo ========================================================
echo.
pause
