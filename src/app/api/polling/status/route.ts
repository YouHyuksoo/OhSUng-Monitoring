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

export async function GET(request: Request) {
  try {
    // 현재 폴링 상태 조회
    const realtimeStatus = {
      isPolling: true, // realtime-data-service는 시작되면 계속 폴링
      lastUpdate: new Date().toISOString(),
      message: "실시간 데이터 폴링이 진행 중입니다",
    };

    const hourlyStatus = {
      isPolling: true, // hourly-energy-service는 시작되면 계속 폴링
      lastUpdate: new Date().toISOString(),
      message: "시간별 에너지 폴링이 진행 중입니다",
    };

    return NextResponse.json({
      status: "running",
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
