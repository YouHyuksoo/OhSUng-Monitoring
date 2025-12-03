/**
 * @file src/lib/settings-store.ts
 * @description
 * Zustand를 사용한 설정 관리 store
 * - 서버에서 설정 로드
 * - 설정 변경 시 자동 저장 (디바운싱)
 * - chartConfigs 기본값 처리
 *
 * 주의: 함수 참조 안정성을 위해 actions을 별도로 작성
 * - useSettings hook의 의존성 배열에 함수를 넣지 않으려면
 * - 함수들이 항상 같은 참조를 유지해야 함
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface ChartConfig {
  id: string;
  name: string;
  type: "power" | "sujul" | "yeolpung";
  address: string;
  setAddress?: string;
  accumulationAddress?: string;
}

export interface ModbusAddressMapping {
  dAddressBase: number;
  modbusOffset: number;
}

export interface Settings {
  appTitle: string;
  plcIp: string;
  plcPort: number;
  plcType: "mc" | "modbus" | "demo";
  modbusAddressMapping?: ModbusAddressMapping;
  pollingInterval: number; // @deprecated plcPollingInterval 사용 권장
  plcPollingInterval: number; // PLC로부터 데이터를 폴링하는 주기 (밀리초)
  monitoringRefreshInterval: number; // 모니터링 화면에서 DB 데이터를 조회하는 주기 (밀리초)
  dataRetention: number;
  sujulTempMin: number;
  sujulTempMax: number;
  yeolpungTempMin: number;
  yeolpungTempMax: number;
  autoSave: boolean;
  logRetention: number;
  startFullScreen: boolean;
  chartConfigs: ChartConfig[];
  // 차트 데이터 표시 설정
  tempDataLimit: number; // 온도 차트 표시 개수 (기본값: 6)
  powerDataHours: number; // 실시간 전력량 표시 시간 범위 (기본값: 6시간)
}

const DEFAULT_SETTINGS: Settings = {
  appTitle: "전력/온도 모니터링",
  plcIp: "127.0.0.1",
  plcPort: 502,
  plcType: "demo",
  modbusAddressMapping: {
    dAddressBase: 0,
    modbusOffset: 0,
  },
  pollingInterval: 2000, // 하위 호환성 유지
  plcPollingInterval: 2000, // PLC 폴링 주기 (기본값: 2초)
  monitoringRefreshInterval: 10000, // 모니터링 갱신 주기 (기본값: 10초)
  dataRetention: 20,
  sujulTempMin: 30,
  sujulTempMax: 50,
  yeolpungTempMin: 40,
  yeolpungTempMax: 60,
  autoSave: true,
  logRetention: 30,
  startFullScreen: true,
  tempDataLimit: 6, // 온도 차트 표시 개수
  powerDataHours: 6, // 실시간 전력량 표시 시간 (6시간)
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

interface SettingsStore {
  settings: Settings;
  isLoaded: boolean;
  isLoading: boolean; // 로딩 중 플래그 추가
  isSaving: boolean;
  error?: string;

  // actions
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  setError: (error?: string) => void;
}

let saveTimeoutId: NodeJS.Timeout | null = null;
let lastSavedSettings: Settings | null = null;

export const useSettingsStore = create<SettingsStore>()(
  immer((set, get) => ({
    settings: DEFAULT_SETTINGS,
    isLoaded: false,
    isLoading: false, // 초기 로딩 상태
    isSaving: false,
    error: undefined,

    /**
     * 서버에서 설정 로드
     * - 중복 호출 방지: 이미 로딩 중이거나 로드 완료된 경우 스킵
     */
    loadSettings: async () => {
      const currentState = get();

      // 이미 로딩 중이거나 로드 완료된 경우 중복 호출 방지
      if (currentState.isLoading || currentState.isLoaded) {
        if (process.env.NODE_ENV === "development") {
          console.log("[SettingsStore] Already loading or loaded, skipping...");
        }
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[SettingsStore] Starting to load settings...");
      }

      // 로딩 시작
      set((state) => {
        state.isLoading = true;
      });

      try {
        const response = await fetch("/api/settings");
        if (!response.ok) throw new Error("Failed to load settings");

        const serverData = await response.json();

        if (process.env.NODE_ENV === "development") {
          console.log("[SettingsStore] Loaded from server:", serverData);
        }

        // chartConfigs가 비어있으면 기본값으로 보충
        const loadedSettings: Settings = {
          ...DEFAULT_SETTINGS,
          ...serverData,
          chartConfigs:
            serverData.chartConfigs && serverData.chartConfigs.length > 0
              ? serverData.chartConfigs
              : DEFAULT_SETTINGS.chartConfigs,
        };

        if (process.env.NODE_ENV === "development") {
          console.log(
            "[SettingsStore] Applied settings. plcType:",
            loadedSettings.plcType
          );
        }

        set((state) => {
          state.settings = loadedSettings;
          state.isLoaded = true;
          state.isLoading = false;
          state.error = undefined;
        });

        lastSavedSettings = loadedSettings;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to load settings";
        console.error("Failed to load settings from server:", errorMsg);

        set((state) => {
          state.settings = DEFAULT_SETTINGS;
          state.isLoaded = true;
          state.isLoading = false;
          state.error = errorMsg;
        });
      }
    },

    /**
     * 설정 업데이트 및 자동 저장
     * - 디바운싱(500ms)으로 불필요한 저장 방지
     * - 마지막 저장한 설정과 다를 때만 저장
     */
    updateSettings: async (newSettings: Partial<Settings>) => {
      set((state) => {
        state.settings = { ...state.settings, ...newSettings };
      });

      // 기존 타이머 취소
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }

      // 500ms 후 저장 (디바운싱)
      saveTimeoutId = setTimeout(async () => {
        try {
          const currentSettings = get().settings;

          // 마지막 저장한 설정과 동일하면 저장 안 함
          if (
            lastSavedSettings &&
            JSON.stringify(lastSavedSettings) ===
              JSON.stringify(currentSettings)
          ) {
            if (process.env.NODE_ENV === "development") {
              console.log("[SettingsStore] Settings unchanged, skipping save");
            }
            return;
          }

          if (process.env.NODE_ENV === "development") {
            console.log("[SettingsStore] Saving settings to server...");
          }

          set((state) => {
            state.isSaving = true;
          });

          const response = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentSettings),
          });

          if (!response.ok) throw new Error("Failed to save settings");

          lastSavedSettings = currentSettings;

          if (process.env.NODE_ENV === "development") {
            console.log("[SettingsStore] Settings saved successfully");
          }

          set((state) => {
            state.isSaving = false;
            state.error = undefined;
          });
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Failed to save settings";
          console.error(errorMsg);

          set((state) => {
            state.isSaving = false;
            state.error = errorMsg;
          });
        }
      }, 500);
    },

    /**
     * 에러 설정
     */
    setError: (error?: string) => {
      set((state) => {
        state.error = error;
      });
    },
  }))
);
