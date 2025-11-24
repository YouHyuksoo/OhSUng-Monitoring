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
 * - Zustand store의 상태를 구독하여 반환
 * - updateSettings로 설정 변경 (자동 저장)
 *
 * 변경 사항:
 * - 데이터 로딩 로직 제거 (SettingsInitializer로 이관)
 * - 이제 이 hook은 순수하게 상태 접근 및 업데이트 기능만 제공합니다.
 */
export function useSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const isSaving = useSettingsStore((state) => state.isSaving);
  const error = useSettingsStore((state) => state.error);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const setError = useSettingsStore((state) => state.setError);

  return {
    settings,
    isLoaded,
    isLoading,
    isSaving,
    error,
    loadSettings,
    updateSettings,
    setError,
  };
}
