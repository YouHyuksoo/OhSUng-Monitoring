/**
 * @file src/app/api/data/query/route.ts
 * @description
 * 데이터 조회 API
 * - GET: 날짜 범위 및 주소 기준으로 DB에서 데이터 조회
 * - ?from=YYYY-MM-DD : 시작 날짜
 * - ?to=YYYY-MM-DD : 종료 날짜
 * - ?address=주소 : 특정 주소 필터 (선택 사항)
 * - ?type=realtime|hourly|daily : 데이터 타입 선택 (기본값: realtime)
 *   - realtime: 실시간 센서 데이터 (차트용)
 *   - hourly: 시간별 에너지 데이터 (표준 구조: id, date, hour, value, timestamp)
 *   - daily: 일일 누적 에너지 데이터 (피벗 구조: date, h0-h23, last_update)
 *
 * 테이블 구조:
 * - realtime_data: 실시간 센서 폴링 데이터 (timestamp, address, value, name)
 * - hourly_energy: 시간별 에너지 (표준 row-per-hour 형식)
 * - daily_energy: 일일 에너지 (date + h0-h23 컬럼, 언피벗 처리)
 *
 * 초보자 가이드:
 * 1. **필수 파라미터**: from, to (YYYY-MM-DD 형식)
 * 2. **선택 파라미터**: address (특정 주소만 조회), type (기본값: realtime)
 * 3. **응답**: { data: DataPoint[], count: number, type: string }
 */

import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

/**
 * 🔤 hourly_energy 테이블에서 데이터 조회
 * - 표준 구조: id, date, hour, value, timestamp, address
 * - 날짜 범위 기반 조회
 * - address 필터 지원
 */
function getHourlyEnergyData(
  from: string,
  to: string,
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
      // 테이블 존재 여부 확인
      const tableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get("hourly_energy");

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
          timestamp,
          address,
          value,
          NULL as name
        FROM hourly_energy
        WHERE timestamp >= ? AND timestamp <= ?
      `;
      const params: any[] = [fromTime, toTime];

      if (address) {
        query += ` AND address = ?`;
        params.push(address);
      }

      query += ` ORDER BY timestamp ASC`;

      const stmt = db.prepare(query);
      const results = stmt.all(...params) as any[];

      return results;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("[API] Failed to get hourly energy data:", error);
    return [];
  }
}

/**
 * 🔤 daily_energy 테이블에서 데이터 조회
 * - 피벗 구조: date (TEXT), h0-h23 (24개 시간 컬럼), last_update (timestamp)
 * - 테이블 형태 그대로 반환 (변형 없음)
 * - 날짜 범위 기반 조회
 */
function getDailyEnergyData(
  from: string,
  to: string,
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
      // 테이블 존재 여부 확인
      const tableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get("daily_energy");

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

      // daily_energy에서 날짜 범위에 해당하는 모든 행 조회 (그대로 반환)
      let query = `
        SELECT
          date,
          h0, h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11,
          h12, h13, h14, h15, h16, h17, h18, h19, h20, h21, h22, h23,
          last_update
        FROM daily_energy
        WHERE last_update >= ? AND last_update <= ?
        ORDER BY date ASC
      `;

      const stmt = db.prepare(query);
      const results = stmt.all(fromTime, toTime) as any[];

      return results;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("[API] Failed to get daily energy data:", error);
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
      data = getHourlyEnergyData(from, to, address);
      console.log(`[API] Queried ${data.length} hourly energy data points`);
    } else if (type === "daily") {
      // daily_energy 테이블 조회 (일일 누적 에너지 데이터 - h0-h23 피벗 구조)
      data = getDailyEnergyData(from, to, address);
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
