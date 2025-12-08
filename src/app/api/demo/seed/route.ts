/**
 * @file src/app/api/demo/seed/route.ts
 * @description
 * 데모 모드 테스트용 가상 데이터 생성 API
 * - 데이터베이스에 지난 1시간의 랜덤 데이터를 삽입
 * - 각 주소별로 20개의 데이터 포인트 생성
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";

// 동적 라우트 (빌드 시 프리-렌더링하지 않음)
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { addresses = [] } = body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: "addresses 배열이 필요합니다" },
        { status: 400 }
      );
    }

    /**
     * 가상 데이터 생성 함수
     * - 주소별로 1시간치 데이터 (3분 간격, 20개 포인트)
     * - 온도 데이터: 35~45°C 범위
     * - 전력 데이터: 14000~16000 Wh 범위
     */
    const generateMockData = (address: string) => {
      const now = Date.now();
      const points = [];

      // 과거 1시간부터 현재까지 3분 간격으로 20개 데이터 생성
      for (let i = 0; i < 20; i++) {
        const timestamp = now - (20 - i) * 3 * 60 * 1000; // 3분 간격

        let value: number;

        // 주소별로 다른 범위의 데이터 생성
        if (address.includes("D40") || address.includes("D41")) {
          // 온도 데이터 (D400~D470): 35~45°C
          value = 35 + Math.random() * 10;
          value = Math.round(value * 10) / 10;
        } else if (address === "D4032") {
          // 전력 데이터 (D4032): 14000~16000 Wh
          value = 14000 + Math.random() * 2000;
          value = Math.round(value);
        } else {
          // 기타 데이터: 0~100
          value = Math.random() * 100;
          value = Math.round(value * 10) / 10;
        }

        points.push({
          timestamp,
          address,
          value,
        });
      }

      return points;
    };

    /**
     * 각 주소별로 데이터 생성 및 저장
     */
    let allPoints: { timestamp: number; address: string; value: number }[] = [];

    for (const address of addresses) {
      const mockData = generateMockData(address);
      allPoints = allPoints.concat(mockData);
    }

    // DB에 저장
    realtimeDataService.insertTestData(allPoints);

    return NextResponse.json({
      success: true,
      message: `${addresses.length}개 주소에 ${allPoints.length}개 가상 데이터 생성 완료`,
      addresses,
      dataPoints: allPoints.length,
    });
  } catch (error) {
    console.error("[Demo Seed API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "데이터 생성 실패",
      },
      { status: 500 }
    );
  }
}

/**
 * GET 요청: 가상 데이터 생성
 * 쿼리 파라미터: addresses=D4032,D400,D410,...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const addressesStr = searchParams.get("addresses");

    if (!addressesStr) {
      return NextResponse.json(
        { error: "addresses 파라미터가 필요합니다 (쉼표로 구분)" },
        { status: 400 }
      );
    }

    const addresses = addressesStr.split(",").filter((a) => a.trim());

    // POST 로직 재사용
    const response = await POST(
      new Request(request.url, {
        method: "POST",
        body: JSON.stringify({ addresses }),
      })
    );

    return response;
  } catch (error) {
    console.error("[Demo Seed API] GET Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "데이터 생성 실패",
      },
      { status: 500 }
    );
  }
}
