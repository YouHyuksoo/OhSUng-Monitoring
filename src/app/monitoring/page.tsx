/**
 * @file src/app/monitoring/page.tsx
 * @description
 * PLC 모니터링 대시보드 페이지
 * SQLite DB에서 조회한 실시간 데이터 차트를 표시합니다.
 *
 * 아키텍처:
 * - 모든 데이터는 SQLite DB에서 조회
 * - 백엔드 폴링 서비스가 주기적으로 DB 업데이트
 * - PLC 연결 확인 불필요 (DB 조회만 필요)
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RealtimeChart } from "@/components/Dashboard/RealtimeChart";
import { PowerUsageChart } from "@/components/Dashboard/PowerUsageChart";
import { useSettings } from "@/lib/settings-context";

export default function MonitoringPage() {
  const router = useRouter();
  const { settings, isDemoMode, toggleDemoMode } = useSettings();

  // 자동 전체 화면 처리
  useEffect(() => {
    if (settings.startFullScreen) {
      const enterFullScreen = async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.log("Full screen request blocked:", err);
          // 브라우저 정책상 자동 전체화면이 차단될 수 있음
        }
      };
      enterFullScreen();
    }
  }, [settings.startFullScreen]);

  // 백엔드 폴링 서비스 시작 (시간별 에너지 + 실시간 데이터)
  useEffect(() => {
    const startBackendPolling = async () => {
      try {

        // 1. 시간별 에너지 폴링 시작 (1시간 단위)
        await fetch("/api/energy/hourly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: settings.plcIp,
            port: settings.plcPort,
            demo: isDemoMode,
          }),
        });
        console.log("[MonitoringPage] Hourly energy polling started");

        // 2. 실시간 데이터 폴링 시작 (설정된 인터벌)
        await fetch("/api/realtime/polling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: settings.plcIp,
            port: settings.plcPort,
            interval: settings.pollingInterval,
            chartConfigs: settings.chartConfigs,
            demo: isDemoMode,
          }),
        });
        console.log(
          "[MonitoringPage] Realtime data polling started with interval",
          settings.pollingInterval
        );
      } catch (error) {
        console.error("[MonitoringPage] Failed to start backend polling:", error);
      }
    };

    if (settings.plcIp && settings.plcPort) {
      startBackendPolling();
    }
  }, [settings.plcIp, settings.plcPort, settings.pollingInterval, isDemoMode, settings.chartConfigs]);

  // 알람 임계값 설정 (설정값 사용)
  const SUJUL_TEMP_MIN = settings.sujulTempMin;
  const SUJUL_TEMP_MAX = settings.sujulTempMax;
  const YEOLPUNG_TEMP_MIN = settings.yeolpungTempMin;
  const YEOLPUNG_TEMP_MAX = settings.yeolpungTempMax;

  // 차트 설정 필터링
  const powerConfig = settings.chartConfigs?.find((c) => c.type === "power");
  const sujulConfigs =
    settings.chartConfigs?.filter((c) => c.type === "sujul") || [];
  const yeolpungConfigs =
    settings.chartConfigs?.filter((c) => c.type === "yeolpung") || [];

  return (
    <div className="p-4 gap-4 flex flex-col h-full overflow-hidden">
      {/* 상단: 실시간 현황 & 전력 사용 현황 */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* 실시간 현황 */}
        <div className="bg-card rounded-lg shadow-sm border p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2 flex-none">
            <h2 className="text-lg font-semibold">실시간 현황</h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {powerConfig && (
              <RealtimeChart
                address={powerConfig.address}
                title={powerConfig.name}
                unit="Wh"
                color="#ef4444"
              />
            )}
          </div>
        </div>

        {/* 전력 사용 현황 */}
        <div className="bg-card rounded-lg shadow-sm border p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-3 flex-none">
            전력 사용 현황
          </h2>
          <div className="flex-1 min-h-0">
            <PowerUsageChart />
          </div>
        </div>
      </div>

      {/* 하단: 수절 건조로 + 열풍 건조로 */}
      <div className="bg-card rounded-lg shadow-sm border p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 mb-3 flex-none">
          <h2 className="text-lg font-semibold">온도 현황</h2>
          <div className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
            설정온도 이하시 모니터 알람
          </div>
          <span className="text-xs text-muted-foreground">
            수절: {SUJUL_TEMP_MIN}~{SUJUL_TEMP_MAX}°C | 열풍:{" "}
            {YEOLPUNG_TEMP_MIN}~{YEOLPUNG_TEMP_MAX}°C
          </span>
        </div>
        <div className="grid grid-cols-8 gap-2 flex-1 min-h-0">
          {/* 수절 건조로 */}
          {sujulConfigs.map((config) => (
            <div key={config.id} className="h-full">
              <RealtimeChart
                address={config.address}
                setAddress={config.setAddress}
                title={config.name}
                unit="°C"
                color="#ef4444"
                minThreshold={SUJUL_TEMP_MIN}
                maxThreshold={SUJUL_TEMP_MAX}
                bordered={true}
                yMin={0}
                yMax={80}
              />
            </div>
          ))}

          {/* 열풍 건조로 */}
          {yeolpungConfigs.map((config) => (
            <div key={config.id} className="h-full">
              <RealtimeChart
                address={config.address}
                setAddress={config.setAddress}
                title={config.name}
                unit="°C"
                color="#8b5cf6"
                minThreshold={YEOLPUNG_TEMP_MIN}
                maxThreshold={YEOLPUNG_TEMP_MAX}
                bordered={true}
                yMin={0}
                yMax={80}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
