/**
 * @file src/app/settings/page.tsx
 * @description
 * 설정 페이지 컴포넌트
 * PLC 연결 설정, 폴링 주기, 알람 임계값, 데이터 관리, 차트 주소 매핑 등의 설정을 제공합니다.
 */

"use client";

import { useEffect, useState } from "react";
import { useSettings, ChartConfig } from "@/lib/settings-context";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isModified, setIsModified] = useState(false);

  // Sync local state with global settings when they change (e.g. on initial load)
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key: keyof typeof settings, value: any) => {
    setLocalSettings(prev => {
      const next = { ...prev, [key]: value };
      setIsModified(true);
      return next;
    });
  };

  const handleChartConfigChange = (index: number, field: keyof ChartConfig, value: string) => {
    setLocalSettings(prev => {
      const newConfigs = [...prev.chartConfigs];
      newConfigs[index] = { ...newConfigs[index], [field]: value };
      const next = { ...prev, chartConfigs: newConfigs };
      setIsModified(true);
      return next;
    });
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setIsModified(false);
    alert("설정이 저장되었습니다.");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">설정 관리</h1>
        <button
          onClick={handleSave}
          disabled={!isModified}
          className={`px-4 py-2 rounded-md text-white transition-colors ${
            isModified 
              ? "bg-blue-600 hover:bg-blue-700" 
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          설정 저장
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PLC 연결 설정 */}
        <div className="bg-card p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">PLC 연결 설정</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="ip" className="text-sm font-medium block mb-1.5">
                IP 주소
              </label>
              <input
                type="text"
                id="ip"
                value={localSettings.plcIp}
                onChange={(e) => handleChange("plcIp", e.target.value)}
                placeholder="192.168.0.1"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="port" className="text-sm font-medium block mb-1.5">
                포트
              </label>
              <input
                type="number"
                id="port"
                value={localSettings.plcPort}
                onChange={(e) => handleChange("plcPort", parseInt(e.target.value))}
                placeholder="502"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* 모니터링 설정 */}
        <div className="bg-card p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">모니터링 설정</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="polling" className="text-sm font-medium block mb-1.5">
                폴링 주기 (밀리초)
              </label>
              <input
                type="number"
                id="polling"
                value={localSettings.pollingInterval}
                onChange={(e) => handleChange("pollingInterval", parseInt(e.target.value))}
                placeholder="2000"
                min="500"
                step="500"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                현재: {localSettings.pollingInterval / 1000}초마다 데이터 갱신
              </p>
            </div>
            <div>
              <label htmlFor="retention" className="text-sm font-medium block mb-1.5">
                차트 데이터 포인트 수
              </label>
              <input
                type="number"
                id="retention"
                value={localSettings.dataRetention}
                onChange={(e) => handleChange("dataRetention", parseInt(e.target.value))}
                placeholder="20"
                min="10"
                max="100"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                차트에 표시할 최대 데이터 포인트 수
              </p>
            </div>
          </div>
        </div>

        {/* 수절 건조로 알람 설정 */}
        <div className="bg-card p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">수절 건조로 알람 설정</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="sujul-min" className="text-sm font-medium block mb-1.5">
                최소 온도 (°C)
              </label>
              <input
                type="number"
                id="sujul-min"
                value={localSettings.sujulTempMin}
                onChange={(e) => handleChange("sujulTempMin", parseInt(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="sujul-max" className="text-sm font-medium block mb-1.5">
                최대 온도 (°C)
              </label>
              <input
                type="number"
                id="sujul-max"
                value={localSettings.sujulTempMax}
                onChange={(e) => handleChange("sujulTempMax", parseInt(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs dark:bg-yellow-900/20 dark:border-yellow-800">
              <p className="font-medium text-yellow-800 dark:text-yellow-500">
                온도가 설정 범위를 벗어나면 알람이 발생합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 열풍 건조로 알람 설정 */}
        <div className="bg-card p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">열풍 건조로 알람 설정</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="yeolpung-min" className="text-sm font-medium block mb-1.5">
                최소 온도 (°C)
              </label>
              <input
                type="number"
                id="yeolpung-min"
                value={localSettings.yeolpungTempMin}
                onChange={(e) => handleChange("yeolpungTempMin", parseInt(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="yeolpung-max" className="text-sm font-medium block mb-1.5">
                최대 온도 (°C)
              </label>
              <input
                type="number"
                id="yeolpung-max"
                value={localSettings.yeolpungTempMax}
                onChange={(e) => handleChange("yeolpungTempMax", parseInt(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs dark:bg-yellow-900/20 dark:border-yellow-800">
              <p className="font-medium text-yellow-800 dark:text-yellow-500">
                온도가 설정 범위를 벗어나면 알람이 발생합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 데이터 관리 설정 */}
        <div className="bg-card p-6 rounded-lg shadow border lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">데이터 관리</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.autoSave}
                  onChange={(e) => handleChange("autoSave", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">자동 저장 활성화</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                데이터를 자동으로 로컬 스토리지에 저장합니다.
              </p>
            </div>
            <div>
              <label htmlFor="log-retention" className="text-sm font-medium block mb-1.5">
                로그 보관 기간 (일)
              </label>
              <input
                type="number"
                id="log-retention"
                value={localSettings.logRetention}
                onChange={(e) => handleChange("logRetention", parseInt(e.target.value))}
                min="1"
                max="365"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                이전 데이터는 자동으로 삭제됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 차트 주소 매핑 설정 */}
        <div className="bg-card rounded-lg shadow-sm border p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">차트 주소 매핑</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3">차트 이름</th>
                  <th className="px-4 py-3">타입</th>
                  <th className="px-4 py-3">측정값 주소 (D)</th>
                  <th className="px-4 py-3">설정값 주소 (D)</th>
                </tr>
              </thead>
              <tbody>
                {localSettings.chartConfigs?.map((config, index) => (
                  <tr key={config.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{config.name}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{config.type}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={config.address}
                        onChange={(e) => handleChartConfigChange(index, 'address', e.target.value)}
                        className="w-24 bg-background border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {config.setAddress !== undefined ? (
                        <input
                          type="text"
                          value={config.setAddress}
                          onChange={(e) => handleChartConfigChange(index, 'setAddress', e.target.value)}
                          className="w-24 bg-background border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
