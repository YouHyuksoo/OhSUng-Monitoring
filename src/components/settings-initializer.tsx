"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/lib/settings-store";

/**
 * @file src/components/settings-initializer.tsx
 * @description
 * 앱 초기화 시 설정을 로드하는 전용 컴포넌트입니다.
 * - UI를 렌더링하지 않습니다 (return null).
 * - 앱의 최상위(layout.tsx)에 배치되어야 합니다.
 * - useSettings 훅에서 로딩 로직을 분리하여 중복 호출을 근본적으로 방지합니다.
 */
export function SettingsInitializer() {
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const isLoading = useSettingsStore((state) => state.isLoading);

  // Strict Mode 등에서의 이중 호출 방지를 위한 ref
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && !isLoaded && !isLoading) {
      if (process.env.NODE_ENV === "development") {
        console.log("[SettingsInitializer] Initializing settings...");
      }
      initializedRef.current = true;
      loadSettings();
    }
  }, [loadSettings, isLoaded, isLoading]);

  return null;
}
