/**
 * @file src/app/api/db/stats/route.ts
 * @description
 * 데이터베이스 통계 및 정보 조회 API
 * - GET: DB 파일 크기, 데이터 행 수, 저장소 상태 조회
 */

import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export async function GET(request: Request) {
  const dbPath = path.join(process.cwd(), "data", "energy.db");

  // 1. DB 파일이 없는 경우 (정상적인 초기 상태)
  if (!fs.existsSync(dbPath)) {
    return NextResponse.json({
      database: {
        filePath: dbPath,
        fileExists: false,
        fileSizeBytes: 0,
        fileSizeMB: "0.00",
      },
      tables: {
        realtime_data: {
          rowCount: 0,
          oldestData: null,
          newestData: null,
        },
        hourly_energy: {
          rowCount: 0,
          oldestData: null,
          newestData: null,
        },
      },
      totalRows: 0,
      timestamp: Date.now(),
    });
  }

  // 2. DB 파일이 있는 경우
  // 여기서 발생하는 에러(권한 문제, 파일 손상 등)는 숨기지 않고 500 에러로 처리됨
  const fileStats = fs.statSync(dbPath);
  const db = new Database(dbPath, { readonly: true });

  try {
    // 테이블 존재 여부 확인 헬퍼
    const checkTableExists = (tableName: string) => {
      const stmt = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      );
      return !!stmt.get(tableName);
    };

    // realtime_data 통계
    let realtimeStats = {
      rowCount: 0,
      oldestData: null as string | null,
      newestData: null as string | null,
    };

    if (checkTableExists("realtime_data")) {
      const countResult = db
        .prepare("SELECT COUNT(*) as count FROM realtime_data")
        .get() as { count: number };
      realtimeStats.rowCount = countResult.count;

      const timeResult = db
        .prepare(
          "SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM realtime_data"
        )
        .get() as { oldest: number; newest: number };

      if (timeResult.oldest) {
        realtimeStats.oldestData = new Date(timeResult.oldest).toISOString();
      }
      if (timeResult.newest) {
        realtimeStats.newestData = new Date(timeResult.newest).toISOString();
      }
    }

    // hourly_energy (또는 daily_energy) 통계
    let hourlyStats = {
      rowCount: 0,
      oldestData: null as string | null,
      newestData: null as string | null,
    };

    if (checkTableExists("daily_energy")) {
      // 신규 테이블 구조
      const countResult = db
        .prepare("SELECT COUNT(*) as count FROM daily_energy")
        .get() as { count: number };
      hourlyStats.rowCount = countResult.count;

      const timeResult = db
        .prepare(
          "SELECT MIN(last_update) as oldest, MAX(last_update) as newest FROM daily_energy"
        )
        .get() as { oldest: number; newest: number };

      if (timeResult.oldest) {
        hourlyStats.oldestData = new Date(timeResult.oldest).toISOString();
      }
      if (timeResult.newest) {
        hourlyStats.newestData = new Date(timeResult.newest).toISOString();
      }
    } else if (checkTableExists("hourly_energy")) {
      // 기존 테이블 구조 (호환성)
      const countResult = db
        .prepare("SELECT COUNT(*) as count FROM hourly_energy")
        .get() as { count: number };
      hourlyStats.rowCount = countResult.count;

      const timeResult = db
        .prepare(
          "SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM hourly_energy"
        )
        .get() as { oldest: number; newest: number };

      if (timeResult.oldest) {
        hourlyStats.oldestData = new Date(timeResult.oldest).toISOString();
      }
      if (timeResult.newest) {
        hourlyStats.newestData = new Date(timeResult.newest).toISOString();
      }
    }

    return NextResponse.json({
      database: {
        filePath: dbPath,
        fileExists: true,
        fileSizeBytes: fileStats.size,
        fileSizeMB: (fileStats.size / 1024 / 1024).toFixed(2),
      },
      tables: {
        realtime_data: realtimeStats,
        hourly_energy: hourlyStats,
      },
      totalRows: realtimeStats.rowCount + hourlyStats.rowCount,
      timestamp: Date.now(),
    });
  } finally {
    // DB 연결은 반드시 닫아줌
    db.close();
  }
}
