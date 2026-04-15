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
  accumulationAddress?: string; // 일별 누적 주소 (D6100: 매일 23:59 리셋)
  hourlyAddress?: string;       // 시간별 누적 주소 (D6102: 매 시간 리셋)
  isDword?: boolean;            // 32bit DWORD 주소 여부
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
  logRetention: number; // 로그 보관 일수
  startFullScreen: boolean;
  chartConfigs: ChartConfig[];
  // 차트 데이터 표시 설정
  tempDataLimit: number; // 온도 차트 표시 개수 (기본값: 6)
  powerDataHours: number; // 실시간 전력량 표시 시간 범위 (기본값: 6시간)
  // 온도 차트 Y축 범위 설정
  tempChartYMin: number; // 온도 차트 Y축 최소값 (기본값: 0)
  tempChartYMax: number; // 온도 차트 Y축 최대값 (기본값: 100)
  // 폴링 데이터 소스 선택
  useMemoryPolling?: boolean; // true: 메모리의 최근 20개 데이터 사용 (빠름), false: DB 사용 (안정성, 기본값)
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
  logRetention: 30, // 로그 보관 일수 (기본값: 30일)
  startFullScreen: true,
  tempDataLimit: 6, // 온도 차트 표시 개수
  powerDataHours: 1, // 실시간 전력량 표시 시간 (1시간)
  tempChartYMin: 0, // 온도 차트 Y축 최소값
  tempChartYMax: 100, // 온도 차트 Y축 최대값
  useMemoryPolling: false, // 데이터 소스: false = DB (기본값), true = 메모리
  chartConfigs: [
    // ⚡ 전력 데이터 (WORD 주소 기준)
    // 규칙: PC 주소 - 6000 = WORD
    {
      id: "power-1",
      name: "순방향 유효전력량",
      type: "power",
      address: "24",  // WORD 24 (D6024: PC 주소 기준, 순방향 유효전력량)
      accumulationAddress: "50",  // WORD 50 (D6050: PC 주소 기준, TOTAL 누적전력)
    },

    // 🌡️ 수절 건조로 (현재값: 주황색 박스 / 설정값: 노란색 박스)
    // 규칙: PC 주소 - 6000 = WORD
    // 현재값: D6050, D6051, D6052 → WORD 50, 51, 52
    // 설정값: D6060, D6061, D6062 → WORD 60, 61, 62
    {
      id: "sujul-1",
      name: "수절 1 (현재값)",
      type: "sujul",
      address: "50",  // WORD 50 (D6050: 수절건조로 (1) 현재온도)
      setAddress: "60",  // WORD 60 (D6060: 수절건조로 (1) 설정온도)
    },
    {
      id: "sujul-2",
      name: "수절 2 (현재값)",
      type: "sujul",
      address: "51",  // WORD 51 (D6051: 수절건조로 (2) 현재온도)
      setAddress: "61",  // WORD 61 (D6061: 수절건조로 (2) 설정온도)
    },
    {
      id: "sujul-3",
      name: "수절 3 (현재값)",
      type: "sujul",
      address: "52",  // WORD 52 (D6052: 수절건조로 (3) 현재온도)
      setAddress: "62",  // WORD 62 (D6062: 수절건조로 (3) 설정온도)
    },

    // 🌡️ 열풍 건조로 (현재값: 주황색 박스 / 설정값: 노란색 박스)
    // 현재값: D6053, D6054, D6055, D6056, D6057 → WORD 53, 54, 55, 56, 57
    // 설정값: D6063, D6064, D6065, D6066, D6067 → WORD 63, 64, 65, 66, 67
    {
      id: "yeolpung-1",
      name: "열풍 1 (현재값)",
      type: "yeolpung",
      address: "53",  // WORD 53 (D6053: 소부건조로 (1) 현재온도)
      setAddress: "63",  // WORD 63 (D6063: 소부건조로 (1) 설정온도)
    },
    {
      id: "yeolpung-2",
      name: "열풍 2 (현재값)",
      type: "yeolpung",
      address: "54",  // WORD 54 (D6054: 소부건조로 (2) 현재온도)
      setAddress: "64",  // WORD 64 (D6064: 소부건조로 (2) 설정온도)
    },
    {
      id: "yeolpung-3",
      name: "열풍 3 (현재값)",
      type: "yeolpung",
      address: "55",  // WORD 55 (D6055: 소부건조로 (3) 현재온도)
      setAddress: "65",  // WORD 65 (D6065: 소부건조로 (3) 설정온도)
    },
    {
      id: "yeolpung-4",
      name: "열풍 4 (현재값)",
      type: "yeolpung",
      address: "56",  // WORD 56 (D6056: 소부건조로 (4) 현재온도)
      setAddress: "66",  // WORD 66 (D6066: 소부건조로 (4) 설정온도)
    },
    {
      id: "yeolpung-5",
      name: "열풍 5 (현재값)",
      type: "yeolpung",
      address: "57",  // WORD 57 (D6057: 소부건조로 (5) 현재온도)
      setAddress: "67",  // WORD 67 (D6067: 소부건조로 (5) 설정온도)
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

        // 에러 시 기존 settings 유지 (DEFAULT_SETTINGS로 덮어쓰지 않음)
        set((state) => {
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
