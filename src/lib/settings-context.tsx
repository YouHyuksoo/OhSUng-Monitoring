"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface ChartConfig {
  id: string;
  name: string;
  type: "power" | "sujul" | "yeolpung";
  address: string;
  setAddress?: string;
}

export interface Settings {
  plcIp: string;
  plcPort: number;
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
  plcIp: "127.0.0.1",
  plcPort: 502,
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
  isDemoMode: boolean;
  toggleDemoMode: () => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const toggleDemoMode = () => setIsDemoMode((prev) => !prev);

  // Load settings from server on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          // Merge with default settings to ensure new fields are present
          setSettings({ ...defaultSettings, ...data });
        }
      } catch (error) {
        console.error("Failed to load settings from server:", error);
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
      value={{ settings, updateSettings, isDemoMode, toggleDemoMode }}
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
