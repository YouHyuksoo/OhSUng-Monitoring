/**
 * @file src/app/api/data/debug/route.ts
 * @description
 * 디버깅용 API - daily_energy 테이블 구조 및 데이터 확인
 */

import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const dbPath = path.join(process.cwd(), "data", "energy.db");

    // DB 파일 존재 확인
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: "DB file not found", path: dbPath });
    }

    const db = new Database(dbPath, { readonly: true });

    try {
      // 테이블 목록 확인
      const tables = db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
        )
        .all();

      // daily_energy 테이블 샘플 데이터
      let dailyEnergySample: any[] = [];
      let dailyEnergyCount = 0;

      const tableExists = tables.some((t: any) => t.name === "daily_energy");

      if (tableExists) {
        dailyEnergySample = db
          .prepare(
            `SELECT date, last_update FROM daily_energy ORDER BY date DESC LIMIT 10`
          )
          .all();

        const countResult = db
          .prepare(`SELECT count(*) as count FROM daily_energy`)
          .get() as { count: number };
        dailyEnergyCount = countResult.count;
      }

      return NextResponse.json({
        dbPath,
        tables,
        dailyEnergyCount,
        dailyEnergySample,
        note: "last_update is a Unix timestamp in milliseconds",
      });
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("[Debug API] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
