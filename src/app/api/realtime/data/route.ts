/**
 * @file src/app/api/realtime/data/route.ts
 * @description
 * 실시간 센서 데이터 조회 API
 * - GET: 특정 주소의 최근 데이터 조회
 * - ?limit=N : 조회할 최근 데이터 개수 (기본값: 20)
 * - ?hours=N : 조회할 시간 범위 (N시간 전부터 현재까지)
 * - ?setAddress=주소 : 설정값 주소 함께 조회 (옵션)
 *
 * 데이터 소스:
 * - useMemoryPolling이 true면: 메모리에서 최근 20개 조회 (빠름, 실시간)
 * - useMemoryPolling이 false면: DB에서 조회 (안정성, 장기 저장)
 *
 * 참고: limit와 hours 중 하나만 사용하세요.
 * - hours 우선순위가 더 높음 (hours가 있으면 limit 무시)
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";
import * as fs from "fs";
import * as path from "path";

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

    /**
     * 데이터 소스 결정
     * useMemoryPolling 설정에 따라 메모리 또는 DB에서 조회
     */
    let useMemoryPolling = false;
    try {
      const settingsPath = path.join(process.cwd(), "data", "settings.json");
      if (fs.existsSync(settingsPath)) {
        const settingsData = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
        useMemoryPolling = settingsData.useMemoryPolling ?? false;
      }
    } catch (error) {
      console.error("[API] Failed to read settings:", error);
    }

    console.log(
      `[API] Realtime data request - address: ${address}, useMemoryPolling: ${useMemoryPolling}`
    );

    let recentData: any[] = [];
    let setAddressData: any[] | null = null;

    if (useMemoryPolling) {
      /**
       * 메모리 모드: realtimeDataService에서 최근 20개 조회
       * - 실제 폴링 중인 데이터가 저장된 memoryCache 사용
       * - hours, limit 파라미터 무시
       * - 항상 메모리의 모든 데이터 반환
       */
      const historyData = realtimeDataService.getMemoryCache(address);
      recentData = historyData.map((point) => ({
        timestamp: point.timestamp,
        value: point.value,
      }));

      // setAddress 있으면 함께 조회
      if (setAddress) {
        const setHistoryData = realtimeDataService.getMemoryCache(setAddress);
        setAddressData = setHistoryData.map((point) => ({
          timestamp: point.timestamp,
          value: point.value,
        }));
      }

      console.log(
        `[API] Memory mode - address: ${address}, data points: ${recentData.length}`
      );
    } else {
      /**
       * DB 모드: realtimeDataService에서 조회
       * - hours 우선: N시간 범위 데이터 조회
       * - limit: 최근 N개 데이터 조회
       */
      recentData =
        hours !== null
          ? realtimeDataService.getRecentDataByTime(address, hours)
          : realtimeDataService.getRecentData(address, limit);

      // setAddress가 있으면 함께 조회
      if (setAddress) {
        setAddressData =
          hours !== null
            ? realtimeDataService.getRecentDataByTime(setAddress, hours)
            : realtimeDataService.getRecentData(setAddress, limit);
      }

      console.log(
        `[API] DB mode - address: ${address}, data points: ${recentData.length}`
      );
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
      mode: useMemoryPolling ? "memory" : "db",
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
