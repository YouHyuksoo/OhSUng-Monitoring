/**
 * @file src/app/api/realtime/polling/route.ts
 * @description
 * 실시간 데이터 폴링 제어 API
 * - POST: 모든 센서 데이터 폴링 시작
 * - chartConfigs에서 모든 주소(address + setAddress) 추출
 * - SQLite DB에 저장하며 10초마다 클라이언트가 조회
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";

/**
 * chartConfigs에서 모든 PLC 주소 추출
 */
function extractAllAddresses(chartConfigs: any[]): string[] {
  const addresses = new Set<string>();

  if (Array.isArray(chartConfigs)) {
    chartConfigs.forEach((config) => {
      if (config.address) addresses.add(config.address);
      if (config.setAddress) addresses.add(config.setAddress);
      // accumulationAddress는 별도 폴링이므로 제외
    });
  }

  return Array.from(addresses);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ip, port, interval = 2000, chartConfigs, plcType } = body;

    if (!ip || !port) {
      return NextResponse.json(
        { error: "IP and Port required" },
        { status: 400 }
      );
    }

    // chartConfigs에서 모든 주소 추출
    const addresses = extractAllAddresses(chartConfigs || []);

    if (addresses.length === 0) {
      return NextResponse.json(
        { error: "No addresses found in chart configs" },
        { status: 400 }
      );
    }

    // plcType이 "demo"인 경우 데모 모드로 실행
    const isDemoMode = plcType === "demo";

    // 실시간 데이터 폴링 시작
    realtimeDataService.startPolling(
      addresses,
      ip,
      parseInt(port),
      interval,
      isDemoMode
    );

    return NextResponse.json({
      success: true,
      message: "Realtime data polling started",
      ip,
      port,
      interval,
      addressCount: addresses.length,
      addresses,
    });
  } catch (error) {
    console.error("[API] Failed to start realtime polling:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start polling",
      },
      { status: 500 }
    );
  }
}
