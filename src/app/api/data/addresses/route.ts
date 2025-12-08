/**
 * @file src/app/api/data/addresses/route.ts
 * @description
 * 사용 가능한 주소 목록 조회 API
 * - GET: DB에 저장된 모든 주소의 목록 반환
 * - 응답: { addresses: string[] }
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // realtime-data-service에서 사용 가능한 주소 목록 조회
    const addresses = realtimeDataService.getAvailableAddresses();

    console.log(`[API] Found ${addresses.length} available addresses`);

    return NextResponse.json({
      addresses: addresses.sort(),
      count: addresses.length,
    });
  } catch (error) {
    console.error("[API] Failed to get available addresses:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "주소 목록 조회 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
