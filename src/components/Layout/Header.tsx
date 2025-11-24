/**
 * @file src/components/Layout/Header.tsx
 * @description
 * 헤더 컴포넌트 - 네비게이션, PLC 연결 상태, 테마 토글, 로그아웃 기능 포함
 */

"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { useSettings } from "@/lib/settings-context";
import { Moon, Sun, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  /**
   * 현재 페이지에 따른 타이틀 가져오기
   * - settings.appTitle: 설정에서 지정한 애플리케이션 이름
   * - 각 페이지별 상세 이름
   */
  /**
   * 현재 페이지가 로그인 페이지인지 확인
   */
  const isLoginPage = pathname === "/admin/login";

  const getPageTitle = () => {
    const appTitle = settings.appTitle || "모니터링";
    if (pathname === "/monitoring") return `${appTitle} -전력/온도 `;
    if (pathname === "/settings") return `${appTitle} - 설정 관리`;
    if (pathname === "/help") return `${appTitle} - 도움말`;
    if (pathname === "/admin") return `${appTitle} - 관리자`;
    if (isLoginPage) return `${appTitle} - 로그인`;
    return appTitle;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 로그아웃 처리
   * - 폴링 중인 API 요청 취소
   * - localStorage 초기화
   * - 현재 탭 닫기
   */
  const handleLogout = () => {
    // 모든 폴링 중인 요청 취소
    if (window.abortControllers) {
      Object.values(window.abortControllers).forEach((controller: any) => {
        if (controller instanceof AbortController) {
          controller.abort();
        }
      });
    }

    // localStorage 초기화
    localStorage.clear();

    // 현재 탭 닫기
    window.close();
  };

  return (
    <header className="border-b bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-950 shadow-md">
      <div className="flex h-16 items-center justify-between">
        {/* 좌측: 타이틀만 */}
        <div className="flex items-center pl-6">
          {/* 현재 페이지 타이틀 */}
          {mounted && (
            <h1 className="text-3xl font-bold text-white">{getPageTitle()}</h1>
          )}
        </div>

        {/* 중앙 및 우측: 네비게이션 + 컨트롤 (로그인 페이지에서는 숨김) */}
        {!isLoginPage && (
          <div className="flex items-center gap-8">
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
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-500 hover:bg-blue-400 text-white h-9 w-9"
              title="테마 전환"
            >
              {mounted && theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </button>

            {/* 로그아웃 버튼 */}
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-blue-400 hover:bg-blue-300 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-3 h-9"
              title="로그아웃"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">로그아웃</span>
            </button>
          </div>
        )}
      </div>

      {/* 로그아웃 확인 다이얼로그 */}
      {showLogoutDialog && (
        <ConfirmDialog
          title="로그아웃"
          message="정말로 로그아웃하시겠습니까? 진행 중인 모니터링이 중지됩니다."
          confirmText="로그아웃"
          cancelText="취소"
          variant="danger"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutDialog(false)}
        />
      )}
    </header>
  );
}
