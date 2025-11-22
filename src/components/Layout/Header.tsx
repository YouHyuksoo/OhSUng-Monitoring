/**
 * @file src/components/Layout/Header.tsx
 * @description
 * 헤더 컴포넌트 - 네비게이션, PLC 연결 상태, 테마 토글 포함
 */

"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { useSettings } from "@/lib/settings-context";
import { usePLCConnection } from "@/lib/plc-connection-context";
import { Moon, Sun, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { connectionStatus } = usePLCConnection();

  // 현재 페이지 타이틀 가져오기
  const getPageTitle = () => {
    if (pathname === "/monitoring") return "실시간 모니터링";
    if (pathname === "/settings") return "설정 관리";
    if (pathname === "/help") return "도움말";
    return "PLC Monitor";
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 flex items-center gap-6">
          {/* 현재 페이지 타이틀 */}
          {mounted && (
            <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
          )}
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/monitoring"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              모니터링
            </Link>
            <Link
              href="/settings"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              설정
            </Link>
            <Link
              href="/logs"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              로그
            </Link>
            <Link
              href="/help"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              도움말
            </Link>
          </nav>

          {/* 테마 토글 버튼 */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9"
          >
            {mounted && theme === "dark" ? (
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
