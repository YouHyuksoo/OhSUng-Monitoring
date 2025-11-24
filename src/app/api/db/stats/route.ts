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
  try {
    const dbPath = path.join(process.cwd(), "data", "energy.db");

    // DB 파일 정보
    let fileSize = 0;
    let fileExists = false;

    try {
      const stats = fs.statSync(dbPath);
      fileSize = stats.size;
      fileExists = true;
    } catch (e) {
      // DB 파일이 없으면 0으로 처리
      fileSize = 0;
      fileExists = false;
    }

    // DB 접속하여 데이터 행 수 조회
    let realtimeCount = 0;
    let hourlyCount = 0;
    let oldestRealtimeData: string | null = null;
    let newestRealtimeData: string | null = null;
    let oldestHourlyData: string | null = null;
    let newestHourlyData: string | null = null;

    if (fileExists) {
      try {
        const db = new Database(dbPath, { readonly: true });

        // realtime_data 테이블 통계
        const realtimeStmt = db.prepare(
          "SELECT COUNT(*) as count FROM realtime_data"
        );
        const realtimeResult = realtimeStmt.get() as { count: number };
        realtimeCount = realtimeResult?.count || 0;

        // 가장 오래된/최신 데이터 시간
        const realtimeTimeStmt = db.prepare(
          `SELECT
            MIN(timestamp) as oldest,
            MAX(timestamp) as newest
           FROM realtime_data`
        );
        const realtimeTimeResult = realtimeTimeStmt.get() as {
          oldest: number | null;
          newest: number | null;
        };
        if (realtimeTimeResult?.oldest) {
          oldestRealtimeData = new Date(realtimeTimeResult.oldest).toISOString();
        }
        if (realtimeTimeResult?.newest) {
          newestRealtimeData = new Date(realtimeTimeResult.newest).toISOString();
        }

        // hourly_energy 테이블 통계
        const hourlyStmt = db.prepare(
          "SELECT COUNT(*) as count FROM hourly_energy"
        );
        const hourlyResult = hourlyStmt.get() as { count: number };
        hourlyCount = hourlyResult?.count || 0;

        // 가장 오래된/최신 데이터 시간
        const hourlyTimeStmt = db.prepare(
          `SELECT
            MIN(timestamp) as oldest,
            MAX(timestamp) as newest
           FROM hourly_energy`
        );
        const hourlyTimeResult = hourlyTimeStmt.get() as {
          oldest: number | null;
          newest: number | null;
        };
        if (hourlyTimeResult?.oldest) {
          oldestHourlyData = new Date(hourlyTimeResult.oldest).toISOString();
        }
        if (hourlyTimeResult?.newest) {
          newestHourlyData = new Date(hourlyTimeResult.newest).toISOString();
        }

        db.close();
      } catch (e) {
        console.error("Failed to query database:", e);
      }
    }

    return NextResponse.json({
      database: {
        filePath: dbPath,
        fileExists,
        fileSizeBytes: fileSize,
        fileSizeMB: (fileSize / 1024 / 1024).toFixed(2),
      },
      tables: {
        realtime_data: {
          rowCount: realtimeCount,
          oldestData: oldestRealtimeData,
          newestData: newestRealtimeData,
        },
        hourly_energy: {
          rowCount: hourlyCount,
          oldestData: oldestHourlyData,
          newestData: newestHourlyData,
        },
      },
      totalRows: realtimeCount + hourlyCount,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[API] Failed to get DB stats:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get DB stats",
      },
      { status: 500 }
    );
  }
}
