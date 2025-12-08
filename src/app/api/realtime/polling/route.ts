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
    let {
      ip,
      port,
      interval = 2000,
      chartConfigs,
      plcType,
      modbusAddressMapping,
    } = body;

    // 데모 모드일 경우 기본값 설정
    if (plcType === "demo") {
      ip = ip || "demo";
      port = port || 502;
    }

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

    // 실시간 데이터 폴링 시작 (연결 테스트 후 시작)
    await realtimeDataService.startPolling(
      addresses,
      ip,
      parseInt(port),
      interval,
      plcType, // plcType 전달
      modbusAddressMapping // 매핑 정보 전달
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
