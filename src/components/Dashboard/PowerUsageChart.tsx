/**
 * @file src/components/Dashboard/PowerUsageChart.tsx
 * @description
 * 누적 전력량 차트 컴포넌트 (Chart.js 기반)
 * D6100 주소의 일일 누적 전력량(Wh)을 시간별, 일별로 표시합니다.
 *
 * 주요 기능:
 * - 시간대별 차트: 당일 0~23시 누적 에너지 (Wh)
 * - 일별 차트: 지난 30일 일일 누적 에너지 (Wh)
 * - 총계 카드: 당일, 주간, 월간 누적량 (SQL SUM으로 계산)
 * - 그라디언트 효과로 화려한 비주얼
 *
 * 초보자 가이드:
 * 1. **요약 API**: /api/energy/hourly?summary=true (당일/주간/월간 + 일별 합계)
 * 2. **오늘 시간별**: /api/energy/hourly (시간별 배열)
 * 3. **모든 계산은 서버에서 SQL로 처리** (클라이언트 부하 최소화)
 */

"use client";

import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { useTheme } from "@/components/theme-provider";
import { useSettings } from "@/lib/useSettings";

// Chart.js 플러그인 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * 요약 API 응답 형식 (SQL SUM 결과)
 */
interface EnergySummaryResponse {
  today: number;
  weekly: number;
  monthly: number;
  dailyTotals: { date: string; total: number }[];
}

/**
 * 오늘 시간별 데이터 응답
 */
interface TodayDataResponse {
  date: string;
  hours: number[];
  lastUpdate: number;
}

/**
 * 전력 사용 현황 차트 Props
 */
interface PowerUsageChartProps {
  isPollingActive?: boolean; // 폴링 활성화 상태 (주기적 갱신 여부)
}

export function PowerUsageChart({ isPollingActive = false }: PowerUsageChartProps) {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totals, setTotals] = useState({
    today: 0,
    weekly: 0,
    monthly: 0,
  });
  const [mounted, setMounted] = useState(false);

  /**
   * 에너지 데이터 조회 함수
   * - 요약 API: 당일/주간/월간 합계 + 일별 합계 (SQL SUM)
   * - 오늘 API: 시간별 데이터
   */
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 두 API 병렬 호출
      const [summaryRes, todayRes] = await Promise.all([
        fetch("/api/energy/hourly?summary=true"),
        fetch("/api/energy/hourly"),
      ]);

      console.log(`[PowerUsageChart] 📍 API responses - summary: ${summaryRes.status}, today: ${todayRes.status}`);

      // 1. 요약 데이터 처리 (당일/주간/월간 + 일별 합계)
      if (summaryRes.ok) {
        const summaryData =
          (await summaryRes.json()) as EnergySummaryResponse;

        console.log(`[PowerUsageChart] 📊 Summary data:`, summaryData);

        // 총계 업데이트
        setTotals({
          today: summaryData.today,
          weekly: summaryData.weekly,
          monthly: summaryData.monthly,
        });

        // 일별 차트 데이터 변환
        const dailyChartData = summaryData.dailyTotals.map((item) => {
          const date = new Date(item.date);
          return {
            day: `${date.getMonth() + 1}/${date.getDate()}`,
            value: item.total,
          };
        });
        setDailyData(dailyChartData);
      } else {
        console.error(`[PowerUsageChart] ❌ Summary API failed: ${summaryRes.status}`);
      }

      // 2. 오늘 시간별 데이터 처리
      if (todayRes.ok) {
        const todayData = (await todayRes.json()) as TodayDataResponse;

        console.log(`[PowerUsageChart] 📊 Today data:`, todayData);

        // 시간별 차트 데이터 변환 (0~23시)
        const hourlyChartData = [];
        for (let hour = 0; hour < 24; hour++) {
          const value = todayData.hours?.[hour] || 0;
          hourlyChartData.push({
            hour: `${hour}시`,
            value,
          });
        }
        setHourlyData(hourlyChartData);
      } else {
        console.error(`[PowerUsageChart] ❌ Today API failed: ${todayRes.status}`);
      }
    } catch (error) {
      console.error("[PowerUsageChart] ❌ Failed to fetch energy data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 클라이언트 마운트 확인
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 초기 데이터 로드 (페이지 진입 시 1회)
   */
  useEffect(() => {
    console.log(`[PowerUsageChart] ⚡ Loading energy data...`);
    fetchData();
  }, []);

  /**
   * 주기적인 데이터 갱신 (10초마다)
   * - mounted 상태 확인 후 주기적으로 에너지 데이터 조회
   * - monitoringRefreshInterval: 모니터링 화면에서 DB 데이터를 조회하는 주기 (기본값: 10초)
   * - 프로덕션 빌드에서도 안정적으로 작동하도록 개선
   */
  useEffect(() => {
    // 클라이언트 마운트 확인 (SSR 방지)
    if (!mounted) {
      return;
    }

    const refreshInterval = settings?.monitoringRefreshInterval || 10000;

    let isActive = true;
    let refreshIntervalId: NodeJS.Timeout | null = null;

    const startRefreshing = () => {
      refreshIntervalId = setInterval(() => {
        if (isActive) {
          fetchData();
        }
      }, refreshInterval);
    };

    // 정기적 갱신 시작
    startRefreshing();

    // 정리: 컴포넌트 언마운트 시
    return () => {
      isActive = false;
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
      }
    };
  }, [mounted, settings?.monitoringRefreshInterval]);

  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const textColor = isDark ? "#e5e7eb" : "#374151";

  /**
   * 그라디언트 생성 함수
   */
  const createGradient = (
    ctx: CanvasRenderingContext2D,
    chartArea: any,
    color: string
  ) => {
    const gradient = ctx.createLinearGradient(
      0,
      chartArea.top,
      0,
      chartArea.bottom
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + "80"); // 50% 투명도
    return gradient;
  };

  /**
   * 시간별 차트 데이터
   */
  const hourlyChartData = {
    labels: hourlyData.map((d) => d.hour),
    datasets: [
      {
        label: "시간별 에너지 (kWh)",
        data: hourlyData.map((d) => d.value / 1000),
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return "#ef4444";
          return createGradient(ctx, chartArea, "#ef4444");
        },
        borderColor: "#ef4444",
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  /**
   * 일별 차트 데이터
   */
  const dailyChartData = {
    labels: dailyData.map((d) => d.day),
    datasets: [
      {
        label: "일별 에너지 (kWh)",
        data: dailyData.map((d) => d.value / 1000),
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return "#3b82f6";
          return createGradient(ctx, chartArea, "#3b82f6");
        },
        borderColor: "#3b82f6",
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  /**
   * Chart.js 공통 옵션
   */
  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark
          ? "rgba(0, 0, 0, 0.8)"
          : "rgba(255, 255, 255, 0.9)",
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: isDark ? "#333" : "#e5e7eb",
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            // null 체크: 데이터가 없거나 유효하지 않을 경우 안전하게 처리
            if (context.parsed.y === null || context.parsed.y === undefined) {
              return "0.0 kWh";
            }
            return `${context.parsed.y.toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })} kWh`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: gridColor,
          display: false,
        },
        ticks: {
          color: textColor,
          font: {
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: gridColor,
          display: true,
        },
        ticks: {
          color: textColor,
          font: {
            size: 10,
          },
        },
      },
    },
  };

  // 로딩 중 상태
  if (isLoading && hourlyData.length === 0 && dailyData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">데이터 로드 중...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 총계 카드 */}
      <div className="grid grid-cols-3 gap-2 flex-none">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white dark:from-blue-900 dark:to-blue-950">
          <div className="text-xs opacity-90 mb-1">당일 누적</div>
          <div className="text-lg font-bold">
            {(totals.today / 1000).toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}
            kWh
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white dark:from-green-900 dark:to-green-950">
          <div className="text-xs opacity-90 mb-1">주간 누적</div>
          <div className="text-lg font-bold">
            {(totals.weekly / 1000).toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}
            kWh
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white dark:from-purple-900 dark:to-purple-950">
          <div className="text-xs opacity-90 mb-1">월간 누적</div>
          <div className="text-lg font-bold">
            {(totals.monthly / 1000).toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}
            kWh
          </div>
        </div>
      </div>

      {/* 차트 영역 컨테이너 */}
      <div className="flex-1 min-h-0 flex flex-col gap-2">
        {/* 시간대별 누적 에너지 차트 (0~23시) */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h3 className="text-xs font-semibold text-muted-foreground mb-1 flex-none">
            시간별 누적 에너지 (0~23시)
          </h3>
          <div className="flex-1 min-h-0">
            <Bar data={hourlyChartData} options={chartOptions} />
          </div>
        </div>

        {/* 일별 누적 에너지 차트 (30일) */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h3 className="text-xs font-semibold text-muted-foreground mb-1 flex-none">
            일별 누적 에너지 (30일)
          </h3>
          <div className="flex-1 min-h-0">
            <Bar data={dailyChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
