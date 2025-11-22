/**
 * @file src/components/Layout/Header.tsx
 * @description
 * 헤더 컴포넌트 - 네비게이션, PLC 연결 상태, 테마 토글 포함
 */

"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { useSettings } from "@/lib/settings-context";
import { Moon, Sun, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // 현재 페이지 타이틀 가져오기
  const getPageTitle = () => {
    if (pathname === "/monitoring") return "실시간 모니터링";
    if (pathname === "/settings") return "설정 관리";
    return "PLC Monitor";
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // PLC 연결 상태 체크 (간단한 ping)
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`/api/plc?address=D0&ip=${settings.plcIp}&port=${settings.plcPort}`);
        setIsConnected(response.ok);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000); // 5초마다 체크

    return () => clearInterval(interval);
  }, [settings.plcIp, settings.plcPort]);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 flex items-center gap-6">
          {/* 현재 페이지 타이틀 */}
          {mounted && (
            <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
          )}
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/monitoring" className="transition-colors hover:text-foreground/80 text-foreground/60">모니터링</Link>
            <Link href="/settings" className="transition-colors hover:text-foreground/80 text-foreground/60">설정</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* PLC 연결 상태 표시 */}
          {mounted && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted/50 text-xs">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">연결됨</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span className="text-red-600 dark:text-red-400 font-medium">연결 안됨</span>
                </>
              )}
              <span className="text-muted-foreground ml-2">
                {settings.plcIp}:{settings.plcPort}
              </span>
            </div>
          )}

          {/* 테마 토글 버튼 */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9"
          >
            {mounted && theme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </button>
        </div>
      </div>
    </header>
  );
}
