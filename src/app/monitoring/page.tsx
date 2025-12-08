/**
 * @file src/app/monitoring/page.tsx
 * @description
 * 전력/온도 모니터링 대시보드 페이지
 * SQLite DB에서 조회한 실시간 데이터 차트를 표시합니다.
 *
 * 아키텍처:
 * - 모든 데이터는 SQLite DB에서 조회
 * - 백엔드 폴링 서비스는 관리자 페이지에서 시작됨
 * - 순수 모니터링 UI만 제공
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RealtimeChart } from "@/components/Dashboard/RealtimeChart";
import { PowerUsageChart } from "@/components/Dashboard/PowerUsageChart";
import { useSettings } from "@/lib/useSettings";
import { LogOut, Sun, Moon, Activity, X } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function MonitoringPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [maximizedChartId, setMaximizedChartId] = useState<string | null>(null);
  const [maximizedConfig, setMaximizedConfig] = useState<any>(null);

  /**
   * 테마 토글 핸들러
   * - 다크 모드 ↔ 라이트 모드 전환
   */
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  /**
   * 차트 크게보기 핸들러
   */
  const handleChartMaximize = (chartId: string, chartConfig: any) => {
    setMaximizedChartId(chartId);
    setMaximizedConfig(chartConfig);
  };

  /**
   * 클라이언트 마운트 확인
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 폴링 상태 주기적 조회
   * - 2초마다 폴링 상태 갱신 (실시간 상태 표시)
   * - 페이지 언마운트 시 인터벌 정리
   */
  useEffect(() => {
    const checkPollingStatus = async () => {
      try {
        const res = await fetch("/api/polling/status");
        if (res.ok) {
          const data = await res.json();
          setIsPollingActive(data.status === "running");
        } else {
          setIsPollingActive(false);
        }
      } catch (error) {
        setIsPollingActive(false);
      }
    };

    // 초기 로드 시 한 번 실행
    checkPollingStatus();

    // 2초마다 폴링 상태 갱신
    const statusCheckInterval = setInterval(checkPollingStatus, 2000);

    // 정리: 페이지 언마운트 시 인터벌 제거
    return () => clearInterval(statusCheckInterval);
  }, []);

  /**
   * 자동 전체 화면 처리
   */
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


  /**
   * 모니터링 페이지 나가기 핸들러
   * - 전체 화면 해제
   * - 랭딩 페이지로 이동
   */
  const handleExit = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.log("Exit fullscreen error:", err);
    }
    router.push("/");
  };

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
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* 헤더 - 모니터링 독립 페이지용 */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 로고 아이콘 */}
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-md">
                {mounted && <Activity className="w-6 h-6 text-white" />}
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-foreground">
                  {settings.appTitle}
                </h1>
                {/* 버전 표시 */}
                <span className="text-xs text-muted-foreground font-medium">
                  v 1.0
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  {isPollingActive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isPollingActive ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></span>
                </span>
                <span
                  className={`text-xs font-medium ${
                    isPollingActive ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {isPollingActive ? "PLC Live Data" : "Offline"}
                </span>
              </div>
              {/* 폴링 인터벌 표시 */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-800/40 rounded-full text-xs text-blue-100 border border-blue-400/20 shadow-sm backdrop-blur-sm">
                <span className="font-medium">Polling Interval:</span>
                <span className="font-bold text-white tracking-wide">
                  {settings.plcPollingInterval}ms
                </span>
              </div>
              {/* 테마 변경 버튼 */}
              <button
                onClick={toggleTheme}
                className="inline-flex items-center justify-center rounded-md w-9 h-9 transition-colors bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                title={
                  theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"
                }
              >
                {mounted ? (
                  theme === "dark" ? (
                    <Sun className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-700" />
                  )
                ) : null}
              </button>
              {/* 나가기 버튼 */}
              <button
                onClick={handleExit}
                className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-amber-500 hover:bg-amber-600 text-white px-3 h-9"
                title="모니터링 나가기"
              >
                {mounted && <LogOut className="h-4 w-4" />}
                <span className="text-xs">나가기</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 gap-4 flex flex-col h-full min-h-[800px]">
          {/* 상단: 실시간 현황 & 전력 사용 현황 */}
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            {/* 실시간 현황 */}
            <div className="bg-card dark:bg-slate-800/80 rounded-lg shadow-sm border dark:border-slate-700/50 p-4 flex flex-col overflow-hidden min-h-0">
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
                    dataHours={settings.powerDataHours}
                    isPollingActive={isPollingActive}
                  />
                )}
              </div>
            </div>

            {/* 전력 사용 현황 */}
            <div className="bg-card dark:bg-slate-800/80 rounded-lg shadow-sm border dark:border-slate-700/50 p-4 flex flex-col overflow-hidden min-h-0">
              <h2 className="text-lg font-semibold mb-3 flex-none">
                전력 사용 현황
              </h2>
              <div className="flex-1 min-h-0">
                <PowerUsageChart isPollingActive={isPollingActive} />
              </div>
            </div>
          </div>

          {/* 하단: 수절 건조로 + 열풍 건조로 */}
          <div className="bg-card dark:bg-slate-800/80 rounded-lg shadow-sm border dark:border-slate-700/50 p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
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
                    yMin={settings.tempChartYMin}
                    yMax={settings.tempChartYMax}
                    dataLimit={settings.tempDataLimit}
                    onMaximize={() => handleChartMaximize(config.id, { ...config, type: "sujul" })}
                    isPollingActive={isPollingActive}
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
                    yMin={settings.tempChartYMin}
                    yMax={settings.tempChartYMax}
                    dataLimit={settings.tempDataLimit}
                    onMaximize={() => handleChartMaximize(config.id, { ...config, type: "yeolpung" })}
                    isPollingActive={isPollingActive}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 차트 크게보기 모달 */}
      {maximizedChartId && maximizedConfig && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setMaximizedChartId(null)}
        >
          <div
            className="w-full h-full max-w-6xl max-h-[90vh] bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-border flex-none">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {maximizedConfig.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {maximizedConfig.type === "sujul"
                    ? `수절 건조로 | 임계값: ${SUJUL_TEMP_MIN}~${SUJUL_TEMP_MAX}°C`
                    : `열풍 건조로 | 임계값: ${YEOLPUNG_TEMP_MIN}~${YEOLPUNG_TEMP_MAX}°C`}
                </p>
              </div>
              <button
                onClick={() => setMaximizedChartId(null)}
                className="p-2 rounded-full bg-background/80 hover:bg-accent text-foreground transition-colors"
                title="닫기"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 차트 영역 */}
            <div className="flex-1 p-6 w-full h-full min-h-0">
              <RealtimeChart
                address={maximizedConfig.address}
                setAddress={maximizedConfig.setAddress}
                title={maximizedConfig.name}
                unit="°C"
                color={
                  maximizedConfig.type === "yeolpung" ? "#8b5cf6" : "#ef4444"
                }
                minThreshold={
                  maximizedConfig.type === "yeolpung"
                    ? YEOLPUNG_TEMP_MIN
                    : SUJUL_TEMP_MIN
                }
                maxThreshold={
                  maximizedConfig.type === "yeolpung"
                    ? YEOLPUNG_TEMP_MAX
                    : SUJUL_TEMP_MAX
                }
                bordered={false}
                yMin={settings.tempChartYMin}
                yMax={settings.tempChartYMax}
                dataLimit={settings.tempDataLimit * 3}
                isPollingActive={isPollingActive}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
