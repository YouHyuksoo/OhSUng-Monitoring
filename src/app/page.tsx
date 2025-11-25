/**
 * @file src/app/page.tsx
 * @description
 * PLC 모니터링 시스템 랜딩 페이지 (풀스크린 글래스모피즘 리디자인)
 *
 * 디자인 변경 사항:
 * - **풀스크린 레이아웃**: 스크롤을 제거하고 `h-screen`으로 화면에 꽉 차게 구성.
 * - **좌우 분할 구조**:
 *   - 좌측: 브랜드 아이덴티티 (3D 로고, 타이틀) 강조.
 *   - 우측: 기능 네비게이션 (모니터링/관리자) 및 실시간 상태 요약 카드 배치.
 * - **강화된 글래스모피즘**: 배경 블러와 투명도를 조절하여 더 깊이 있는 UI 제공.
 * - **인터랙션**: 마우스 호버 시 부드러운 확대 및 글로우 효과 적용.
 * - **배경**: Deep Space Aurora 스타일의 움직이는 블롭 효과 적용.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Settings,
  Zap,
  Thermometer,
  Database,
  ArrowRight,
} from "lucide-react";

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
    <div className="h-screen w-full relative overflow-hidden bg-[#020617]">
      {/* 배경 그라디언트 및 효과 - Deep Space Aurora */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e1b4b] via-[#020617] to-[#000000]" />

      {/* 움직이는 오로라 블롭 효과 */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob" />
      <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-32 left-20 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000" />

      {/* 은은한 그리드 패턴 (선택적) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* 파티클 효과 (별들) */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${
                3 + Math.random() * 4
              }s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* 메인 콘텐츠 컨테이너 (좌우 분할) */}
      <div className="relative z-10 h-full max-w-[1600px] mx-auto px-6 lg:px-12 py-8 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24">
        {/* 좌측: 브랜드 영역 */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
          {/* 3D 글래스 구체 로고 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-cyan-400/30 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500" />
            <div className="w-40 h-40 lg:w-56 lg:h-56 glass-sphere rounded-full flex items-center justify-center animate-[float_4s_ease-in-out_infinite] relative z-10">
              <Activity
                className="w-20 h-20 lg:w-28 lg:h-28 text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                strokeWidth={1.5}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-lg">
                PLC Monitoring
              </span>
            </h1>
            <p className="text-slate-400 text-lg lg:text-2xl font-light max-w-lg leading-relaxed">
              실시간 센서 데이터 분석 및<br className="hidden lg:block" />
              스마트 팩토리 통합 관리 시스템
            </p>
          </div>
        </div>

        {/* 우측: 기능 및 대시보드 영역 */}
        <div className="flex-1 w-full max-w-xl flex flex-col gap-6">
          {/* 메인 네비게이션 카드 (가로 배치) */}
          <div className="grid grid-cols-2 gap-4 h-48 lg:h-56">
            {/* 모니터링 버튼 */}
            <button
              onClick={() => handleNavigate("/monitoring")}
              className="group relative h-full glass-card rounded-3xl p-6 flex flex-col justify-between text-left transition-all duration-300 hover:bg-white/5 hover:scale-[1.02] border border-white/10 hover:border-emerald-400/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">모니터링</h3>
                <p className="text-emerald-200/60 text-sm">
                  실시간 데이터 차트
                </p>
              </div>
              <div className="relative z-10 self-end w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-transparent transition-all duration-300">
                <ArrowRight className="w-5 h-5 text-white/70 group-hover:text-white" />
              </div>
            </button>

            {/* 관리자 버튼 */}
            <button
              onClick={() => handleNavigate("/admin/login")}
              className="group relative h-full glass-card rounded-3xl p-6 flex flex-col justify-between text-left transition-all duration-300 hover:bg-white/5 hover:scale-[1.02] border border-white/10 hover:border-cyan-400/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                  <Settings className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">관리자</h3>
                <p className="text-cyan-200/60 text-sm">시스템 설정 및 제어</p>
              </div>
              <div className="relative z-10 self-end w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-cyan-500 group-hover:border-transparent transition-all duration-300">
                <ArrowRight className="w-5 h-5 text-white/70 group-hover:text-white" />
              </div>
            </button>
          </div>

          {/* 하단 상태 요약 카드 (작은 카드 3개) */}
          <div className="glass-card rounded-3xl p-5 border border-white/5 bg-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-400">
                System Status
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400">Online</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* 온도 */}
              <div className="text-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                <Thermometer className="w-5 h-5 text-rose-400 mx-auto mb-2" />
                <div className="text-lg font-bold text-white">24°C</div>
                <div className="text-xs text-slate-500">Temperature</div>
              </div>

              {/* 전력 */}
              <div className="text-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                <div className="text-lg font-bold text-white">220V</div>
                <div className="text-xs text-slate-500">Voltage</div>
              </div>

              {/* DB */}
              <div className="text-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                <Database className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <div className="text-lg font-bold text-white">OK</div>
                <div className="text-xs text-slate-500">Database</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
