/**
 * @file src/app/api/energy/hourly/route.ts
 * @description
 * 시간별 누적 전력량 API (SQLite)
 * - GET: 오늘의 시간별 전력량 조회 (또는 ?date=YYYY-MM-DD로 특정 날짜 조회)
 * - POST: 폴링 시작
 */

import { NextResponse } from "next/server";
import { hourlyEnergyService } from "@/lib/hourly-energy-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD 형식

    let data;
    if (date) {
      // 특정 날짜 데이터 조회
      data = hourlyEnergyService.getDayData(date);
    } else {
      // 오늘 데이터 조회
      data = hourlyEnergyService.getCurrentData();
    }

    if (!data) {
      return NextResponse.json(
        { error: "No data available" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to get hourly energy data:", error);
    return NextResponse.json(
      { error: "Failed to retrieve data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ip, port, demo } = body;

    if (!ip || !port) {
      return NextResponse.json(
        { error: "IP and Port required" },
        { status: 400 }
      );
    }

    // 폴링 시작
    hourlyEnergyService.startHourlyPolling(ip, parseInt(port), demo === true);

    return NextResponse.json({
      success: true,
      message: "Hourly polling started",
      ip,
      port
    });
  } catch (error) {
    console.error("Failed to start hourly polling:", error);
    return NextResponse.json(
      { error: "Failed to start polling" },
      { status: 500 }
    );
  }
}
