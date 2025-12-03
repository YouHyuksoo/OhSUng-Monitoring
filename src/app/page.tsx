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
  RefreshCw,
  AlertTriangle,
  X,
} from "lucide-react";

/**
 * 폴링 상태 인터페이스
 */
interface PollingStatus {
  status: string;
  services: {
    realtime: { isPolling: boolean; lastUpdate: string; message: string };
    hourly: { isPolling: boolean; lastUpdate: string; message: string };
  };
  timestamp: number;
}

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    realtimeStatus: "offline", // "online" 또는 "offline"
    hourlyStatus: "offline", // "online" 또는 "offline"
    isPollingActive: false,
  });

  /**
   * 폴링 서비스 상태 조회
   * - 실시간 데이터 폴링 상태
   * - 시간별 에너지 폴링 상태
   */
  const fetchPollingStatus = async () => {
    try {
      const response = await fetch("/api/polling/status");
      if (response.ok) {
        const data = await response.json();
        setPollingStatus(data);
        setSystemStatus({
          realtimeStatus: data.services.realtime.isPolling ? "online" : "offline",
          hourlyStatus: data.services.hourly.isPolling ? "online" : "offline",
          isPollingActive: data.status === "running",
        });
      }
    } catch (error) {
      console.error("Failed to fetch polling status:", error);
      setSystemStatus({
        realtimeStatus: "offline",
        hourlyStatus: "offline",
        isPollingActive: false,
      });
    }
  };

  useEffect(() => {
    setMounted(true);

    // 초기 데이터 로드
    fetchPollingStatus();

    // 5초마다 폴링 상태 갱신
    const pollingInterval = setInterval(fetchPollingStatus, 5000);

    return () => clearInterval(pollingInterval);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleUpgradeClick = () => {
    setShowUpgradeConfirm(true);
  };

  const executeUpgrade = async () => {
    setShowUpgradeConfirm(false);
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/system/upgrade", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        if (data.message.includes("재시작")) {
          // 서버 재시작 대기 후 새로고침
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        } else {
          setIsUpgrading(false);
        }
      } else {
        alert(`오류: ${data.message}\n${data.error || ""}`);
        setIsUpgrading(false);
      }
    } catch (error) {
      alert("요청 처리 중 오류가 발생했습니다.");
      setIsUpgrading(false);
    }
  };

  return (
    <div className="h-screen w-full relative overflow-hidden bg-[#020617] flex flex-col">
      {/* 업그레이드 확인 다이얼로그 */}
      {showUpgradeConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-[pulse-ring_0.3s_ease-out]">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    시스템 업그레이드
                  </h3>
                  <p className="text-slate-400 text-sm">
                    최신 버전으로 업데이트 하시겠습니까?
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
                <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
                  <li>Git 저장소에서 최신 코드를 가져옵니다.</li>
                  <li>필요한 라이브러리를 설치하고 빌드합니다.</li>
                  <li>
                    <span className="text-amber-400 font-bold">
                      완료 후 서버가 자동으로 재시작됩니다.
                    </span>
                  </li>
                  <li>재시작 중에는 서비스가 잠시 중단됩니다.</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowUpgradeConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors font-medium"
                >
                  취소
                </button>
                <button
                  onClick={executeUpgrade}
                  className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition-colors font-medium flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  업그레이드 시작
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 업그레이드 로딩 오버레이 */}
      {isUpgrading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white">
          <RefreshCw className="w-16 h-16 animate-spin text-cyan-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">시스템 업그레이드 중...</h2>
          <p className="text-slate-400">
            잠시만 기다려주세요. 서버가 재시작됩니다.
          </p>
        </div>
      )}

      {/* 우측 상단 유틸리티 메뉴 */}
      <div className="absolute top-6 right-6 z-40 flex gap-2">
        <button
          onClick={handleUpgradeClick}
          disabled={isUpgrading}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-sm backdrop-blur-md"
        >
          <RefreshCw
            className={`w-4 h-4 ${isUpgrading ? "animate-spin" : ""}`}
          />
          <span>Update</span>
        </button>
      </div>

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
      <div className="relative z-10 flex-1 max-w-[1600px] mx-auto px-6 lg:px-12 py-8 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24">
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

          {/* 하단 상태 요약 카드 (작은 카드 3개) - 백엔드 폴링 서비스 상태 */}
          <div className="glass-card rounded-3xl p-5 border border-white/5 bg-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-400">
                System Status
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    systemStatus.isPollingActive
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                />
                <span
                  className={`text-xs ${
                    systemStatus.isPollingActive
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {systemStatus.isPollingActive ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* 실시간 데이터 폴링 */}
              <div className="text-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                <Activity className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <div className="text-lg font-bold text-white">
                  {systemStatus.realtimeStatus === "online" ? "Running" : "Stopped"}
                </div>
                <div className="text-xs text-slate-500">Realtime Polling</div>
              </div>

              {/* 시간별 에너지 폴링 */}
              <div className="text-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                <div className="text-lg font-bold text-white">
                  {systemStatus.hourlyStatus === "online" ? "Running" : "Stopped"}
                </div>
                <div className="text-xs text-slate-500">Hourly Energy</div>
              </div>

              {/* 전체 상태 */}
              <div className="text-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                <Database className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                <div className="text-lg font-bold text-white">
                  {systemStatus.isPollingActive ? "Online" : "Offline"}
                </div>
                <div className="text-xs text-slate-500">Overall Status</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 푸터 */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* 좌측: 회사명 */}
          <div className="text-sm text-slate-400">
            <span className="font-semibold text-slate-300">Jisung Solution Works</span>
          </div>

          {/* 우측: 버전 */}
          <div className="text-xs text-slate-500">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0"}
          </div>
        </div>
      </footer>
    </div>
  );
}
