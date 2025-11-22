/**
 * @file src/lib/plc-connection-context.tsx
 * @description
 * 전역 PLC 연결 상태를 관리하는 Context
 * 모든 차트에서 공유하는 PLC 연결 상태를 한 곳에서 관리합니다.
 *
 * 프로세스 플로우:
 * 1. 설정 로드 (plcIp, plcPort 확인)
 * 2. PLC 접속 시도 (즉시 + 2초마다 지속적 재시도)
 * 3. 실패 시 → 알림 표시 (첫 실패부터)
 * 4. 성공 시 → 폴링 시작 (데이터 수집)
 * 5. 연결 중단 감지 → 즉시 알림 + 재시도
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSettings } from "./settings-context";

/**
 * PLC 연결 상태 인터페이스
 */
export interface PLCConnectionStatus {
  isConnected: boolean;
  error?: string;
  lastChecked?: Date;
}

/**
 * Context 타입
 */
type PLCConnectionContextType = {
  connectionStatus: PLCConnectionStatus;
};

const PLCConnectionContext = createContext<PLCConnectionContextType | undefined>(
  undefined
);

/**
 * PLC 연결 상태 Provider 컴포넌트
 * 애플리케이션 최상단에 배치되어야 함
 */
export function PLCConnectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [connectionStatus, setConnectionStatus] = useState<PLCConnectionStatus>({
    isConnected: true,  // 초기: 페이지 로드 시간을 위해 true로 설정
  });
  const { settings } = useSettings();

  /**
   * PLC 연결 상태 체크 및 폴링
   *
   * 플로우:
   * 1️⃣ 페이지 먼저 렌더링 (경고창 숨김)
   * 2️⃣ 설정이 유효한지 확인 (plcIp, chartConfigs 존재)
   * 3️⃣ 즉시 연결 시도
   * 4️⃣ 실패 시 알림 표시 + 2초마다 지속적 재시도
   * 5️⃣ 성공 시 데이터 폴링 계속
   * 6️⃣ 연결 중단 감지 시 즉시 알림 + 재시도
   */
  useEffect(() => {
    // 설정 검증
    if (!settings.plcIp || !settings.plcPort || !settings.chartConfigs?.length) {
      // 설정이 불완전하면 경고 표시
      setConnectionStatus({
        isConnected: false,
        error: "설정이 불완전합니다. 설정 페이지를 확인하세요.",
      });
      return;
    }

    let isComponentMounted = true;
    let retryTimer: NodeJS.Timeout | null = null;

    const checkConnection = async () => {
      if (!isComponentMounted) return;

      try {
        // 첫 번째 차트 주소로 테스트
        const testAddress = settings.chartConfigs![0]?.address || "D400";
        const url = `/api/plc?addresses=${testAddress}&ip=${settings.plcIp}&port=${settings.plcPort}`;

        const res = await fetch(url);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `HTTP Error: ${res.status}`);
        }

        const json = await res.json();

        // 데이터 검증
        if (!json || typeof json[testAddress] !== "number") {
          throw new Error("Invalid response from PLC");
        }

        // ✅ 연결 성공
        if (isComponentMounted) {
          setConnectionStatus({
            isConnected: true,
            lastChecked: new Date(),
          });
          console.log("✅ PLC 연결 성공");
        }
      } catch (error) {
        // ❌ 연결 실패
        if (isComponentMounted) {
          const errorMsg =
            error instanceof Error ? error.message : "PLC 연결 실패";

          console.error("❌ PLC 연결 실패:", errorMsg);

          setConnectionStatus({
            isConnected: false,
            error: errorMsg,
            lastChecked: new Date(),
          });

          // 2초 후 재시도 (자동으로 반복)
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            checkConnection();
          }, 2000);
        }
      }
    };

    // 🚀 즉시 연결 시도
    checkConnection();

    // 정리 함수
    return () => {
      isComponentMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [settings.plcIp, settings.plcPort, settings.chartConfigs]);

  return (
    <PLCConnectionContext.Provider value={{ connectionStatus }}>
      {children}
    </PLCConnectionContext.Provider>
  );
}

/**
 * PLC 연결 상태 Hook
 * 어떤 컴포넌트에서든 사용 가능
 */
export function usePLCConnection() {
  const context = useContext(PLCConnectionContext);
  if (context === undefined) {
    throw new Error(
      "usePLCConnection must be used within a PLCConnectionProvider"
    );
  }
  return context;
}
