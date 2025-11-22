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

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSettings } from "./settings-context";
import { logger } from "@/lib/logger";

/**
 * 연결 상태 타입
 */
export type ConnectionState = "connecting" | "connected" | "disconnected";

/**
 * PLC 연결 상태 인터페이스
 */
export interface PLCConnectionStatus {
  state: ConnectionState;
  error?: string;
  lastChecked?: Date;
}

/**
 * Context 타입
 */
type PLCConnectionContextType = {
  connectionStatus: PLCConnectionStatus;
  requestConnectionCheck: (reason: string) => void;
  reportSuccess: () => void;
};

const PLCConnectionContext = createContext<
  PLCConnectionContextType | undefined
>(undefined);

/**
 * PLC 연결 상태 Provider 컴포넌트
 * 애플리케이션 최상단에 배치되어야 함
 */
export function PLCConnectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [connectionStatus, setConnectionStatus] = useState<PLCConnectionStatus>(
    {
      state: "disconnected", // 초기: 연결 대기 중 (폴링 안 함)
      error: "PLC 연결 중...",
    }
  );
  const { settings, isDemoMode } = useSettings();

  // 재시도 타이머 ref
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 컴포넌트 마운트 상태 ref
  const isMountedRef = useRef(true);

  /**
   * PLC 연결 상태 체크 함수
   * - 성공 시: connected 상태로 변경
   * - 실패 시: disconnected 상태로 변경하고 재시도 예약
   */
  const checkConnection = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      // IP/Port 재검증 (데모 모드일 때는 패스)
      if (!isDemoMode && (!settings.plcIp || !settings.plcPort)) {
        throw new Error("PLC IP 또는 Port가 설정되지 않음");
      }

      // 연결 확인 전용 엔드포인트 호출
      let url = `/api/plc?check=true&ip=${settings.plcIp}&port=${settings.plcPort}`;
      if (isDemoMode) {
        url += "&demo=true";
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

      try {
        const res = await fetch(url, { signal: controller.signal });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `HTTP Error: ${res.status}`);
        }

        const json = await res.json();

        // 연결 확인 응답 검증
        if (!json.connected) {
          throw new Error("PLC reported disconnected");
        }

        // ✅ 연결 성공
        if (isMountedRef.current) {
          setConnectionStatus((prev) => {
            // 이미 연결된 상태라면 업데이트 하지 않음 (불필요한 렌더링 방지)
            if (prev.state === "connected") return prev;

            logger.success("PLC 연결 성공", "PLCConnectionContext");
            return {
              state: "connected",
              lastChecked: new Date(),
              error: undefined,
            };
          });
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // ❌ 연결 실패
      if (isMountedRef.current) {
        const errorMsg =
          error instanceof Error ? error.message : "PLC 연결 실패";

        logger.error("PLC 연결 실패", "PLCConnectionContext", errorMsg);

        setConnectionStatus({
          state: "disconnected",
          error: errorMsg,
          lastChecked: new Date(),
        });

        // 2초 후 재시도 (기존 타이머 제거 후 설정)
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          checkConnection();
        }, 5000);
      }
    }
  }, [settings.plcIp, settings.plcPort, settings.chartConfigs, isDemoMode]);

  /**
   * 외부(컴포넌트)에서 에러 보고 시 호출
   * - 즉시 연결 끊김 처리 및 재연결 시도 시작
   */
  /**
   * 외부(컴포넌트)에서 연결 확인 요청 시 호출
   * - 폴링 실패 시 호출됨
   * - 즉시 연결 끊김으로 처리하지 않고, Context가 직접 연결 상태를 확인하도록 요청
   */
  const requestConnectionCheck = useCallback(
    (reason: string) => {
      if (!isMountedRef.current) return;

      logger.warning(`연결 확인 요청: ${reason}`, "PLCConnectionContext");

      // 이미 끊긴 상태면 무시 (재시도 로직이 이미 돌고 있음)
      if (connectionStatus.state === "disconnected") return;

      // 즉시 재연결 시도 시작 (디바운싱 적용)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        checkConnection();
      }, 1000); // 1초 디바운스
    },
    [connectionStatus.state, checkConnection]
  );

  /**
   * 외부(컴포넌트)에서 성공 보고 시 호출
   * - 연결 상태 갱신 (disconnected -> connected)
   */
  const reportSuccess = useCallback(() => {
    if (!isMountedRef.current) return;

    setConnectionStatus((prev) => {
      if (prev.state === "connected") return prev;

      logger.success("PLC 재연결 성공", "PLCConnectionContext");
      return {
        state: "connected",
        lastChecked: new Date(),
        error: undefined,
      };
    });
  }, []);

  // 초기 진입 및 설정 변경 시 연결 시도
  useEffect(() => {
    isMountedRef.current = true;

    // 설정 검증
    if (
      !settings.plcIp ||
      !settings.plcPort ||
      !settings.chartConfigs?.length
    ) {
      setConnectionStatus({
        state: "disconnected",
        error: "설정이 불완전합니다. 설정 페이지를 확인하세요.",
      });
      return;
    }

    // 🚀 즉시 연결 시도
    checkConnection();

    // 정리 함수
    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [
    checkConnection,
    settings.plcIp,
    settings.plcPort,
    JSON.stringify(settings.chartConfigs),
  ]);

  return (
    <PLCConnectionContext.Provider
      value={{ connectionStatus, requestConnectionCheck, reportSuccess }}
    >
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
