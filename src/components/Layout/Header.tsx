/**
 * @file src/components/Layout/Header.tsx
 * @description
 * 헤더 컴포넌트 - 네비게이션, 테마 토글 기능 포함
 */

"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { useSettings } from "@/lib/useSettings";
import { Moon, Sun, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  /**
   * 모니터링 페이지인지 확인 (독립적인 운영 페이지이므로 헤더 숨김)
   */
  const isMonitoringPage = pathname === "/monitoring";

  /**
   * 현재 페이지에 따른 타이틀 가져오기
   * - settings.appTitle: 설정에서 지정한 애플리케이션 이름
   * - 각 페이지별 상세 이름
   */
  const getPageTitle = () => {
    const appTitle = settings.appTitle || "모니터링";
    if (pathname === "/monitoring") return `${appTitle} - 전력/온도`;
    if (pathname === "/settings") return `${appTitle} - 설정 관리`;
    if (pathname === "/help") return `${appTitle} - 도움말`;
    if (pathname === "/admin") return `${appTitle} - 관리자`;
    if (pathname === "/logs") return `${appTitle} - 로그`;
    if (pathname === "/data") return `${appTitle} - 데이터 관리`;
    return appTitle;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 모니터링 페이지에서는 헤더 전체를 숨김
   */
  if (isMonitoringPage) {
    return null;
  }

  return (
    <header className="border-b bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-950 shadow-md">
      <div className="flex h-16 items-center justify-between">
        {/* 좌측: 로고/아이콘 + 타이틀 */}
        <div className="flex items-center gap-4 pl-6">
          {/* 랜딩페이지로 가는 로고/홈 버튼 */}
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white p-2 transition-colors"
            title="홈으로 이동"
          >
            {mounted && <BarChart3 className="h-6 w-6" />}
          </button>

          {/* 현재 페이지 타이틀 */}
          {mounted && (
            <h1 className="text-3xl font-bold text-white">{getPageTitle()}</h1>
          )}
        </div>

        {/* 우측: 네비게이션 + 테마 토글 */}
        <div className="flex items-center gap-8 ml-auto pr-6">
          <nav className="flex items-center gap-8 text-sm">
            <Link
              href="/monitoring"
              className={`transition-all font-medium pb-2 border-b-2 ${
                pathname === "/monitoring"
                  ? "text-white border-white"
                  : "text-blue-100 border-transparent hover:text-white hover:border-blue-200"
              }`}
            >
              모니터링
            </Link>
            <Link
              href="/admin"
              className={`transition-all font-medium pb-2 border-b-2 ${
                pathname === "/admin"
                  ? "text-white border-white"
                  : "text-blue-100 border-transparent hover:text-white hover:border-blue-200"
              }`}
            >
              관리자
            </Link>
            <Link
              href="/settings"
              className={`transition-all font-medium pb-2 border-b-2 ${
                pathname === "/settings"
                  ? "text-white border-white"
                  : "text-blue-100 border-transparent hover:text-white hover:border-blue-200"
              }`}
            >
              설정
            </Link>
            <Link
              href="/data"
              className={`transition-all font-medium pb-2 border-b-2 ${
                pathname === "/data"
                  ? "text-white border-white"
                  : "text-blue-100 border-transparent hover:text-white hover:border-blue-200"
              }`}
            >
              데이터
            </Link>
            <Link
              href="/logs"
              className={`transition-all font-medium pb-2 border-b-2 ${
                pathname === "/logs"
                  ? "text-white border-white"
                  : "text-blue-100 border-transparent hover:text-white hover:border-blue-200"
              }`}
            >
              로그
            </Link>
            <Link
              href="/help"
              className={`transition-all font-medium pb-2 border-b-2 ${
                pathname === "/help"
                  ? "text-white border-white"
                  : "text-blue-100 border-transparent hover:text-white hover:border-blue-200"
              }`}
            >
              도움말
            </Link>
          </nav>

          {/* 테마 토글 버튼 */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-400 hover:bg-blue-300 dark:bg-blue-600 dark:hover:bg-blue-500 text-white h-9 w-9"
            title={mounted ? (theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환") : "테마 전환"}
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
