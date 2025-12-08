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

// 동적 라우트 (빌드 시 프리-렌더링하지 않음)
export const dynamic = "force-dynamic";

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

    // 폴링 주기 값 검증 (밀리초 단위, 최소 500ms)
    const pollingInterval = Math.max(500, parseInt(String(interval)) || 2000);
    console.log(`[API/realtime/polling] 폴링 주기 설정:`, {
      receivedInterval: interval,
      usedInterval: pollingInterval,
      ms: `${pollingInterval}ms`,
      seconds: `${(pollingInterval / 1000).toFixed(1)}초`,
    });

    // chartConfigs에서 모든 주소 추출
    const addresses = extractAllAddresses(chartConfigs || []);

    if (addresses.length === 0) {
      return NextResponse.json(
        { error: "No addresses found in chart configs" },
        { status: 400 }
      );
    }

    console.log(`[API/realtime/polling] 폴링 시작:`, {
      ip,
      port,
      plcType,
      interval: `${pollingInterval}ms`,
      addresses: addresses.length,
      addressList: addresses,
    });

    // 실시간 데이터 폴링 시작 (연결 테스트 후 시작)
    await realtimeDataService.startPolling(
      addresses,
      ip,
      parseInt(port),
      pollingInterval, // 검증된 폴링 주기 사용
      plcType, // plcType 전달
      modbusAddressMapping // 매핑 정보 전달
    );

    return NextResponse.json({
      success: true,
      message: "Realtime data polling started",
      ip,
      port,
      interval: pollingInterval,
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
