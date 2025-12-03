/**
 * @file src/app/api/polling/stop/route.ts
 * @description
 * 폴링 서비스 중지 API
 * - POST: 모든 폴링 서비스 중지
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";
import { hourlyEnergyService } from "@/lib/hourly-energy-service";
import { stopAllPolling } from "@/lib/polling-state";

export async function POST() {
  try {
    // 실시간 데이터 폴링 중지
    realtimeDataService.stopPolling();
    console.log("[API] Realtime data polling stopped");

    // 시간별 에너지 폴링 중지
    hourlyEnergyService.stopHourlyPolling();
    console.log("[API] Hourly energy polling stopped");

    // ✅ 파일 기반 상태 업데이트 (프로세스간 공유)
    stopAllPolling();
    console.log("[API] Polling state file updated");

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
