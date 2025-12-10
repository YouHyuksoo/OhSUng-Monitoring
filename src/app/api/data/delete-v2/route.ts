import { NextResponse } from "next/server";
import { realtimeDataService } from "@/lib/realtime-data-service";
import { hourlyEnergyService } from "@/lib/hourly-energy-service";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const address = searchParams.get("address");
    const type = searchParams.get("type"); // realtime, hourly, daily

    // 필수 파라미터 검증
    if (!from || !to) {
      return NextResponse.json(
        { error: "from과 to 파라미터는 필수입니다 (YYYY-MM-DD 형식)" },
        { status: 400 }
      );
    }

    console.log(
      `[API] Data delete-v2 request - from: ${from}, to: ${to}, address: ${address}, type: ${type}`
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

    // 데이터 삭제 실행
    let deletedCount = 0;

    if (type === "daily" || type === "hourly") {
      // hourly/daily 모두 daily_energy 테이블에서 삭제
      // (hourly는 시간별 데이터, daily는 일별 합계 - 둘 다 같은 테이블)
      deletedCount = hourlyEnergyService.deleteDailyData(from, to);
    } else {
      // 실시간 센서 데이터 삭제 (RealtimeDataService) - 기본값
      deletedCount = realtimeDataService.deleteDataByDateRange(
        from,
        to,
        address
      );
    }

    console.log(
      `[API] Deleted ${deletedCount} data points (${
        type || "realtime"
      }) from ${from} to ${to}${address ? ` for address ${address}` : ""}`
    );

    return NextResponse.json({
      success: true,
      deletedCount,
      from,
      to,
      address: address || null,
      type: type || "realtime",
      message: `${deletedCount}개의 데이터(${
        type || "realtime"
      })를 삭제했습니다.`,
    });
  } catch (error) {
    console.error("[API] Failed to delete data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "데이터 삭제 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
