/**
 * @file src/app/api/data/query/route.ts
 * @description
 * 데이터 조회 API
 * - GET: 날짜 범위 및 주소 기준으로 DB에서 데이터 조회
 * - ?from=YYYY-MM-DD : 시작 날짜
 * - ?to=YYYY-MM-DD : 종료 날짜
 * - ?address=주소 : 특정 주소 필터 (선택 사항, realtime만)
 * - ?type=realtime|hourly|daily : 데이터 타입 선택 (기본값: realtime)
 *   - realtime: 실시간 센서 데이터 (timestamp, address, value, name)
 *   - hourly: 시간별 에너지 데이터 (daily_energy 테이블의 h0~h23)
 *   - daily: 일일 누적 에너지 데이터 (daily_energy 테이블의 날짜별 합계)
 *
 * 테이블 구조:
 * - realtime_data: 실시간 센서 폴링 데이터 (timestamp, address, value, name)
 * - daily_energy: 날짜별 시간대 에너지 (date + h0~h23 컬럼)
 *
 * 초보자 가이드:
 * 1. **필수 파라미터**: from, to (YYYY-MM-DD 형식)
 * 2. **선택 파라미터**: address (특정 주소만 조회, realtime만), type (기본값: realtime)
 * 3. **응답**: { data: DataPoint[], count: number, type: string }
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

/**
 * 🔤 daily_energy 테이블에서 시간별 데이터 조회 (h0~h23 피벗 구조 그대로)
 * - 피벗 구조: date (TEXT), h0-h23 (24개 시간 컬럼), last_update (timestamp)
 * - 날짜 범위 기반 조회
 * - "시간별 에너지" 조회 시 사용
 */
function getHourlyFromDailyEnergy(from: string, to: string): any[] {
  try {
    const dbPath = path.join(process.cwd(), "data", "energy.db");

    // DB 파일이 없으면 빈 배열 반환
    if (!fs.existsSync(dbPath)) {
      return [];
    }

    const db = new Database(dbPath, { readonly: true });

    try {
      // 테이블 존재 여부 확인
      const tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get("daily_energy");

      if (!tableExists) {
        return [];
      }

      // 날짜 문자열로 직접 비교 (date 컬럼은 TEXT 형식 YYYY-MM-DD)
      const query = `
        SELECT
          date,
          h0, h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11,
          h12, h13, h14, h15, h16, h17, h18, h19, h20, h21, h22, h23,
          last_update
        FROM daily_energy
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC
      `;

      const stmt = db.prepare(query);
      const results = stmt.all(from, to) as any[];

      return results;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("[API] Failed to get hourly from daily_energy:", error);
    return [];
  }
}

/**
 * 🔤 daily_energy 테이블에서 일별 합계 조회
 * - h0~h23 컬럼의 합계를 날짜별로 반환
 * - "일일 누적 에너지" 조회 시 사용
 */
function getDailySummaryData(from: string, to: string): any[] {
  try {
    const dbPath = path.join(process.cwd(), "data", "energy.db");

    // DB 파일이 없으면 빈 배열 반환
    if (!fs.existsSync(dbPath)) {
      return [];
    }

    const db = new Database(dbPath, { readonly: true });

    try {
      // 테이블 존재 여부 확인
      const tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get("daily_energy");

      if (!tableExists) {
        return [];
      }

      // 날짜별 h0~h23 합계 계산
      const query = `
        SELECT
          date,
          (COALESCE(h0,0) + COALESCE(h1,0) + COALESCE(h2,0) + COALESCE(h3,0) + 
           COALESCE(h4,0) + COALESCE(h5,0) + COALESCE(h6,0) + COALESCE(h7,0) + 
           COALESCE(h8,0) + COALESCE(h9,0) + COALESCE(h10,0) + COALESCE(h11,0) + 
           COALESCE(h12,0) + COALESCE(h13,0) + COALESCE(h14,0) + COALESCE(h15,0) + 
           COALESCE(h16,0) + COALESCE(h17,0) + COALESCE(h18,0) + COALESCE(h19,0) + 
           COALESCE(h20,0) + COALESCE(h21,0) + COALESCE(h22,0) + COALESCE(h23,0)) as total,
          last_update
        FROM daily_energy
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC
      `;

      const stmt = db.prepare(query);
      const results = stmt.all(from, to) as any[];

      return results;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("[API] Failed to get daily summary data:", error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const address = searchParams.get("address");
    const type = searchParams.get("type") || "realtime"; // 기본값: realtime

    // 필수 파라미터 검증
    if (!from || !to) {
      return NextResponse.json(
        { error: "from과 to 파라미터는 필수입니다 (YYYY-MM-DD 형식)" },
        { status: 400 }
      );
    }

    // type 파라미터 검증
    if (!["realtime", "hourly", "daily"].includes(type)) {
      return NextResponse.json(
        { error: "type은 'realtime', 'hourly' 또는 'daily'여야 합니다" },
        { status: 400 }
      );
    }

    console.log(
      `[API] Data query - from: ${from}, to: ${to}, address: ${address}, type: ${type}`
    );

    // 날짜 유효성 검증
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "유효한 날짜 형식이 아닙니다 (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // 📊 요청한 테이블에서만 데이터 조회
    let data: any[] = [];

    if (type === "realtime") {
      // realtime_data 테이블 조회 (실시간 센서 데이터)
      if (address) {
        data = realtimeDataService.getDateRangeData(from, to, address);
      } else {
        data = realtimeDataService.getDateRangeData(from, to);
      }
      console.log(`[API] Queried ${data.length} realtime data points`);
    } else if (type === "hourly") {
      // daily_energy 테이블에서 시간별 데이터 조회 (h0~h23 피벗 구조)
      data = getHourlyFromDailyEnergy(from, to);
      console.log(
        `[API] Queried ${data.length} hourly energy data points from daily_energy`
      );
    } else if (type === "daily") {
      // daily_energy 테이블에서 일별 합계 조회
      data = getDailySummaryData(from, to);
      console.log(`[API] Queried ${data.length} daily summary data points`);
    }

    return NextResponse.json({
      address: address || null,
      from,
      to,
      type,
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
