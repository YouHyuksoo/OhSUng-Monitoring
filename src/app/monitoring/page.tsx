/**
 * @file src/app/monitoring/page.tsx
 * @description
 * PLC 모니터링 대시보드 페이지
 * 실시간 데이터 차트와 전역 PLC 연결 상태를 표시합니다.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RealtimeChart } from "@/components/Dashboard/RealtimeChart";
import { PowerUsageChart } from "@/components/Dashboard/PowerUsageChart";
import { useSettings } from "@/lib/settings-context";
import { usePLCConnection } from "@/lib/plc-connection-context";

export default function MonitoringPage() {
  const router = useRouter();
  const { settings, toggleDemoMode } = useSettings();
  const { connectionStatus } = usePLCConnection();

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
        const isDemoMode = settings.isDemoMode ?? false;

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
  }, [settings.plcIp, settings.plcPort, settings.pollingInterval, settings.isDemoMode, settings.chartConfigs]);

  // 알람 임계값 설정 (설정값 사용)
  const SUJUL_TEMP_MIN = settings.sujulTempMin;
  const SUJUL_TEMP_MAX = settings.sujulTempMax;
  const YEOLPUNG_TEMP_MIN = settings.yeolpungTempMin;
  const YEOLPUNG_TEMP_MAX = settings.yeolpungTempMax;
  const POLLING_INTERVAL = settings.pollingInterval;
  const PLC_IP = settings.plcIp;
  const PLC_PORT = settings.plcPort;

  // 차트 설정 필터링
  const powerConfig = settings.chartConfigs?.find((c) => c.type === "power");
  const sujulConfigs =
    settings.chartConfigs?.filter((c) => c.type === "sujul") || [];
  const yeolpungConfigs =
    settings.chartConfigs?.filter((c) => c.type === "yeolpung") || [];

  // 연결되지 않으면 연결 화면 표시
  if (connectionStatus.state !== "connected") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
        <div className="bg-slate-900/95 border-2 border-red-500/50 rounded-xl p-12 max-w-2xl w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
          {/* 에러 아이콘 */}
          <div className="flex justify-center mb-8">
            <div className="bg-red-500/20 text-red-500 rounded-full w-24 h-24 flex items-center justify-center animate-pulse ring-4 ring-red-500/10">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* 에러 메시지 */}
          <div className="text-white space-y-6">
            <div>
              <h2 className="text-4xl font-bold mb-3 tracking-tight">
                PLC 연결 실패
              </h2>
              <p className="text-xl text-slate-300">
                {connectionStatus.error || "PLC와의 통신이 원활하지 않습니다."}
              </p>
            </div>

            {/* 상태 표시 */}
            <div className="py-6">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800 rounded-full text-red-400 border border-red-500/20">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-lg font-medium">재연결 시도 중...</span>
              </div>
            </div>

            {/* 설정 안내 */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 text-left max-w-lg mx-auto">
              <p className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                Check List
              </p>
              <ul className="text-base text-slate-400 space-y-2 list-disc list-inside">
                <li>설정 페이지에서 PLC IP와 Port가 정확한지 확인하세요.</li>
                <li>PLC 장비의 전원이 켜져 있는지 확인하세요.</li>
                <li>네트워크 케이블이 올바르게 연결되었는지 확인하세요.</li>
              </ul>
            </div>

            {/* 버튼 그룹 */}
            <div className="pt-4 flex gap-4 justify-center">
              <button
                onClick={() => router.push("/settings")}
                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white text-lg font-medium rounded-lg transition-all hover:scale-105 active:scale-95"
              >
                설정 확인하기
              </button>

              <button
                onClick={toggleDemoMode}
                className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white text-lg font-medium rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 2v7.31" />
                  <path d="M14 2v7.31" />
                  <path d="M8.5 2h7" />
                  <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
                  <path d="M5.52 16h12.96" />
                </svg>
                데모 모드 실행
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // ✅ 연결 성공 - 모니터링 페이지 표시
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
                pollingInterval={POLLING_INTERVAL}
                plcIp={PLC_IP}
                plcPort={PLC_PORT}
                chartConfigs={settings.chartConfigs}
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
                pollingInterval={POLLING_INTERVAL}
                plcIp={PLC_IP}
                plcPort={PLC_PORT}
                chartConfigs={settings.chartConfigs}
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
                pollingInterval={POLLING_INTERVAL}
                plcIp={PLC_IP}
                plcPort={PLC_PORT}
                chartConfigs={settings.chartConfigs}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
