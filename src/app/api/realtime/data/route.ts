/**
 * @file src/app/api/realtime/data/route.ts
 * @description
 * 실시간 센서 데이터 조회 API
 * - GET: 특정 주소의 최근 데이터 조회 (DB에서)
 * - ?limit=N : 조회할 최근 데이터 개수 (기본값: 20)
 * - ?hours=N : 조회할 시간 범위 (N시간 전부터 현재까지)
 * - ?setAddress=주소 : 설정값 주소 함께 조회 (옵션)
 *
 * 참고: limit와 hours 중 하나만 사용하세요.
 * - hours 우선순위가 더 높음 (hours가 있으면 limit 무시)
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const setAddress = searchParams.get("setAddress");
    const hours = searchParams.get("hours")
      ? parseFloat(searchParams.get("hours")!)
      : null;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 20;

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter required" },
        { status: 400 }
      );
    }

    // DB에서 최근 데이터 조회 (hours 우선, 없으면 limit 사용)
    const recentData = hours !== null
      ? realtimeDataService.getRecentDataByTime(address, hours)
      : realtimeDataService.getRecentData(address, limit);

    // setAddress가 있으면 함께 조회
    let setAddressData: any[] | null = null;
    if (setAddress) {
      setAddressData = hours !== null
        ? realtimeDataService.getRecentDataByTime(setAddress, hours)
        : realtimeDataService.getRecentData(setAddress, limit);
    }

    // 데이터 병합 (타임스탬프 기준)
    const mergedData = recentData.map((point: any, index: number) => {
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
