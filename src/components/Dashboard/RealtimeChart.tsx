/**
 * @file src/components/Dashboard/RealtimeChart.tsx
 * @description
 * 실시간 차트 컴포넌트 (Chart.js 기반)
 * SQLite DB에서 실시간 센서 데이터를 주기적으로 조회하여 차트에 표시합니다.
 *
 * 주요 기능:
 * - DB에서 최근 20개 데이터 포인트 조회 및 표시
 * - 알람 임계값 체크 및 시각적 피드백
 * - 붉은색 외곽선 애니메이션 (알람 발생 시)
 * - 설정값과 측정값 동시 표시
 * - 10초마다 DB 데이터 갱신
 * - 참고 이미지처럼 그라디언트 채우기 효과
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { Maximize2 } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { logger } from "@/lib/logger";
import { useSettings } from "@/lib/useSettings";

// Chart.js 플러그인 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DataPoint {
  time: string;
  current: number;
  set: number;
}

/**
 * 실시간 차트 Props
 * DB에서 조회할 데이터 주소와 표시 설정
 */
interface RealtimeChartProps {
  address: string; // 측정값 주소 (예: D4032)
  setAddress?: string; // 설정값 주소 (온도 차트에만 사용)
  title: string; // 차트 제목
  color?: string; // 라인 색상
  unit?: string; // 단위 (°C, W 등)
  minThreshold?: number; // 최소 알람 임계값
  maxThreshold?: number; // 최대 알람 임계값
  bordered?: boolean; // 테두리 표시 여부
  yMin?: number | "auto"; // Y축 최소값
  yMax?: number | "auto"; // Y축 최대값
  dataLimit?: number; // 표시할 데이터 개수 (개수 기준)
  dataHours?: number; // 표시할 데이터 시간 범위 (시간 기준)
  onMaximize?: () => void; // 크게보기 콜백 함수 (선택적)
  isPollingActive?: boolean; // 폴링 활성화 상태 (주기적 갱신 여부)
}

export function RealtimeChart({
  address,
  setAddress,
  title,
  color = "#8884d8",
  unit = "",
  minThreshold,
  maxThreshold,
  bordered = false,
  yMin = "auto",
  yMax = "auto",
  dataLimit,
  dataHours,
  onMaximize,
  isPollingActive = false,
}: RealtimeChartProps) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<DataPoint[]>([]);
  const [isAlarm, setIsAlarm] = useState(false);
  const { theme } = useTheme();
  const { settings } = useSettings();
  const chartRef = useRef<ChartJS<"line">>(null);

  /**
   * 클라이언트 마운트 확인
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * DB에서 실시간 데이터 조회 함수
   * - dataHours 우선: N시간 범위 데이터 조회
   * - dataLimit: 최근 N개 데이터 조회
   */
  const fetchDataFromDB = async () => {
    try {
      const controller = new AbortController();

      // DB에서 데이터 조회 (hours 우선, 없으면 limit 사용)
      let url = `/api/realtime/data?address=${address}`;

      if (dataHours !== undefined) {
        // 시간 범위로 조회 (전력량 차트)
        url += `&hours=${dataHours}`;
      } else if (dataLimit !== undefined) {
        // 개수로 조회 (온도 차트)
        url += `&limit=${dataLimit}`;
      }

      if (setAddress) {
        url += `&setAddress=${setAddress}`;
      }

      console.log(`[RealtimeChart] 🔄 Fetching from: ${url}`);

      const res = await fetch(url, { signal: controller.signal });

      console.log(`[RealtimeChart] 📍 Response status: ${res.status}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP Error: ${res.status}`);
      }

      const json = await res.json();

      console.log(`[RealtimeChart] 📊 Data received:`, json);

      // 필수 데이터 검증
      if (!json || !Array.isArray(json.data)) {
        throw new Error(`Invalid data received for address ${address}`);
      }

      // 데이터 변환 (DB 포인트 → 차트 포인트)
      const chartData: DataPoint[] = json.data.map(
        (point: {
          timestamp: number;
          value: number;
          setAddress?: number;
        }) => {
          const date = new Date(point.timestamp);
          const timeStr = `${date.getHours()}:${date
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${date
            .getSeconds()
            .toString()
            .padStart(2, "0")}`;

          return {
            time: timeStr,
            current: point.value,
            set: point.setAddress ?? point.value,
          };
        }
      );

      console.log(`[RealtimeChart] ✅ Chart data processed: ${chartData.length} points`);

      // 데이터 업데이트
      setData(chartData);

      // 최신 값으로 알람 체크
      if (chartData.length > 0) {
        const latestPoint = chartData[chartData.length - 1];
        if (minThreshold !== undefined && maxThreshold !== undefined) {
          setIsAlarm(
            latestPoint.current < minThreshold ||
              latestPoint.current > maxThreshold
          );
        }
      }
    } catch (error) {
      console.error(`[RealtimeChart] ❌ Failed to fetch data for address ${address}:`, error);
      logger.error(`DB 데이터 조회 실패: ${address}`, "RealtimeChart", error);
    }
  };

  /**
   * 초기 데이터 로드 (페이지 진입 시 1회)
   * - address가 변경될 때마다 새로운 차트 데이터 로드
   */
  useEffect(() => {
    console.log(`[RealtimeChart] 📊 Loading data for address: ${address}, setAddress: ${setAddress}`);
    fetchDataFromDB();
  }, [address, setAddress]);

  /**
   * 주기적인 데이터 갱신 (10초마다)
   * - mounted 상태 확인 후 주기적으로 DB 데이터 조회
   * - monitoringRefreshInterval: 모니터링 화면에서 DB 데이터를 조회하는 주기 (기본값: 10초)
   * - 프로덕션 빌드에서도 안정적으로 작동하도록 개선
   */
  useEffect(() => {
    // 클라이언트 마운트 확인 (SSR 방지)
    if (!mounted) {
      return;
    }

    // 모니터링 갱신 주기 (settings에서 관리, 기본값 10000ms)
    const refreshInterval = settings?.monitoringRefreshInterval || 10000;

    let isActive = true;
    let refreshIntervalId: NodeJS.Timeout | null = null;

    const startRefreshing = () => {
      refreshIntervalId = setInterval(() => {
        if (isActive) {
          fetchDataFromDB();
        }
      }, refreshInterval);
    };

    // 초기 로드
    fetchDataFromDB();

    // 정기적 갱신 시작
    startRefreshing();

    // 정리: 컴포넌트 언마운트 시
    return () => {
      isActive = false;
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
      }
    };
  }, [address, setAddress, mounted, settings?.monitoringRefreshInterval]);

  const currentValue = data.length > 0 ? data[data.length - 1].current : 0;
  const setValue = data.length > 0 ? data[data.length - 1].set : 0;

  /**
   * 테두리 스타일 계산
   * - 알람 상태: 빨간색 테두리 + 애니메이션
   * - 정상 상태: 기본 테두리
   */
  const borderClass = isAlarm
    ? "border-2 border-red-500 animate-pulse-border"
    : bordered
    ? "border border-border"
    : "";

  /**
   * 테마에 따른 색상 설정
   */
  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const textColor = isDark ? "#e5e7eb" : "#374151";

  /**
   * 그라디언트 생성 함수
   * 참고 이미지처럼 선 아래에 그라디언트 채우기 효과
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
    gradient.addColorStop(0, color + "99"); // 60% 투명도
    gradient.addColorStop(1, color + "0D"); // 5% 투명도
    return gradient;
  };

  /**
   * Chart.js 데이터 설정
   */
  const chartData = {
    labels: data.map((d) => d.time),
    datasets: [
      {
        label: `측정값 (${unit})`,
        data: data.map((d) => d.current),
        borderColor: isAlarm ? "#ef4444" : color,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return color + "33";
          return createGradient(ctx, chartArea, isAlarm ? "#ef4444" : color);
        },
        borderWidth: isAlarm ? 3 : 2.5,
        fill: true,
        tension: 0.4, // 부드러운 곡선
        pointRadius: 0,
        pointHoverRadius: 0,
      },
      ...(setAddress
        ? [
            {
              label: `설정값 (${unit})`,
              data: data.map((d) => d.set),
              borderColor: "#3b82f6",
              backgroundColor: (context: any) => {
                const chart = context.chart;
                const { ctx, chartArea } = chart;
                if (!chartArea) return "#3b82f64D";
                return createGradient(ctx, chartArea, "#3b82f6");
              },
              borderWidth: 1.5,
              borderDash: [4, 4],
              fill: true,
              stepped: true,
              tension: 0,
              pointRadius: 0,
              pointHoverRadius: 0,
            },
          ]
        : []),
    ],
  };

  /**
   * Chart.js 옵션 설정
   */
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
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
      },
    },
    scales: {
      x: {
        grid: {
          color: gridColor,
          display: true,
        },
        ticks: {
          color: textColor,
          font: {
            size: 11,
          },
          maxTicksLimit: 8,
        },
      },
      y: {
        min: yMin === "auto" ? undefined : yMin,
        max: yMax === "auto" ? undefined : yMax,
        grid: {
          color: gridColor,
          display: true,
        },
        ticks: {
          color: textColor,
          font: {
            size: 11,
          },
          callback: function (value) {
            return value + unit;
          },
        },
      },
    },
  };

  return (
    <div
      className={`w-full h-full relative rounded-lg overflow-hidden ${borderClass} bg-card flex flex-col`}
    >
      {/* 타이틀 영역 - 윈도우 타이틀 바처럼 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-800 dark:to-slate-700 flex-none shadow-sm">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">
            {title}
          </h3>
          {isAlarm && (
            <div
              className="flex items-center justify-center bg-red-500 text-white w-5 h-5 rounded-full animate-pulse shadow-sm"
              title="알람 발생"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* 크게보기 버튼 */}
        {onMaximize && (
          <button
            onClick={onMaximize}
            className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded w-6 h-6 transition-colors shadow-sm"
            title="크게보기"
          >
            {mounted && <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* 측정값/설정값 표시 영역 */}
      <div className="flex gap-2 px-4 py-2 bg-background/20 backdrop-blur-sm flex-none border-b border-border/30">
        <div className="flex-1">
          <div className="text-lg font-bold text-foreground">
            {currentValue.toFixed(1)}<span className="text-sm ml-0.5">{unit}</span>
          </div>
        </div>
        {setAddress && (
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">설정온도</div>
            <div className="text-lg font-bold text-blue-500">
              {setValue.toFixed(1)}<span className="text-sm ml-0.5">{unit}</span>
            </div>
          </div>
        )}
      </div>

      {/* 차트 영역 */}
      <div className="flex-1 p-2 min-h-0">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}
