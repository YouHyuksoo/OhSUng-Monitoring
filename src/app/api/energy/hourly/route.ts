/**
 * @file src/app/api/energy/hourly/route.ts
 * @description
 * 시간별 누적 전력량 API (SQLite)
 *
 * 엔드포인트:
 * - GET: 에너지 데이터 조회
 *   - ?summary=true : 요약 데이터 (당일/주간/월간 합계 + 일별 합계)
 *   - ?date=YYYY-MM-DD : 특정 날짜 조회
 *   - ?from=YYYY-MM-DD&to=YYYY-MM-DD : 날짜 범위 조회 (30일 데이터 한 번에)
 *   - 파라미터 없음 : 오늘 데이터 조회
 * - POST: 폴링 시작
 *
 * 초보자 가이드:
 * 1. **요약 조회 (권장)**: /api/energy/hourly?summary=true
 * 2. **단일 날짜 조회**: /api/energy/hourly?date=2025-11-25
 * 3. **범위 조회**: /api/energy/hourly?from=2025-10-26&to=2025-11-25
 * 4. **오늘 데이터**: /api/energy/hourly
 */

import { NextResponse } from "next/server";
import { hourlyEnergyService, DailyEnergyData } from "@/lib/hourly-energy-service";

/**
 * GET: 에너지 데이터 조회
 * - 날짜 범위 조회 시 한 번의 API 호출로 모든 데이터 반환
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get("summary"); // 요약 데이터
    const date = searchParams.get("date"); // 단일 날짜
    const from = searchParams.get("from"); // 시작 날짜
    const to = searchParams.get("to"); // 종료 날짜

    // 0. 요약 데이터 조회 (SQL SUM으로 한 번에 계산)
    if (summary === "true") {
      const summaryData = hourlyEnergyService.getEnergySummary();
      return NextResponse.json(summaryData);
    }

    // 1. 날짜 범위 조회 (from & to)
    if (from && to) {
      const data = hourlyEnergyService.getDateRangeData(from, to);

      return NextResponse.json({
        data,
        from,
        to,
        count: data.length,
      });
    }

    // 2. 특정 날짜 조회
    let data: DailyEnergyData | null;
    if (date) {
      data = hourlyEnergyService.getDayData(date);
    } else {
      // 3. 오늘 데이터 조회
      data = hourlyEnergyService.getCurrentData();
    }

    if (!data) {
      // 데이터가 없으면 빈 데이터 반환
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      return NextResponse.json({
        date: date || todayStr,
        hours: new Array(24).fill(0),
        lastUpdate: Date.now(),
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to get hourly energy data:", error);
    return NextResponse.json(
      { error: "Failed to retrieve data" },
      { status: 500 }
    );
  }
}

/**
 * POST: 폴링 시작
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { ip, port, plcType, modbusAddressMapping } = body;

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

    // 폴링 시작 (연결 테스트 후 시작)
    await hourlyEnergyService.startHourlyPolling(
      ip,
      parseInt(port),
      plcType,
      modbusAddressMapping
    );

    return NextResponse.json({
      success: true,
      message: "Hourly polling started",
      ip,
      port,
    });
  } catch (error) {
    console.error("Failed to start hourly polling:", error);
    return NextResponse.json(
      { error: "Failed to start polling" },
      { status: 500 }
    );
  }
}
