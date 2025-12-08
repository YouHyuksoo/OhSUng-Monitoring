/**
 * @file src/app/api/db/reset/route.ts
 * @description
 * 데이터베이스 완전 초기화 API 엔드포인트
 * - hourly_energy 테이블의 모든 데이터 삭제
 * - 선택적으로 테스트 데이터 재생성
 *
 * 사용법:
 * POST /api/db/reset
 * - 기본: 데이터베이스 초기화만 수행
 * - body: { seedData: true, days: 30 } - 30일 테스트 데이터 생성
 */

import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { hourlyEnergyService } from "@/lib/hourly-energy-service";

// 동적 라우트 (빌드 시 프리-렌더링하지 않음)
export const dynamic = "force-dynamic";

/**
 * 데이터베이스 연결 및 초기화
 */
async function resetDatabase(seedData: boolean = false, days: number = 30) {
  try {
    const dbPath = path.join(process.cwd(), "data", "energy.db");

    // 데이터베이스 파일 존재 확인 및 테이블 확인
    try {
      const db = new Database(dbPath);

      // 기존 테이블 데이터 삭제
      const deleteStmt = db.prepare("DELETE FROM hourly_energy");
      const result = deleteStmt.run();

      console.log(
        `[DB Reset] Deleted ${result.changes} rows from hourly_energy`
      );

      db.close();
    } catch (error) {
      console.error("[DB Reset] Error during cleanup:", error);
      throw error;
    }

    // 테스트 데이터 생성 (선택사항)
    if (seedData) {
      console.log(`[DB Reset] Seeding test data for ${days} days...`);

      for (let daysAgo = days - 1; daysAgo >= 0; daysAgo--) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const dateStr = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        hourlyEnergyService.insertTestData(dateStr);
      }
    }

    return {
      success: true,
      message: seedData
        ? `데이터베이스가 초기화되고 ${days}일치 테스트 데이터가 생성되었습니다.`
        : "데이터베이스가 완전히 초기화되었습니다.",
      seedData,
      days: seedData ? days : 0,
    };
  } catch (error) {
    console.error("[DB Reset] Error:", error);
    throw error;
  }
}

/**
 * POST: 데이터베이스 초기화
 * 요청 본문:
 * {
 *   seedData?: boolean,  // 테스트 데이터 생성 여부 (기본값: false)
 *   days?: number        // 생성할 테스트 데이터 일수 (기본값: 30)
 * }
 */
export async function POST(request: Request) {
  try {
    let seedData = false;
    let days = 30;

    // 요청 본문이 있으면 파싱
    try {
      const body = await request.json();
      if (body.seedData !== undefined) seedData = body.seedData;
      if (body.days !== undefined) days = body.days;
    } catch {
      // 본문이 없거나 파싱 실패 시 기본값 사용
    }

    // 유효성 검증
    if (days < 0 || days > 365) {
      return NextResponse.json(
        { error: "days는 0~365 사이여야 합니다" },
        { status: 400 }
      );
    }

    const result = await resetDatabase(seedData, days);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[DB Reset API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "데이터베이스 초기화 실패",
      },
      { status: 500 }
    );
  }
}

/**
 * GET: 데이터베이스 초기화 (쿼리 파라미터 지원)
 * 쿼리 파라미터:
 * - seedData=true  : 테스트 데이터 생성 (기본값: false)
 * - days=30        : 생성할 일수 (기본값: 30)
 *
 * 예시:
 * GET /api/db/reset
 * GET /api/db/reset?seedData=true
 * GET /api/db/reset?seedData=true&days=60
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seedData = searchParams.get("seedData") === "true";
    const days = parseInt(searchParams.get("days") || "30");

    if (days < 0 || days > 365) {
      return NextResponse.json(
        { error: "days는 0~365 사이여야 합니다" },
        { status: 400 }
      );
    }

    const result = await resetDatabase(seedData, days);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[DB Reset API] GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "데이터베이스 초기화 실패",
      },
      { status: 500 }
    );
  }
}
