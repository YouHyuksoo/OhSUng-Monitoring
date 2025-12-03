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
    // 현재 폴링 상태 조회
    const isRealtimePolling = realtimeDataService.isPollingActive();
    const isHourlyPolling = hourlyEnergyService.isPollingActive();

    /**
     * 진단 로그: 싱글톤 인스턴스 확인 (개발용)
     * - 배포 환경에서 상태 불일치 문제 진단
     */
    if (process.env.NODE_ENV === "production") {
      console.log(
        `[API/polling/status] Realtime: ${isRealtimePolling}, Hourly: ${isHourlyPolling}`
      );
    }

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

    return NextResponse.json({
      status: isRealtimePolling || isHourlyPolling ? "running" : "stopped",
      services: {
        realtime: realtimeStatus,
        hourly: hourlyStatus,
      },
      timestamp: Date.now(),
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
