/**
 * @file src/app/api/data/query/route.ts
 * @description
 * 데이터 조회 API
 * - GET: 날짜 범위 및 주소 기준으로 DB에서 데이터 조회
 * - ?from=YYYY-MM-DD : 시작 날짜
 * - ?to=YYYY-MM-DD : 종료 날짜
 * - ?address=주소 : 특정 주소 필터 (선택 사항)
 *
 * 초보자 가이드:
 * 1. **필수 파라미터**: from, to (YYYY-MM-DD 형식)
 * 2. **선택 파라미터**: address (특정 주소만 조회)
 * 3. **응답**: { data: DataPoint[], count: number }
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const address = searchParams.get("address");

    // 필수 파라미터 검증
    if (!from || !to) {
      return NextResponse.json(
        { error: "from과 to 파라미터는 필수입니다 (YYYY-MM-DD 형식)" },
        { status: 400 }
      );
    }

    console.log(`[API] Data query - from: ${from}, to: ${to}, address: ${address}`);

    // 날짜 유효성 검증
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "유효한 날짜 형식이 아닙니다 (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // 주소가 지정된 경우와 미지정의 경우를 처리
    let data: any[] = [];

    if (address) {
      // 특정 주소의 데이터만 조회
      data = realtimeDataService.getDateRangeData(from, to, address);
      console.log(
        `[API] Queried ${data.length} data points for address ${address}`
      );
    } else {
      // 모든 주소의 데이터 조회
      data = realtimeDataService.getDateRangeData(from, to);
      console.log(`[API] Queried ${data.length} data points for all addresses`);
    }

    return NextResponse.json({
      address: address || null,
      from,
      to,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error("[API] Failed to query data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "데이터 조회 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
