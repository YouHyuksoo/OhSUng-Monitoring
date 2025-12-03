/**
 * @file src/components/Layout/Header.tsx
 * @description
 * 헤더 컴포넌트 - 네비게이션, PLC 연결 상태, 테마 토글, 로그아웃 기능 포함
 */

"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { useSettings } from "@/lib/useSettings";
import { useAuth } from "@/lib/auth-context";
import { Moon, Sun, LogOut, User, Home, BarChart3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  /**
   * 현재 페이지가 로그인 페이지인지 확인
   */
  const isLoginPage = pathname === "/admin/login";

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
    if (pathname === "/monitoring") return `${appTitle} -전력/온도 `;
    if (pathname === "/settings") return `${appTitle} - 설정 관리`;
    if (pathname === "/help") return `${appTitle} - 도움말`;
    if (pathname === "/admin") return `${appTitle} - 관리자`;
    if (isLoginPage) return `${appTitle} - 로그인`;
    return appTitle;
  };

  // 외부 클릭 감지 - 프로필 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showProfileMenu]);

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 모니터링 페이지에서는 헤더 전체를 숨김 (Hook 선언 후)
   */
  if (isMonitoringPage) {
    return null;
  }

  /**
   * 로그아웃 처리
   * - 다이얼로그 닫기
   * - 로그아웃 수행
   * - 랭딩 페이지로 이동
   */
  const handleLogout = () => {
    setShowLogoutDialog(false);
    logout();
    router.push("/");
  };

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
            <BarChart3 className="h-6 w-6" />
          </button>

          {/* 현재 페이지 타이틀 */}
          {mounted && (
            <h1 className="text-3xl font-bold text-white">{getPageTitle()}</h1>
          )}
        </div>

        {/* 중앙 및 우측: 네비게이션 + 컨트롤 (로그인 페이지에서는 숨김) */}
        {!isLoginPage && (
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
                대시보드
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

            {/* 프로필 메뉴 - 인증되었을 때만 표시 */}
            {isAuthenticated ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-400 hover:bg-blue-300 dark:bg-blue-600 dark:hover:bg-blue-500 text-white h-9 w-9"
                  title="메뉴"
                >
                  <User className="h-4 w-4" />
                </button>

                {/* 드롭다운 메뉴 */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                    <button
                      onClick={() => {
                        setTheme(theme === "dark" ? "light" : "dark");
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      {mounted && theme === "dark" ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                      {theme === "dark" ? "라이트 모드" : "다크 모드"}
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowLogoutDialog(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push("/admin/login")}
                className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-amber-500 hover:bg-amber-600 text-white px-3 h-9"
                title="로그인"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">로그인</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 로그아웃 확인 다이얼로그 */}
      {showLogoutDialog && (
        <ConfirmDialog
          title="로그아웃"
          message="정말로 로그아웃하시겠습니까?"
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
