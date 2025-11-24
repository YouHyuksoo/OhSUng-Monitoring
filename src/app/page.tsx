/**
 * @file src/app/page.tsx
 * @description
 * PLC 모니터링 시스템 랜딩 페이지
 * 관리자와 사용자(모니터링) 역할 분리
 *
 * 아키텍처:
 * - 관리자: /admin 페이지로 이동 (폴링 서비스 관리, 설정, DB 관리)
 * - 사용자: /monitoring 페이지로 이동 (실시간 모니터링)
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Settings, LogOut } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-6">
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
            PLC 모니터링
          </h1>
          <p className="text-slate-300 text-lg">
            실시간 센서 데이터 모니터링 및 관리 시스템
          </p>
        </div>

        {/* 메뉴 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 모니터링 사용자 카드 */}
          <button
            onClick={() => handleNavigate("/monitoring")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-900/40 to-emerald-900/20 border border-emerald-500/30 p-8 hover:border-emerald-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/10 group-hover:to-emerald-500/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-lg mb-4">
                <Activity className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">모니터링</h2>
              <p className="text-slate-300 text-sm mb-6">
                실시간 센서 데이터 조회 및 차트 모니터링
              </p>
              <div className="inline-flex items-center text-emerald-400 font-semibold group-hover:gap-2 transition-all duration-300">
                시작하기
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </div>
            </div>
          </button>

          {/* 관리자 메뉴 카드 */}
          <button
            onClick={() => handleNavigate("/admin")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-900/40 to-blue-900/20 border border-blue-500/30 p-8 hover:border-blue-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-blue-500/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-lg mb-4">
                <Settings className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">관리자</h2>
              <p className="text-slate-300 text-sm mb-6">
                폴링 서비스, 설정 관리 및 데이터베이스 관리
              </p>
              <div className="inline-flex items-center text-blue-400 font-semibold group-hover:gap-2 transition-all duration-300">
                관리하기
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* 정보 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t border-slate-700">
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-blue-400 mb-1">8</div>
            <p className="text-sm text-slate-400">온도 센서</p>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-emerald-400 mb-1">1</div>
            <p className="text-sm text-slate-400">전력 계측</p>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-amber-400 mb-1">SQLite</div>
            <p className="text-sm text-slate-400">실시간 저장</p>
          </div>
        </div>
      </div>
    </div>
  );
}
