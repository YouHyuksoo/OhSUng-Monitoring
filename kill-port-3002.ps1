# ============================================================================
# @file kill-port-3002.ps1
# @description
# 이 PowerShell 스크립트는 3002 포트를 사용하는 프로세스를 찾아서 종료합니다.
# Get-NetTCPConnection cmdlet을 사용하여 포트를 점유한 프로세스를 찾고,
# Stop-Process cmdlet으로 해당 프로세스를 종료합니다.
#
# 사용법:
#   PowerShell에서: .\kill-port-3002.ps1
#   또는 우클릭 > "PowerShell로 실행"
#
# 초보자 가이드:
# 1. PowerShell 실행 정책 때문에 오류가 발생하면 다음 명령어를 먼저 실행하세요:
#    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# 2. 관리자 권한으로 실행하는 것을 권장합니다.
# 3. 3002 포트를 사용하는 프로세스가 없으면 "찾을 수 없습니다" 메시지가 표시됩니다.
#
# 유지보수 팁:
# - 다른 포트를 종료하려면 $port 변수의 값을 변경하세요.
# - -Force 플래그를 제거하면 확인 메시지가 표시됩니다.
# ============================================================================

# 종료할 포트 번호
$port = 3002

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "$port 포트를 사용하는 프로세스 검색 중..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    # 3002 포트를 사용하는 TCP 연결 찾기
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    
    if ($null -eq $connections -or $connections.Count -eq 0) {
        Write-Host "[정보] $port 포트를 사용하는 프로세스를 찾을 수 없습니다." -ForegroundColor Yellow
        exit 0
    }
    
    # 프로세스 ID 추출
    $processId = $connections[0].OwningProcess
    
    # 프로세스 정보 가져오기
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    
    if ($null -eq $process) {
        Write-Host "[오류] 프로세스 정보를 가져올 수 없습니다." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[발견] $port 포트를 사용하는 프로세스:" -ForegroundColor Green
    Write-Host "  - PID: $processId" -ForegroundColor White
    Write-Host "  - 프로세스명: $($process.ProcessName)" -ForegroundColor White
    Write-Host "  - 경로: $($process.Path)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "프로세스 종료 중..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # 프로세스 강제 종료
    Stop-Process -Id $processId -Force -ErrorAction Stop
    
    Write-Host ""
    Write-Host "[성공] 프로세스가 성공적으로 종료되었습니다." -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "[오류] 프로세스 종료에 실패했습니다: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "관리자 권한으로 실행해주세요." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
