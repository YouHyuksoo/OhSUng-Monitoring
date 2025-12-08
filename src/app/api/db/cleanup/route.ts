/**
 * @file src/app/api/db/cleanup/route.ts
 * @description
 * 데이터베이스 정리 API
 * - POST: 오래된 데이터 삭제
 * - query params: daysToKeep (기본값: 7일)
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";

// 동적 라우트 (빌드 시 프리-렌더링하지 않음)
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysToKeep = parseInt(searchParams.get("daysToKeep") || "7");

    if (daysToKeep < 1 || daysToKeep > 365) {
      return NextResponse.json(
        { error: "daysToKeep must be between 1 and 365" },
        { status: 400 }
      );
    }

    // DB 정리 실행
    realtimeDataService.cleanupOldData(daysToKeep);

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Kept data from last ${daysToKeep} days`,
      daysToKeep,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[API] Failed to cleanup database:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to cleanup database",
      },
      { status: 500 }
    );
  }
}
