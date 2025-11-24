/**
 * @file src/components/Dashboard/PowerUsageChart.tsx
 * @description
 * 누적 전력량 차트 컴포넌트
 * D6100 주소의 일일 누적 전력량(Wh)을 시간별, 일별로 표시합니다.
 *
 * 주요 기능:
 * - 시간대별 차트: 당일 1~24시 누적 에너지 (Wh)
 * - 일별 차트: 지난 30일 일일 누적 에너지 (Wh)
 * - 총계 카드: 당일, 주간, 월간 누적량
 * - /api/energy/hourly 엔드포인트에서 데이터 조회
 *
 * 초보자 가이드:
 * 1. **시간별 데이터**: 당일 1시~24시 누적 에너지값
 * 2. **일별 데이터**: 지난 30일 일일 누적값
 * 3. **데이터 형식**: { hours: {1-24: value}, date: YYYY-MM-DD }
 */

"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/components/theme-provider";

interface HourlyEnergyResponse {
  date: string;
  hours: {
    [hour: number]: number;
  };
  lastUpdate: number;
}

export function PowerUsageChart() {
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totals, setTotals] = useState({
    today: 0,
    weekly: 0,
    monthly: 0,
  });
  const { theme } = useTheme();

  // 시간별 및 일별 에너지 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 1. 당일 시간별 데이터 조회
        const todayRes = await fetch("/api/energy/hourly");
        if (todayRes.ok) {
          const todayData = (await todayRes.json()) as HourlyEnergyResponse;

          // 시간별 데이터 변환 (1~24시)
          const hourlyChartData = [];
          let todayTotal = 0;
          for (let hour = 1; hour <= 24; hour++) {
            const value = todayData.hours[hour] || 0;
            hourlyChartData.push({
              hour: `${hour}시`,
              value,
            });
            todayTotal += value;
          }
          setHourlyData(hourlyChartData);
          setTotals((prev) => ({ ...prev, today: todayTotal }));
        }

        // 2. 지난 30일 일별 데이터 조회
        const dailyChartData = [];
        let weeklyTotal = 0;
        let monthlyTotal = 0;

        for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
          const date = new Date();
          date.setDate(date.getDate() - daysAgo);
          const dateStr = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

          try {
            const dayRes = await fetch(`/api/energy/hourly?date=${dateStr}`);
            if (dayRes.ok) {
              const dayData = (await dayRes.json()) as HourlyEnergyResponse;

              // 하루 누적값 계산
              let dayTotal = 0;
              Object.values(dayData.hours).forEach((val) => {
                dayTotal += val;
              });

              dailyChartData.push({
                day: `${date.getMonth() + 1}/${date.getDate()}`,
                value: dayTotal,
              });

              monthlyTotal += dayTotal;

              // 최근 7일 주간합 계산
              if (daysAgo < 7) {
                weeklyTotal += dayTotal;
              }
            }
          } catch (error) {
            console.error(`Failed to fetch data for ${dateStr}:`, error);
          }
        }

        setDailyData(dailyChartData);
        setTotals((prev) => ({ ...prev, weekly: weeklyTotal, monthly: monthlyTotal }));
      } catch (error) {
        console.error("Failed to fetch energy data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // 10초마다 데이터 갱신
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const axisColor = theme === "dark" ? "#e5e7eb" : "#374151";
  const gridColor = theme === "dark" ? "#444" : "#e5e7eb";

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
        {/* 시간대별 누적 에너지 차트 (1~24시) */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h3 className="text-xs font-semibold text-muted-foreground mb-1 flex-none">
            시간별 누적 에너지 (1~24시)
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="hour"
                  fontSize={10}
                  tick={{ fill: axisColor }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={10}
                  tick={{ fill: axisColor }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1f2937" : "#f9fafb",
                    border: `1px solid ${gridColor}`,
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`}
                />
                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 일별 누적 에너지 차트 (30일) */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h3 className="text-xs font-semibold text-muted-foreground mb-1 flex-none">
            일별 누적 에너지 (30일)
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="day"
                  fontSize={10}
                  tick={{ fill: axisColor }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={10}
                  tick={{ fill: axisColor }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1f2937" : "#f9fafb",
                    border: `1px solid ${gridColor}`,
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
