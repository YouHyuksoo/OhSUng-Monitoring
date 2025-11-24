/**
 * @file src/app/page.tsx
 * @description
 * PLC 모니터링 시스템 랜딩 페이지 (참고 이미지 스타일)
 * 관리자와 사용자(모니터링) 역할 분리
 *
 * 디자인 컨셉:
 * - 큰 3D 글래스 구체 로고
 * - 카드 위에 걸친 아이콘 배지
 * - 강렬한 네온 글로우 효과
 * - 복잡한 회로도 패턴 배경
 * - 사이버펑크 느낌의 미래지향적 디자인
 *
 * 아키텍처:
 * - 관리자: /admin 페이지로 이동 (폴링 서비스 관리, 설정, DB 관리)
 * - 사용자: /monitoring 페이지로 이동 (실시간 모니터링)
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Settings, Zap, Thermometer, Database } from "lucide-react";

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#1a1a2e] to-[#16213e]">
      {/* 회로도 패턴 배경 */}
      <div className="absolute inset-0 circuit-pattern opacity-60" />

      {/* 파티클 효과 (별들) */}
      <div className="absolute inset-0">
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${
                2 + Math.random() * 3
              }s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* 헤더 - 큰 3D 글래스 구체 로고 */}
          <div className="text-center mb-20">
            {/* 3D 글래스 구체 */}
            <div className="relative inline-block mb-8">
              <div className="w-32 h-32 glass-sphere rounded-full flex items-center justify-center animate-[float_3s_ease-in-out_infinite]">
                <Activity
                  className="w-16 h-16 text-cyan-300"
                  strokeWidth={2.5}
                />
              </div>
            </div>

            {/* 타이틀 */}
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              PLC 모니터링
            </h1>
            <p className="text-slate-400 text-lg">
              실시간 센서 데이터 모니터링 및 관리 시스템
            </p>
          </div>

          {/* 메인 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 pt-10">
            {/* 모니터링 카드 - 네온 그린 */}
            <button
              onClick={() => handleNavigate("/monitoring")}
              className="group relative rounded-2xl glass-card neon-border-green p-10 pt-16 transition-all duration-500 hover:scale-105 hover:-translate-y-2"
            >
              {/* 카드 위에 걸친 아이콘 배지 */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50 border-4 border-[#0a1628]">
                  <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
              </div>

              <div className="relative z-10 text-center">
                {/* 제목 */}
                <h2 className="text-3xl font-bold text-white mb-3">모니터링</h2>

                {/* 설명 */}
                <p className="text-slate-400 text-sm mb-6">
                  실시간 센서 데이터 조회 및 차트 모니터링
                </p>

                {/* 버튼 */}
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 rounded-full text-emerald-400 font-semibold group-hover:bg-emerald-500/30 transition-all duration-300">
                  <span>시작하기</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-300">
                    →
                  </span>
                </div>
              </div>
            </button>

            {/* 관리자 카드 - 네온 블루 */}
            <button
              onClick={() => handleNavigate("/admin/login")}
              className="group relative rounded-2xl glass-card neon-border-blue p-10 pt-16 transition-all duration-500 hover:scale-105 hover:-translate-y-2"
            >
              {/* 카드 위에 걸친 아이콘 배지 */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50 border-4 border-[#0a1628]">
                  <Settings className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
              </div>

              <div className="relative z-10 text-center">
                {/* 제목 */}
                <h2 className="text-3xl font-bold text-white mb-3">관리자</h2>

                {/* 설명 */}
                <p className="text-slate-400 text-sm mb-6">
                  폴링 서비스, 설정 관리 및 데이터베이스 관리
                </p>

                {/* 버튼 */}
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/20 rounded-full text-cyan-400 font-semibold group-hover:bg-cyan-500/30 transition-all duration-300">
                  <span>관리하기</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-300">
                    →
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* 하단 정보 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 온도 센서 */}
            <div className="glass-card rounded-xl p-6 text-center border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 bg-cyan-500/20 rounded-lg mb-4 mx-auto">
                <Thermometer className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="text-4xl font-bold text-cyan-400 mb-2">8</div>
              <p className="text-sm text-slate-400">온도 센서</p>
            </div>

            {/* 전력 계측 */}
            <div className="glass-card rounded-xl p-6 text-center border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-lg mb-4 mx-auto">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-4xl font-bold text-emerald-400 mb-2">1</div>
              <p className="text-sm text-slate-400">전력 계측</p>
            </div>

            {/* 데이터베이스 */}
            <div className="glass-card rounded-xl p-6 text-center border border-amber-500/20 hover:border-amber-400/40 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 bg-amber-500/20 rounded-lg mb-4 mx-auto">
                <Database className="w-6 h-6 text-amber-400" />
              </div>
              <div className="text-4xl font-bold text-amber-400 mb-2">
                SQLite
              </div>
              <p className="text-sm text-slate-400">실시간 저장</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
