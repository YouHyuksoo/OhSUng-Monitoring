/**
 * @file src/app/settings/page.tsx
 * @description
 * 설정 페이지 컴포넌트
 * PLC 연결 설정, 폴링 주기, 알람 임계값, 데이터 관리, 차트 주소 매핑 등의 설정을 제공합니다.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/useSettings";
import { ChartConfig } from "@/lib/settings-store";
import { useAuth } from "@/lib/auth-context";
import { Toast, ToastType } from "@/components/ui/toast";

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const { isAuthenticated } = useAuth();

  // 인증 확인 - 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, router]);
  const [localSettings, setLocalSettings] = useState(settings);
  const [isModified, setIsModified] = useState(false);
  const [toast, setToast] = useState<{
    type: ToastType;
    title: string;
    message?: string;
  } | null>(null);

  // Sync local state with global settings when they change (e.g. on initial load)
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key: keyof typeof settings, value: any) => {
    setLocalSettings((prev) => {
      const next = { ...prev, [key]: value };
      setIsModified(true);
      return next;
    });
  };

  /**
   * Modbus 주소 매핑 필드 변경 처리
   * @param field - dAddressBase 또는 modbusOffset
   * @param value - 변경할 값
   */
  const handleModbusAddressMappingChange = (
    field: "dAddressBase" | "modbusOffset",
    value: number
  ) => {
    setLocalSettings((prev) => {
      const next = {
        ...prev,
        modbusAddressMapping: {
          dAddressBase: prev.modbusAddressMapping?.dAddressBase ?? 0,
          modbusOffset: prev.modbusAddressMapping?.modbusOffset ?? 0,
          [field]: value,
        },
      };
      setIsModified(true);
      return next;
    });
  };

  const handleChartConfigChange = (
    index: number,
    field: keyof ChartConfig,
    value: string
  ) => {
    setLocalSettings((prev) => {
      const newConfigs = [...prev.chartConfigs];
      const updated = { ...newConfigs[index] };
      if (field === "name" || field === "address" || field === "setAddress" || field === "accumulationAddress") {
        updated[field] = value;
      }
      newConfigs[index] = updated;
      const next = { ...prev, chartConfigs: newConfigs };
      setIsModified(true);
      return next;
    });
  };

  // 임계값 변수
  const SUJUL_TEMP_MIN = localSettings.sujulTempMin;
  const SUJUL_TEMP_MAX = localSettings.sujulTempMax;
  const YEOLPUNG_TEMP_MIN = localSettings.yeolpungTempMin;
  const YEOLPUNG_TEMP_MAX = localSettings.yeolpungTempMax;

  const handleSave = () => {
    updateSettings(localSettings);
    setIsModified(false);
    setToast({
      type: "success",
      title: "설정 저장 완료",
      message: "설정이 성공적으로 저장되었습니다.",
    });
  };
  /**
   * PLC 연결 테스트 - Modbus 프로토콜일 때 addressMapping 포함
   */
  const handleTestConnection = async () => {
    try {
      let url = `/api/plc?check=true&ip=${localSettings.plcIp}&port=${localSettings.plcPort}&plcType=${localSettings.plcType}`;

      // Modbus 프로토콜일 때 addressMapping 파라미터 추가
      if (localSettings.plcType === "modbus" && localSettings.modbusAddressMapping) {
        const addressMappingJson = encodeURIComponent(
          JSON.stringify(localSettings.modbusAddressMapping)
        );
        url += `&addressMapping=${addressMappingJson}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.connected) {
        setToast({
          type: "success",
          title: "PLC 연결 성공",
          message: "PLC와 정상적으로 연결되었습니다.",
        });
      } else {
        setToast({
          type: "error",
          title: "PLC 연결 실패",
          message: data.error || "연결할 수 없습니다.",
        });
      }
    } catch (error) {
      setToast({
        type: "error",
        title: "연결 테스트 오류",
        message: "PLC 연결 테스트 중 오류가 발생했습니다.",
      });
      console.error(error);
    }
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

      <div className="grid grid-cols-1 gap-6">
        {/* 애플리케이션 타이틀 설정 */}
        <div className="bg-card p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">애플리케이션 설정</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="appTitle" className="text-sm font-medium block mb-1.5">
                애플리케이션 타이틀
              </label>
              <input
                type="text"
                id="appTitle"
                value={localSettings.appTitle}
                onChange={(e) => handleChange("appTitle", e.target.value)}
                placeholder="PLC 모니터링"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                헤더에 표시될 애플리케이션 이름을 입력하세요.
              </p>
            </div>
          </div>
        </div>
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
              <label
                htmlFor="port"
                className="text-sm font-medium block mb-1.5"
              >
                포트
              </label>
              <input
                type="number"
                id="port"
                value={localSettings.plcPort}
                onChange={(e) =>
                  handleChange("plcPort", parseInt(e.target.value))
                }
                placeholder="502"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="plcType"
                className="text-sm font-medium block mb-1.5"
              >
                PLC 프로토콜 타입
              </label>
              <select
                id="plcType"
                value={localSettings.plcType}
                onChange={(e) => handleChange("plcType", e.target.value as "mc" | "modbus" | "demo")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="mc">Mitsubishi MC Protocol</option>
                <option value="modbus">LS ELECTRIC XGT Modbus TCP</option>
                <option value="demo">Demo Mode (Mock PLC)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                현재: {
                  localSettings.plcType === "mc" ? "미쯔비시 MC" :
                  localSettings.plcType === "modbus" ? "LS Modbus TCP" :
                  "데모 모드"
                }
              </p>
            </div>

            {/* Modbus 주소 매핑 설정 (Modbus 프로토콜 선택 시만 표시) */}
            {localSettings.plcType === "modbus" && (
              <>
                <div>
                  <label
                    htmlFor="dAddressBase"
                    className="text-sm font-medium block mb-1.5"
                  >
                    D 주소 기본값 (Base)
                  </label>
                  <input
                    type="number"
                    id="dAddressBase"
                    value={localSettings.modbusAddressMapping?.dAddressBase || 0}
                    onChange={(e) =>
                      handleModbusAddressMappingChange(
                        "dAddressBase",
                        parseInt(e.target.value)
                      )
                    }
                    placeholder="0"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    D 주소 변환의 기준값 (예: D400의 기본값이 0이면 400으로 계산)
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="modbusOffset"
                    className="text-sm font-medium block mb-1.5"
                  >
                    Modbus 오프셋
                  </label>
                  <input
                    type="number"
                    id="modbusOffset"
                    value={localSettings.modbusAddressMapping?.modbusOffset || 0}
                    onChange={(e) =>
                      handleModbusAddressMappingChange(
                        "modbusOffset",
                        parseInt(e.target.value)
                      )
                    }
                    placeholder="0"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Modbus 레지스터에 추가할 오프셋값
                  </p>
                </div>

                {/* 주소 매핑 계산 공식 설명 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                    📐 주소 변환 공식
                  </p>
                  <code className="text-xs text-blue-800 dark:text-blue-300 block bg-blue-100 dark:bg-blue-900/40 p-2 rounded mb-2">
                    Modbus Offset = (D주소값 - dAddressBase) + modbusOffset
                  </code>
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    예: D400을 읽을 때, dAddressBase=0, modbusOffset=0이면 → (400 - 0) + 0 = 400
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="pt-2">
            <button
              onClick={handleTestConnection}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors text-sm font-medium"
            >
              PLC 연결 테스트
            </button>
          </div>
        </div>

        {/* 모니터링 설정 */}
        <div className="bg-card p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">모니터링 설정</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="polling"
                className="text-sm font-medium block mb-1.5"
              >
                폴링 주기 (밀리초)
              </label>
              <input
                type="number"
                id="polling"
                value={localSettings.pollingInterval}
                onChange={(e) =>
                  handleChange("pollingInterval", parseInt(e.target.value))
                }
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
              <label
                htmlFor="retention"
                className="text-sm font-medium block mb-1.5"
              >
                차트 데이터 포인트 수
              </label>
              <input
                type="number"
                id="retention"
                value={localSettings.dataRetention}
                onChange={(e) =>
                  handleChange("dataRetention", parseInt(e.target.value))
                }
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
              <label
                htmlFor="sujul-min"
                className="text-sm font-medium block mb-1.5"
              >
                최소 온도 (°C)
              </label>
              <input
                type="number"
                id="sujul-min"
                value={localSettings.sujulTempMin}
                onChange={(e) =>
                  handleChange("sujulTempMin", parseInt(e.target.value))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="sujul-max"
                className="text-sm font-medium block mb-1.5"
              >
                최대 온도 (°C)
              </label>
              <input
                type="number"
                id="sujul-max"
                value={localSettings.sujulTempMax}
                onChange={(e) =>
                  handleChange("sujulTempMax", parseInt(e.target.value))
                }
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
              <label
                htmlFor="yeolpung-min"
                className="text-sm font-medium block mb-1.5"
              >
                최소 온도 (°C)
              </label>
              <input
                type="number"
                id="yeolpung-min"
                value={localSettings.yeolpungTempMin}
                onChange={(e) =>
                  handleChange("yeolpungTempMin", parseInt(e.target.value))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="yeolpung-max"
                className="text-sm font-medium block mb-1.5"
              >
                최대 온도 (°C)
              </label>
              <input
                type="number"
                id="yeolpung-max"
                value={localSettings.yeolpungTempMax}
                onChange={(e) =>
                  handleChange("yeolpungTempMax", parseInt(e.target.value))
                }
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
              <label
                htmlFor="log-retention"
                className="text-sm font-medium block mb-1.5"
              >
                로그 보관 기간 (일)
              </label>
              <input
                type="number"
                id="log-retention"
                value={localSettings.logRetention}
                onChange={(e) =>
                  handleChange("logRetention", parseInt(e.target.value))
                }
                min="1"
                max="365"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                이전 데이터는 자동으로 삭제됩니다.
              </p>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.startFullScreen}
                onChange={(e) =>
                  handleChange("startFullScreen", e.target.checked)
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">
                모니터링 시작 시 전체 화면으로 전환
              </span>
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              모니터링 페이지에 진입할 때 자동으로 전체 화면 모드를 시도합니다.
              (브라우저 정책에 따라 차단될 수 있음)
            </p>
          </div>
        </div>

        {/* 차트 주소 매핑 설정 */}
        <div className="bg-card rounded-lg shadow-sm border p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">차트 주소 매핑</h2>
            <span className="text-xs text-muted-foreground">
              {localSettings.chartConfigs?.length || 0}개 차트 설정됨
            </span>
          </div>

          {/* 차트 타입별 섹션 */}
          <div className="space-y-6">
            {/* 전력 차트 */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                전력 (Power)
              </h3>
              <div className="space-y-3">
                {localSettings.chartConfigs
                  ?.filter((c) => c.type === "power")
                  .map((config, idx) => {
                    const actualIndex = localSettings.chartConfigs!.findIndex(
                      (c) => c.id === config.id
                    );
                    return (
                      <div
                        key={config.id}
                        className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded"
                      >
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            이름
                          </label>
                          <input
                            type="text"
                            value={config.name}
                            onChange={(e) =>
                              handleChartConfigChange(
                                actualIndex,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="차트 이름"
                            className="w-full h-8 text-sm bg-background border rounded px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            순방향 유효전력량 주소
                          </label>
                          <input
                            type="text"
                            value={config.address}
                            onChange={(e) =>
                              handleChartConfigChange(
                                actualIndex,
                                "address",
                                e.target.value
                              )
                            }
                            placeholder="예: D4032"
                            className="w-full h-8 text-sm bg-background border rounded px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            누적 측정값 주소
                          </label>
                          <input
                            type="text"
                            value={config.accumulationAddress || ""}
                            onChange={(e) =>
                              handleChartConfigChange(
                                actualIndex,
                                "accumulationAddress",
                                e.target.value
                              )
                            }
                            placeholder="예: D6100"
                            className="w-full h-8 text-sm bg-background border rounded px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <span className="flex-1">차트에서 표시됨</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 수절 건조로 차트 */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                수절 건조로 (온도)
              </h3>
              <div className="space-y-3">
                {localSettings.chartConfigs
                  ?.filter((c) => c.type === "sujul")
                  .map((config) => {
                    const actualIndex = localSettings.chartConfigs!.findIndex(
                      (c) => c.id === config.id
                    );
                    return (
                      <div
                        key={config.id}
                        className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded"
                      >
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            이름
                          </label>
                          <input
                            type="text"
                            value={config.name}
                            onChange={(e) =>
                              handleChartConfigChange(
                                actualIndex,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="예: 수절 1"
                            className="w-full h-8 text-sm bg-background border rounded px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            현재값 주소
                          </label>
                          <input
                            type="text"
                            value={config.address}
                            onChange={(e) =>
                              handleChartConfigChange(
                                actualIndex,
                                "address",
                                e.target.value
                              )
                            }
                            placeholder="예: D400"
                            className="w-full h-8 text-sm bg-background border rounded px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            설정값 주소
                          </label>
                          <input
                            type="text"
                            value={config.setAddress || ""}
                            onChange={(e) =>
                              handleChartConfigChange(
                                actualIndex,
                                "setAddress",
                                e.target.value
                              )
                            }
                            placeholder="예: D401"
                            className="w-full h-8 text-sm bg-background border rounded px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <span>
                            임계값: {SUJUL_TEMP_MIN}~{SUJUL_TEMP_MAX}°C
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 열풍 건조로 차트 */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                열풍 건조로 (온도)
              </h3>
              <div className="space-y-3">
                {localSettings.chartConfigs
                  ?.filter((c) => c.type === "yeolpung")
                  .map((config) => {
                    const actualIndex = localSettings.chartConfigs!.findIndex(
                      (c) => c.id === config.id
                    );
                    return (
                      <div
                        key={config.id}
                        className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded"
                      >
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            이름
                          </label>
                          <input
                            type="text"
                            value={config.name}
                            onChange={(e) =>
                              handleChartConfigChange(
                                actualIndex,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="예: 열풍 1"
                            className="w-full h-8 text-sm bg-background border rounded px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            현재값 주소
                          </label>
                          <input
                            type="text"
                            value={config.address}
                            onChange={(e) =>
                              handleChartConfigChange(
                                actualIndex,
                                "address",
                                e.target.value
                              )
                            }
                            placeholder="예: D430"
                            className="w-full h-8 text-sm bg-background border rounded px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            설정값 주소
                          </label>
                          <input
                            type="text"
                            value={config.setAddress || ""}
                            onChange={(e) =>
                              handleChartConfigChange(
                                actualIndex,
                                "setAddress",
                                e.target.value
                              )
                            }
                            placeholder="예: D431"
                            className="w-full h-8 text-sm bg-background border rounded px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <span>
                            임계값: {YEOLPUNG_TEMP_MIN}~{YEOLPUNG_TEMP_MAX}°C
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 설명 */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs dark:bg-blue-900/20 dark:border-blue-800">
              <p className="font-medium text-blue-800 dark:text-blue-500 mb-1">
                💡 차트 주소 매핑 가이드
              </p>
              <ul className="list-disc list-inside text-blue-700 dark:text-blue-400 space-y-1">
                <li>
                  <strong>순방향 유효전력량 주소</strong> (전력): 현재 전력 사용량을 읽는 주소 (예: D4032)
                </li>
                <li>
                  <strong>누적 측정값 주소</strong> (전력): 일일 누적 전력량을 폴링하는 주소 (예: D6100)
                </li>
                <li>
                  <strong>현재값 주소</strong> (온도): PLC에서 현재 센서 값을 읽는 주소
                </li>
                <li>
                  <strong>설정값 주소</strong> (온도): PLC에 목표 설정값이 저장된 주소
                </li>
                <li>
                  주소 형식:{" "}
                  <code className="bg-blue-100 px-1 rounded">D400</code>,{" "}
                  <code className="bg-blue-100 px-1 rounded">D401</code> 등
                </li>
                <li>변경 후 반드시 &quot;설정 저장&quot; 버튼을 클릭하세요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Toast 메시지 */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
