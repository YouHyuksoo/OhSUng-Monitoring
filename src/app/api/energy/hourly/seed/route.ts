/**
 * @file src/app/api/energy/hourly/seed/route.ts
 * @description
 * 시간별 전력량 테스트 데이터 생성 API
 * - 현재 날짜와 지난 30일의 가상 데이터 생성
 * - 각 날짜마다 1~24시간대 데이터 생성
 */

import { NextResponse } from "next/server";
import { hourlyEnergyService } from "@/lib/hourly-energy-service";

// 동적 라우트 (빌드 시 프리-렌더링하지 않음)
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { days = 30 } = body;

    /**
     * 지난 N일의 테스트 데이터 생성
     */
    for (let daysAgo = days - 1; daysAgo >= 0; daysAgo--) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      hourlyEnergyService.insertTestData(dateStr);
    }

    return NextResponse.json({
      success: true,
      message: `${days}일치 시간별 전력량 테스트 데이터 생성 완료`,
      days,
    });
  } catch (error) {
    console.error("[Energy Seed API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "데이터 생성 실패",
      },
      { status: 500 }
    );
  }
}

/**
 * GET 요청: 테스트 데이터 생성
 * 쿼리 파라미터: days=30 (기본값)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: "days는 1~365 사이여야 합니다" },
        { status: 400 }
      );
    }

    // POST 로직 재사용
    const response = await POST(
      new Request(request.url, {
        method: "POST",
        body: JSON.stringify({ days }),
      })
    );

    return response;
  } catch (error) {
    console.error("[Energy Seed API] GET Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "데이터 생성 실패",
      },
      { status: 500 }
    );
  }
}
