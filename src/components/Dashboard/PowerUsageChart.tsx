/**
 * @file src/components/Dashboard/PowerUsageChart.tsx
 * @description
 * 전력 사용량 차트 컴포넌트
 * 시간대별, 일별, 월별 전력 사용량을 바 그래프로 표시합니다.
 *
 * 주요 기능:
 * - 시간대별 사용량 (0~23시)
 * - 일별 사용량 (1~31일)
 * - 월별 사용량 (1~12월)
 * - 총계 카드 표시
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
  Line,
  ComposedChart,
} from "recharts";

export function PowerUsageChart() {
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);

  // 시간대별 데이터 생성 (0~23시)
  useEffect(() => {
    const data = Array.from({ length: 24 }, (_, i) => ({
      time: `${i.toString().padStart(2, "0")}`,
      value: Math.random() * 300 + 100,
      avg: 200 + Math.sin(i / 3) * 50,
    }));
    setHourlyData(data);
  }, []);

  // 일별 데이터 생성 (1~31일)
  useEffect(() => {
    const data = Array.from({ length: 31 }, (_, i) => ({
      day: `${i + 1}`,
      value: Math.random() * 5000 + 2000,
    }));
    setDailyData(data);
  }, []);

  // 총계 계산
  const dailyTotal = 5276.34;
  const weeklyTotal = 48152.34;
  const monthlyTotal = 192060.54;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 총계 카드 */}
      <div className="grid grid-cols-3 gap-2 flex-none">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white">
          <div className="text-xs opacity-90 mb-1">일일 전기 사용량</div>
          <div className="text-lg font-bold">
            {dailyTotal.toLocaleString()}kWh
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white">
          <div className="text-xs opacity-90 mb-1">주간 전기 사용량</div>
          <div className="text-lg font-bold">
            {weeklyTotal.toLocaleString()}kWh
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white">
          <div className="text-xs opacity-90 mb-1">월간 전기 사용량</div>
          <div className="text-lg font-bold">
            {monthlyTotal.toLocaleString()}kWh
          </div>
        </div>
      </div>

      {/* 차트 영역 컨테이너 */}
      <div className="flex-1 min-h-0 flex flex-col gap-2">
        {/* 일별 차트 */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h3 className="text-xs font-semibold text-muted-foreground mb-1 flex-none">
            일별 전력 사용량
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="day"
                  fontSize={10}
                  tick={{ fill: "#888" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={10}
                  tick={{ fill: "#888" }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "11px",
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 시간대별 차트 */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h3 className="text-xs font-semibold text-muted-foreground mb-1 flex-none">
            시간대별 전력 사용량
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={hourlyData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="time"
                  fontSize={10}
                  tick={{ fill: "#888" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={10}
                  tick={{ fill: "#888" }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "11px",
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
