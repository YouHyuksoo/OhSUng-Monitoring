@echo off
REM ============================================================================
REM @file kill-port-3002.bat
REM @description
REM 이 배치 스크립트는 3002 포트를 사용하는 프로세스를 찾아서 종료합니다.
REM Windows의 netstat 명령어를 사용하여 포트를 점유한 프로세스 ID(PID)를 찾고,
REM taskkill 명령어로 해당 프로세스를 강제 종료합니다.
REM
REM 사용법:
REM   kill-port-3002.bat
REM
REM 초보자 가이드:
REM 1. 이 스크립트를 더블클릭하거나 명령 프롬프트에서 실행하세요.
REM 2. 관리자 권한이 필요할 수 있습니다.
REM 3. 3002 포트를 사용하는 프로세스가 없으면 "찾을 수 없습니다" 메시지가 표시됩니다.
REM
REM 유지보수 팁:
REM - 다른 포트를 종료하려면 "3002"를 원하는 포트 번호로 변경하세요.
REM ============================================================================

echo ========================================
echo 3002 포트를 사용하는 프로세스 검색 중...
echo ========================================
echo.

REM netstat으로 3002 포트를 사용하는 프로세스 찾기
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING') do (
    set PID=%%a
    goto :found
)

echo [정보] 3002 포트를 사용하는 프로세스를 찾을 수 없습니다.
goto :end

:found
echo [발견] 3002 포트를 사용하는 프로세스 PID: %PID%
echo.
echo 프로세스 정보:
tasklist /FI "PID eq %PID%"
echo.
echo ========================================
echo 프로세스 종료 중...
echo ========================================

REM 프로세스 강제 종료
taskkill /F /PID %PID%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [성공] 프로세스가 성공적으로 종료되었습니다.
) else (
    echo.
    echo [오류] 프로세스 종료에 실패했습니다. 관리자 권한으로 실행해주세요.
)

:end
echo.
pause
