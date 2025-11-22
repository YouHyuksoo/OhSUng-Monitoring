/**
 * @file src/app/monitoring/page.tsx
 * @description
 * PLC 모니터링 대시보드 페이지
 * 실시간 데이터 차트와 전역 PLC 연결 상태를 표시합니다.
 */

"use client";

import { useRouter } from "next/navigation";
import { RealtimeChart } from "@/components/Dashboard/RealtimeChart";
import { PowerUsageChart } from "@/components/Dashboard/PowerUsageChart";
import { useSettings } from "@/lib/settings-context";
import { usePLCConnection } from "@/lib/plc-connection-context";

export default function MonitoringPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const { connectionStatus } = usePLCConnection();
  
  // 알람 임계값 설정 (설정값 사용)
  const SUJUL_TEMP_MIN = settings.sujulTempMin;
  const SUJUL_TEMP_MAX = settings.sujulTempMax;
  const YEOLPUNG_TEMP_MIN = settings.yeolpungTempMin;
  const YEOLPUNG_TEMP_MAX = settings.yeolpungTempMax;
  const POLLING_INTERVAL = settings.pollingInterval;
  const PLC_IP = settings.plcIp;
  const PLC_PORT = settings.plcPort;

  // 차트 설정 필터링
  const powerConfig = settings.chartConfigs?.find(c => c.type === 'power');
  const sujulConfigs = settings.chartConfigs?.filter(c => c.type === 'sujul') || [];
  const yeolpungConfigs = settings.chartConfigs?.filter(c => c.type === 'yeolpung') || [];

  return (
    <div className="p-4 space-y-4 relative">
      {/* 전역 PLC 연결 실패 오버레이 */}
      {!connectionStatus.isConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-red-900/95 border-2 border-red-500 rounded-lg p-8 max-w-md text-center animate-bounce-slow shadow-2xl">
            {/* 에러 아이콘 */}
            <div className="flex justify-center mb-4">
              <div className="bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center animate-pulse">
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* 에러 메시지 */}
            <div className="text-white">
              <p className="text-xl font-bold mb-2">PLC 연결 실패</p>
              <p className="text-sm text-red-100 mb-3">
                {connectionStatus.error ||
                  "설정 페이지에서 PLC IP 주소와 포트를 확인하세요"}
              </p>

              {/* 상태 표시 */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-red-200">
                  <span className="inline-block w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                  재연결 시도 중...
                </div>

                {/* 설정 안내 */}
                <div className="mt-4 p-3 bg-red-800/50 rounded border border-red-700 text-left">
                  <p className="text-xs font-semibold text-red-100 mb-1">
                    확인 사항:
                  </p>
                  <ul className="text-xs text-red-200 space-y-1 list-disc list-inside">
                    <li>설정 → PLC 연결 설정에서 IP/Port 확인</li>
                    <li>PLC가 정상 작동 중인지 확인</li>
                    <li>네트워크 연결 상태 확인</li>
                  </ul>
                </div>

                {/* 설정으로 이동 버튼 */}
                <button
                  onClick={() => router.push("/settings")}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                >
                  설정으로 이동
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 상단: 실시간 현황 & 전력 사용 현황 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 실시간 현황 */}
        <div className="bg-card rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">실시간 현황</h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            실시간 순방향 유효전력량
          </div>
          <div className="h-[180px]">
            {powerConfig && (
              <RealtimeChart 
                address={powerConfig.address} 
                title={powerConfig.name} 
                unit="Wh" 
                color="#ef4444" 
                pollingInterval={POLLING_INTERVAL}
                plcIp={PLC_IP}
                plcPort={PLC_PORT}
              />
            )}
          </div>
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs dark:bg-yellow-900/20 dark:border-yellow-800">
            <span className="font-medium text-yellow-800 dark:text-yellow-500">알람: 발생일시 / 내용 / 복구시간</span>
          </div>
        </div>

        {/* 전력 사용 현황 */}
        <div className="bg-card rounded-lg shadow-sm border p-4">
          <h2 className="text-lg font-semibold mb-3">전력 사용 현황</h2>
          <PowerUsageChart />
        </div>
      </div>

      {/* 하단: 수절 건조로 + 열풍 건조로 */}
      <div className="bg-card rounded-lg shadow-sm border p-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">온도 현황</h2>
          <div className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
            설정온도 이하시 모니터 알람
          </div>
          <span className="text-xs text-muted-foreground">
            수절: {SUJUL_TEMP_MIN}~{SUJUL_TEMP_MAX}°C | 열풍: {YEOLPUNG_TEMP_MIN}~{YEOLPUNG_TEMP_MAX}°C
          </span>
        </div>
        <div className="grid grid-cols-8 gap-2">
          {/* 수절 건조로 */}
          {sujulConfigs.map((config) => (
            <div key={config.id}>
              <div className="h-[280px]">
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
                />
              </div>
            </div>
          ))}
          
          {/* 열풍 건조로 */}
          {yeolpungConfigs.map((config) => (
            <div key={config.id}>
              <div className="h-[280px]">
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
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
