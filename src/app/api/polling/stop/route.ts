/**
 * @file src/app/api/polling/stop/route.ts
 * @description
 * 폴링 서비스 중지 API
 * - POST: 모든 폴링 서비스 중지
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";
import { hourlyEnergyService } from "@/lib/hourly-energy-service";

// 동적 라우트 (빌드 시 프리-렌더링하지 않음)
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 실시간 데이터 폴링 중지
    realtimeDataService.stopPolling();
    console.log("[API] Realtime data polling stopped");

    // 시간별 에너지 폴링 중지
    hourlyEnergyService.stopHourlyPolling();
    console.log("[API] Hourly energy polling stopped");

    return NextResponse.json({
      success: true,
      message: "All polling services stopped",
      services: {
        realtime: "stopped",
        hourly: "stopped",
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[API] Failed to stop polling:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to stop polling",
      },
      { status: 500 }
    );
  }
}
