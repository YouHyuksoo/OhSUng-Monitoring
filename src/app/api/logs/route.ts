/**
 * @file src/app/api/logs/route.ts
 * @description
 * 로그 파일 저장/조회 API
 *
 * 이 API는 시스템 로그를 서버 파일 시스템에 저장하고 조회합니다.
 *
 * 엔드포인트:
 * - GET /api/logs: 로그 파일 읽기 (날짜별 조회 가능)
 * - POST /api/logs: 로그 추가 (일별 파일에 append)
 * - DELETE /api/logs: 모든 로그 삭제
 *
 * 파일 위치: data/logs/YYYY-MM-DD.log
 * 파일 형식: JSON Lines (각 줄이 하나의 JSON 객체)
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const LOGS_DIR = path.join(DATA_DIR, "logs");

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 로그 파일 경로 생성
 */
function getLogFilePath(date?: string): string {
  const dateStr = date || formatDate(new Date());
  return path.join(LOGS_DIR, `${dateStr}.log`);
}

/**
 * GET /api/logs
 * 로그 파일 읽기
 * 쿼리 파라미터:
 * - date: YYYY-MM-DD 형식 (선택, 기본값: 오늘)
 * - days: 최근 N일 (선택, 기본값: 1)
 */
export async function GET(request: NextRequest) {
  try {
    // 로그 디렉토리 확인 및 생성
    try {
      await fs.access(LOGS_DIR);
    } catch {
      await fs.mkdir(LOGS_DIR, { recursive: true });
      return NextResponse.json([]);
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "1");
    const logs: any[] = [];

    // 최근 N일의 로그 읽기
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const logFile = getLogFilePath(formatDate(date));

      try {
        const content = await fs.readFile(logFile, "utf-8");
        const lines = content.trim().split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const log = JSON.parse(line);
            logs.push(log);
          } catch {
            // 잘못된 JSON 라인은 무시
          }
        }
      } catch {
        // 파일이 없으면 무시
      }
    }

    // 최신순으로 정렬
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to read logs:", error);
    return NextResponse.json({ error: "Failed to read logs" }, { status: 500 });
  }
}

/**
 * POST /api/logs
 * 로그 추가
 */
export async function POST(request: NextRequest) {
  try {
    const log = await request.json();

    // 로그 디렉토리 확인 및 생성
    try {
      await fs.access(LOGS_DIR);
    } catch {
      await fs.mkdir(LOGS_DIR, { recursive: true });
    }

    // 오늘 날짜의 로그 파일에 추가
    const logFile = getLogFilePath();
    const logLine = JSON.stringify(log) + "\n";

    await fs.appendFile(logFile, logLine, "utf-8");

    // 오래된 로그 정리 (비동기로 실행하여 응답 지연 방지)
    cleanupOldLogs().catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save log:", error);
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
}

/**
 * 오래된 로그 파일 정리
 * settings.json의 logRetention 값을 읽어서 처리
 */
async function cleanupOldLogs() {
  try {
    // 설정 파일 읽기
    const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
    let retentionDays = 30; // 기본값 30일

    try {
      const settingsData = await fs.readFile(SETTINGS_FILE, "utf-8");
      const settings = JSON.parse(settingsData);
      if (settings.logRetention && typeof settings.logRetention === "number") {
        retentionDays = settings.logRetention;
      }
    } catch {
      // 설정 파일이 없거나 읽기 실패 시 기본값 사용
    }

    // 로그 디렉토리 파일 목록 조회
    const files = await fs.readdir(LOGS_DIR);
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    for (const file of files) {
      // YYYY-MM-DD.log 형식 확인
      if (!/^\d{4}-\d{2}-\d{2}\.log$/.test(file)) continue;

      const dateStr = file.replace(".log", "");
      const fileDate = new Date(dateStr);

      // 날짜 파싱 유효성 검사
      if (isNaN(fileDate.getTime())) continue;

      // 경과 일수 계산
      const diffTime = now.getTime() - fileDate.getTime();
      const diffDays = Math.floor(diffTime / msPerDay);

      if (diffDays > retentionDays) {
        const filePath = path.join(LOGS_DIR, file);
        await fs.unlink(filePath);
        console.log(
          `[Log Cleanup] Deleted old log file: ${file} (Age: ${diffDays} days, Retention: ${retentionDays} days)`
        );
      }
    }
  } catch (error) {
    console.error("Failed to cleanup old logs:", error);
  }
}

/**
 * DELETE /api/logs
 * 모든 로그 삭제
 */
export async function DELETE() {
  try {
    // 로그 디렉토리 확인
    try {
      await fs.access(LOGS_DIR);
    } catch {
      return NextResponse.json({ success: true });
    }

    // 로그 디렉토리의 모든 파일 삭제
    const files = await fs.readdir(LOGS_DIR);

    for (const file of files) {
      if (file.endsWith(".log")) {
        await fs.unlink(path.join(LOGS_DIR, file));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete logs:", error);
    return NextResponse.json(
      { error: "Failed to delete logs" },
      { status: 500 }
    );
  }
}
