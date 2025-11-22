"use client";

import { RealtimeChart } from "@/components/Dashboard/RealtimeChart";
import { PowerUsageChart } from "@/components/Dashboard/PowerUsageChart";
import { useSettings } from "@/lib/settings-context";

export default function MonitoringPage() {
  const { settings } = useSettings();
  
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
    <div className="p-4 space-y-4">
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
