/**
 * @file src/lib/useSettings.ts
 * @description
 * 설정 store를 사용하는 hook
 * - useSettingsStore 대신 이 hook으로 사용 권장
 * - loadSettings, updateSettings 제공
 */

import { useEffect } from "react";
import { useSettingsStore } from "./settings-store";

/**
 * 설정을 관리하는 hook
 * - 초기 로드 시 자동으로 서버에서 설정 로드
 * - updateSettings로 설정 변경 (자동 저장)
 */
export function useSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const isSaving = useSettingsStore((state) => state.isSaving);
  const error = useSettingsStore((state) => state.error);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const setError = useSettingsStore((state) => state.setError);

  // 초기 로드
  useEffect(() => {
    if (!isLoaded) {
      loadSettings();
    }
  }, [isLoaded, loadSettings]);

  return {
    settings,
    isLoaded,
    isSaving,
    error,
    loadSettings,
    updateSettings,
    setError,
  };
}
