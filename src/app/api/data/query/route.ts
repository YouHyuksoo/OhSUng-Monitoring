/**
 * @file src/app/api/data/query/route.ts
 * @description
 * 데이터 조회 API
 * - GET: 날짜 범위 및 주소 기준으로 DB에서 데이터 조회
 * - ?from=YYYY-MM-DD : 시작 날짜
 * - ?to=YYYY-MM-DD : 종료 날짜
 * - ?address=주소 : 특정 주소 필터 (선택 사항)
 * - ?type=realtime|hourly : 데이터 타입 선택 (기본값: realtime)
 *   - realtime: 실시간 센서 데이터 (차트용)
 *   - hourly: 시간별 누적 에너지 데이터 (리포트용)
 *
 * 초보자 가이드:
 * 1. **필수 파라미터**: from, to (YYYY-MM-DD 형식)
 * 2. **선택 파라미터**: address (특정 주소만 조회), type (기본값: realtime)
 * 3. **응답**: { data: DataPoint[], count: number }
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

/**
 * 🔤 hourly_energy 또는 daily_energy 테이블에서 데이터 조회
 * - 날짜 범위 기반 조회
 * - address 필터 지원
 */
function getEnergyData(
  from: string,
  to: string,
  tableType: "hourly" | "daily",
  address?: string | null
): any[] {
  try {
    const dbPath = path.join(process.cwd(), "data", "energy.db");

    // DB 파일이 없으면 빈 배열 반환
    if (!fs.existsSync(dbPath)) {
      return [];
    }

    const db = new Database(dbPath, { readonly: true });

    try {
      // 테이블명 결정
      const tableName = tableType === "daily" ? "daily_energy" : "hourly_energy";
      const timeColumn = tableType === "daily" ? "last_update" : "timestamp";

      // 테이블 존재 여부 확인
      const tableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);

      if (!tableExists) {
        return [];
      }

      // 날짜를 타임스탐프로 변환
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      const fromTime = fromDate.getTime();

      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      const toTime = toDate.getTime();

      let query = `
        SELECT
          ${timeColumn} as timestamp,
          address,
          value,
          NULL as name
        FROM ${tableName}
        WHERE ${timeColumn} >= ? AND ${timeColumn} <= ?
      `;
      const params: any[] = [fromTime, toTime];

      if (address) {
        query += ` AND address = ?`;
        params.push(address);
      }

      query += ` ORDER BY ${timeColumn} ASC`;

      const stmt = db.prepare(query);
      const results = stmt.all(...params) as any[];

      return results;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("[API] Failed to get energy data:", error);
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
      // hourly_energy 테이블 조회 (시간별 에너지 데이터)
      data = getEnergyData(from, to, "hourly", address);
      console.log(`[API] Queried ${data.length} hourly energy data points`);
    } else if (type === "daily") {
      // daily_energy 테이블 조회 (일일 누적 에너지 데이터)
      data = getEnergyData(from, to, "daily", address);
      console.log(`[API] Queried ${data.length} daily energy data points`);
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
