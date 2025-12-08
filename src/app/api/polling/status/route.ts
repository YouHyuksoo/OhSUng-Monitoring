/**
 * @file src/app/api/polling/status/route.ts
 * @description
 * 폴링 서비스 상태 확인 API
 * - GET: 현재 폴링 상태 조회
 * - 실시간 데이터와 시간별 에너지 폴링 상태 반환
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";
import { hourlyEnergyService } from "@/lib/hourly-energy-service";

export async function GET() {
  try {
    // 실제 서비스 인스턴스의 활성 상태를 직접 확인
    const isRealtimePolling = realtimeDataService.isPollingActive();
    const isHourlyPolling = hourlyEnergyService.isPollingActive();

    /**
     * 진단 로그: 메모리 내 인스턴스 상태 직접 확인
     */
    console.log(
      `[API/polling/status] Status Check - Realtime: ${isRealtimePolling ? '✅ ACTIVE' : '❌ STOPPED'}, Hourly: ${isHourlyPolling ? '✅ ACTIVE' : '❌ STOPPED'}`
    );

    const realtimeStatus = {
      isPolling: isRealtimePolling,
      lastUpdate: new Date().toISOString(),
      message: isRealtimePolling
        ? "실시간 데이터 폴링이 진행 중입니다"
        : "실시간 데이터 폴링이 중지되었습니다",
    };

    const hourlyStatus = {
      isPolling: isHourlyPolling,
      lastUpdate: new Date().toISOString(),
      message: isHourlyPolling
        ? "시간별 에너지 폴링이 진행 중입니다"
        : "시간별 에너지 폴링이 중지되었습니다",
    };

    /**
     * 폴링 상태 반환
     * - status: "running" = 최소 하나 이상의 폴링이 활성 상태
     * - isValid: 연결이 실제로 작동하는지 여부 (추후 확장 가능)
     */
    return NextResponse.json({
      status: isRealtimePolling || isHourlyPolling ? "running" : "stopped",
      services: {
        realtime: realtimeStatus,
        hourly: hourlyStatus,
      },
      timestamp: Date.now(),
      // 디버깅: 실제 폴링 상태 표시
      debug: {
        realtimeActive: isRealtimePolling,
        hourlyActive: isHourlyPolling,
      },
    });
  } catch (error) {
    console.error("[API] Failed to get polling status:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 }
    );
  }
}
