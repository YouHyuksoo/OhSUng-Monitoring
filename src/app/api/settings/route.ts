/**
 * @file src/app/api/settings/route.ts
 * @description
 * 설정 파일 저장/로드 API
 *
 * 이 API는 PLC 설정을 서버 파일 시스템에 저장하고 로드합니다.
 *
 * 엔드포인트:
 * - GET /api/settings: 설정 파일 읽기
 * - POST /api/settings: 설정 파일 저장
 *
 * 파일 위치: data/settings.json
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

/**
 * 기본 설정값
 */
const DEFAULT_SETTINGS = {
  plcIp: "",
  plcPort: 5000,
  pollingInterval: 2000,
  chartConfigs: [],
  startFullScreen: true,
};

/**
 * GET /api/settings
 * 설정 파일 읽기
 */
export async function GET() {
  try {
    // 데이터 디렉토리 확인 및 생성
    try {
      await fs.access(DATA_DIR);
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }

    // 설정 파일 읽기
    try {
      const data = await fs.readFile(SETTINGS_FILE, "utf-8");
      const settings = JSON.parse(data);
      return NextResponse.json(settings);
    } catch (error) {
      // 파일이 없으면 기본값 반환
      return NextResponse.json(DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error("Failed to read settings:", error);
    return NextResponse.json(
      { error: "Failed to read settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * 설정 파일 저장
 */
export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();

    // 데이터 디렉토리 확인 및 생성
    try {
      await fs.access(DATA_DIR);
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }

    // 설정 파일 저장
    await fs.writeFile(
      SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
      "utf-8"
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
