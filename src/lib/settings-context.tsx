"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * 차트 설정 인터페이스
 * - address: 현재값 또는 측정값 주소
 * - setAddress: 온도 설정값 주소 (온도 차트에만 사용)
 * - accumulationAddress: 누적 측정값 주소 (전력 차트에만 사용)
 */
export interface ChartConfig {
  id: string;
  name: string;
  type: "power" | "sujul" | "yeolpung";
  address: string;
  setAddress?: string;
  accumulationAddress?: string;
}

/**
 * Modbus 주소 매핑 인터페이스
 * - dAddressBase: D 주소의 기본값 (예: D0000)
 * - modbusOffset: Modbus 오프셋 (예: 0)
 * 계산: D주소(십진수) - dAddressBase(십진수) + modbusOffset = Modbus 오프셋
 * 예: D400을 읽으려면: 400 - 0 + 0 = 400
 */
export interface ModbusAddressMapping {
  dAddressBase: number;  // D 주소 기본값 (기본: 0)
  modbusOffset: number;  // Modbus 오프셋 추가값 (기본: 0)
}

export interface Settings {
  appTitle: string;
  plcIp: string;
  plcPort: number;
  /**
   * PLC 통신 프로토콜 타입
   * - "mc": Mitsubishi MC Protocol (mcprotocol)
   * - "modbus": LS ELECTRIC XGT Modbus TCP (modbus-serial)
   * - "demo": Mock PLC (테스트용 시뮬레이션)
   */
  plcType: "mc" | "modbus" | "demo";
  /**
   * Modbus TCP 사용 시 D 주소 → Modbus 오프셋 변환 규칙
   */
  modbusAddressMapping?: ModbusAddressMapping;
  pollingInterval: number;
  dataRetention: number;
  sujulTempMin: number;
  sujulTempMax: number;
  yeolpungTempMin: number;
  yeolpungTempMax: number;
  autoSave: boolean;
  logRetention: number;
  startFullScreen: boolean;
  chartConfigs: ChartConfig[];
}

const defaultSettings: Settings = {
  appTitle: "PLC 모니터링",
  plcIp: "127.0.0.1",
  plcPort: 502,
  plcType: "demo",
  modbusAddressMapping: {
    dAddressBase: 0,
    modbusOffset: 0,
  },
  pollingInterval: 2000,
  dataRetention: 20,
  sujulTempMin: 30,
  sujulTempMax: 50,
  yeolpungTempMin: 40,
  yeolpungTempMax: 60,
  autoSave: true,
  logRetention: 30,
  startFullScreen: true,
  chartConfigs: [
    {
      id: "power-1",
      name: "순방향 유효전력량",
      type: "power",
      address: "D4032",
      accumulationAddress: "D6100",
    },
    {
      id: "sujul-1",
      name: "수절 1",
      type: "sujul",
      address: "D400",
      setAddress: "D401",
    },
    {
      id: "sujul-2",
      name: "수절 2",
      type: "sujul",
      address: "D410",
      setAddress: "D411",
    },
    {
      id: "sujul-3",
      name: "수절 3",
      type: "sujul",
      address: "D420",
      setAddress: "D421",
    },
    {
      id: "yeolpung-1",
      name: "열풍 1",
      type: "yeolpung",
      address: "D430",
      setAddress: "D431",
    },
    {
      id: "yeolpung-2",
      name: "열풍 2",
      type: "yeolpung",
      address: "D440",
      setAddress: "D441",
    },
    {
      id: "yeolpung-3",
      name: "열풍 3",
      type: "yeolpung",
      address: "D450",
      setAddress: "D451",
    },
    {
      id: "yeolpung-4",
      name: "열풍 4",
      type: "yeolpung",
      address: "D460",
      setAddress: "D461",
    },
    {
      id: "yeolpung-5",
      name: "열풍 5",
      type: "yeolpung",
      address: "D470",
      setAddress: "D471",
    },
  ],
};

type SettingsContextType = {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * 서버에서 설정을 로드합니다.
   * - 서버에서 받은 데이터를 그대로 사용 (서버가 진실의 원천)
   * - 서버가 비정상 응답 시에만 기본값 사용
   * - chartConfigs가 비어있으면 기본값으로 보충
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const serverData = await response.json();
          console.log("[SettingsContext] Loaded from server:", serverData);

          // chartConfigs가 비어있으면 기본값으로 보충
          // (서버에서 chartConfigs: []를 반환할 수 있으므로 명시적으로 처리)
          const loadedSettings: Settings = {
            ...serverData,
            chartConfigs:
              serverData.chartConfigs && serverData.chartConfigs.length > 0
                ? serverData.chartConfigs
                : defaultSettings.chartConfigs,
          };

          console.log("[SettingsContext] Applied settings:", loadedSettings);
          console.log("[SettingsContext] plcType:", loadedSettings.plcType);

          setSettings(loadedSettings);
        }
      } catch (error) {
        console.error("Failed to load settings from server:", error);
        // 서버 통신 실패 시에만 클라이언트 기본값 사용
        setSettings(defaultSettings);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Save settings to server whenever they change
  useEffect(() => {
    if (isLoaded) {
      const saveSettings = async () => {
        try {
          await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings),
          });
        } catch (error) {
          console.error("Failed to save settings to server:", error);
        }
      };

      saveSettings();
    }
  }, [settings, isLoaded]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
