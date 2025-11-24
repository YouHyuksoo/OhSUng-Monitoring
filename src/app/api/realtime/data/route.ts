/**
 * @file src/app/api/realtime/data/route.ts
 * @description
 * 실시간 센서 데이터 조회 API
 * - GET: 특정 주소의 최근 데이터 조회 (DB에서)
 * - DB에 저장된 최근 20개 데이터 포인트 반환
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const setAddress = searchParams.get("setAddress");
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 20;

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter required" },
        { status: 400 }
      );
    }

    // DB에서 최근 데이터 조회
    const recentData = realtimeDataService.getRecentData(address, limit);

    // setAddress가 있으면 함께 조회
    let setAddressData: any[] | null = null;
    if (setAddress) {
      setAddressData = realtimeDataService.getRecentData(setAddress, limit);
    }

    // 데이터 병합 (타임스탬프 기준)
    const mergedData = recentData.map((point, index) => {
      const setPoint =
        setAddressData && setAddressData[index]
          ? setAddressData[index].value
          : null;
      return {
        timestamp: point.timestamp,
        value: point.value,
        setAddress: setPoint,
      };
    });

    return NextResponse.json({
      address,
      setAddress: setAddress || null,
      data: mergedData,
      count: mergedData.length,
    });
  } catch (error) {
    console.error("[API] Failed to get realtime data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get realtime data",
      },
      { status: 500 }
    );
  }
}
