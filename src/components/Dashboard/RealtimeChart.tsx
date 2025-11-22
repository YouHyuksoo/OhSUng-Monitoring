/**
 * @file src/components/Dashboard/RealtimeChart.tsx
 * @description
 * 실시간 차트 컴포넌트
 * PLC 데이터를 폴링하여 실시간으로 차트에 표시합니다.
 *
 * 주요 기능:
 * - 2초마다 PLC 데이터 폴링 (pollingInterval prop으로 설정 가능)
 * - 최근 20개 데이터 포인트 유지
 * - 알람 임계값 체크 및 시각적 피드백
 * - 붉은색 외곽선 애니메이션 (알람 발생 시)
 * - 설정값과 측정값 동시 표시
 */

"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/components/theme-provider";
import { usePLCConnection } from "@/lib/plc-connection-context";
import { useSettings } from "@/lib/settings-context";
import { logger } from "@/lib/logger";

interface DataPoint {
  time: string;
  current: number;
  set: number;
}

interface RealtimeChartProps {
  address: string;
  setAddress?: string;
  title: string;
  color?: string;
  unit?: string;
  minThreshold?: number;
  maxThreshold?: number;
  bordered?: boolean;
  yMin?: number | "auto";
  yMax?: number | "auto";
  pollingInterval?: number;
  plcIp?: string;
  plcPort?: number;
}

/**
 * 연결 상태를 나타내는 인터페이스
 */
interface ConnectionStatus {
  isConnected: boolean;
  error?: string;
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
  pollingInterval = 2000,
  plcIp,
  plcPort,
}: RealtimeChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isAlarm, setIsAlarm] = useState(false);
  const { theme } = useTheme();
  const { connectionStatus, requestConnectionCheck } = usePLCConnection();
  const { isDemoMode } = useSettings();

  /**
   * PLC 연결 상태 변화 감지
   * - 연결 실패 시 데이터 초기화
   */
  useEffect(() => {
    if (connectionStatus.state !== "connected") {
      setData([]);
      setIsAlarm(false);
    }
  }, [connectionStatus.state]);

  /**
   * PLC 데이터 폴링 함수
   * - 재귀적 setTimeout 사용 (이전 요청 완료 후 다음 요청 예약)
   * - AbortController 사용 (컴포넌트 언마운트/연결 끊김 시 즉시 취소)
   */
  useEffect(() => {
    // 연결되지 않은 상태면 폴링하지 않음
    if (connectionStatus.state !== "connected") {
      return;
    }

    let timeoutId: NodeJS.Timeout;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const addresses = setAddress ? `${address},${setAddress}` : address;
        let url = `/api/plc?addresses=${addresses}`;
        if (plcIp && plcPort) {
          url += `&ip=${plcIp}&port=${plcPort}`;
        }
        if (isDemoMode) {
          url += "&demo=true";
        }

        const res = await fetch(url, { signal: controller.signal });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `HTTP Error: ${res.status}`);
        }

        const json = await res.json();

        // 필수 데이터 검증
        if (!json || typeof json[address] !== "number") {
          throw new Error(`Invalid data received for address ${address}`);
        }

        const currentValue = json[address];
        const setValue = setAddress ? json[setAddress] : currentValue;

        // 알람 체크 (측정값 기준)
        if (minThreshold !== undefined && maxThreshold !== undefined) {
          setIsAlarm(
            currentValue < minThreshold || currentValue > maxThreshold
          );
        }

        const now = new Date();
        const timeStr = `${now.getHours()}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        setData((prev) => {
          const newData = [
            ...prev,
            { time: timeStr, current: currentValue, set: setValue },
          ];
          if (newData.length > 20) newData.shift(); // Keep last 20 points
          return newData;
        });
      } catch (error) {
        // AbortError는 무시 (의도된 취소)
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        logger.error(`데이터 수집 실패: ${address}`, "RealtimeChart", error);
        // ❌ 에러 보고 (연결 끊김 처리)
        const errorMsg =
          error instanceof Error ? error.message : "Polling Failed";
        requestConnectionCheck(errorMsg);
      } finally {
        // 연결 상태가 여전히 connected일 때만 다음 폴링 예약
        if (!controller.signal.aborted) {
          timeoutId = setTimeout(fetchData, pollingInterval);
        }
      }
    };

    fetchData(); // 초기 데이터 로드

    // 정리 함수
    return () => {
      controller.abort(); // 진행 중인 요청 취소
      clearTimeout(timeoutId); // 대기 중인 타이머 취소
    };
  }, [
    address,
    setAddress,
    minThreshold,
    maxThreshold,
    pollingInterval,
    plcIp,
    plcPort,
    connectionStatus.state,
    requestConnectionCheck,
    isDemoMode,
  ]);

  const currentValue = data.length > 0 ? data[data.length - 1].current : 0;
  const setValue = data.length > 0 ? data[data.length - 1].set : 0;

  /**
   * 테두리 스타일 계산
   * - 알람 상태: 빨간색 테두리 + 애니메이션
   * - 정상 상태: 기본 테두리
   */
  const borderClass = isAlarm
    ? "border-4 border-red-500 animate-pulse-border"
    : bordered
    ? "border border-border"
    : "";

  /**
   * 테마에 따른 색상 설정
   */
  const axisColor = theme === "dark" ? "#e5e7eb" : "#374151"; // dark: gray-200, light: gray-700
  const gridColor = theme === "dark" ? "#444" : "#e5e7eb"; // dark: #444, light: gray-200
  const tooltipBg =
    theme === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)";
  const tooltipBorder = theme === "dark" ? "#333" : "#e5e7eb";
  const tooltipText = theme === "dark" ? "#fff" : "#000";

  return (
    <div
      className={`w-full h-full relative rounded-lg overflow-hidden ${borderClass} bg-card`}
    >
      {/* 헤더 영역: 타이틀 및 알람 배지 */}
      <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-foreground/80 bg-background/50 px-2 py-0.5 rounded backdrop-blur-sm">
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

        {/* 현재값/설정값 표시 */}
        <div className="flex flex-col gap-1 items-end">
          <div className="bg-black/70 text-white px-2 py-0.5 rounded text-xs font-bold backdrop-blur-sm">
            측정: {currentValue.toFixed(1)}
            {unit}
          </div>
          {setAddress && (
            <div className="bg-blue-600/90 text-white px-2 py-0.5 rounded text-xs font-bold backdrop-blur-sm">
              설정: {setValue.toFixed(1)}
              {unit}
            </div>
          )}
        </div>
      </div>

      <div className="w-full h-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              opacity={0.5}
              vertical={true}
            />
            <XAxis
              dataKey="time"
              fontSize={11}
              tick={{ fill: axisColor }}
              tickLine={true}
              axisLine={true}
              stroke={axisColor}
              minTickGap={30}
            />
            <YAxis
              domain={[yMin, yMax]}
              fontSize={11}
              tick={{ fill: axisColor }}
              unit={unit}
              tickLine={true}
              axisLine={true}
              stroke={axisColor}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "4px",
                color: tooltipText,
              }}
              itemStyle={{ color: tooltipText }}
              labelStyle={{ color: axisColor, marginBottom: "0.25rem" }}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke={isAlarm ? "#ef4444" : color}
              strokeWidth={isAlarm ? 3 : 2}
              dot={false}
              isAnimationActive={false}
            />
            {setAddress && (
              <Line
                type="step"
                dataKey="set"
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
