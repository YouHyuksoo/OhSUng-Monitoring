/**
 * @file src/app/admin/page.tsx
 * @description
 * 관리자 대시보드 페이지
 * - 폴링 서비스 상태 확인 및 관리
 * - 설정 관리 (시스템 설정 페이지로 이동)
 * - 로그 관리 (로그 페이지로 이동)
 * - DB 상태 확인
 *
 * 기능:
 * - 폴링 서비스 시작/중지
 * - 현재 설정 표시
 * - 마지막 폴링 시간 표시
 * - 시스템 통계
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/settings-context";
import {
  Activity,
  Settings,
  FileText,
  Database,
  Play,
  Square,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface PollingStatus {
  status: string;
  services: {
    realtime: { isPolling: boolean; lastUpdate: string; message: string };
    hourly: { isPolling: boolean; lastUpdate: string; message: string };
  };
  timestamp: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(
    null
  );
  const [isStartingPolling, setIsStartingPolling] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toLocaleTimeString());
  const [isPollingActive, setIsPollingActive] = useState(false);

  // 폴링 상태 조회
  const checkPollingStatus = async () => {
    try {
      const response = await fetch("/api/polling/status");
      if (response.ok) {
        const data = await response.json();
        setPollingStatus(data);
        setIsPollingActive(data.status === "running");
        setLastRefresh(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Failed to check polling status:", error);
    }
  };

  // 초기 로드 및 자동 갱신
  useEffect(() => {
    checkPollingStatus();
    const interval = setInterval(checkPollingStatus, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, []);

  // 폴링 서비스 시작
  const handleStartPolling = async () => {
    setIsStartingPolling(true);
    try {
      // 1. 시간별 에너지 폴링 시작
      await fetch("/api/energy/hourly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: settings.plcIp,
          port: settings.plcPort,
          demo: false,
        }),
      });

      // 2. 실시간 데이터 폴링 시작
      await fetch("/api/realtime/polling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: settings.plcIp,
          port: settings.plcPort,
          interval: settings.pollingInterval,
          chartConfigs: settings.chartConfigs,
          demo: false,
        }),
      });

      // 상태 갱신
      await checkPollingStatus();
      setIsPollingActive(true);
    } catch (error) {
      console.error("Failed to start polling:", error);
      alert("폴링 서비스 시작 실패: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsStartingPolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 헤더 */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-400" />
                <h1 className="text-2xl font-bold text-white">관리자 대시보드</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 폴링 서비스 카드 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">폴링 서비스</h2>
                <p className="text-sm text-slate-400">
                  실시간 센서 데이터 수집 관리
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPollingActive ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
                  <div className="flex items-center justify-center w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-emerald-400">
                    활성
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <div className="flex items-center justify-center w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-sm font-medium text-red-400">
                    비활성
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 상태 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-slate-700/30 rounded-lg">
            <div>
              <p className="text-xs text-slate-400 mb-1">PLC 설정</p>
              <p className="text-sm font-semibold text-white">
                {settings.plcIp}:{settings.plcPort}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">폴링 인터벌</p>
              <p className="text-sm font-semibold text-white">
                {settings.pollingInterval}ms
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">마지막 갱신</p>
              <p className="text-sm font-semibold text-white">{lastRefresh}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">모니터링 차트</p>
              <p className="text-sm font-semibold text-white">
                {settings.chartConfigs?.length || 0}개
              </p>
            </div>
          </div>

          {/* 서비스 상태 상세 */}
          {pollingStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* 실시간 데이터 폴링 */}
              <div className="p-4 bg-slate-700/20 border border-slate-600 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {pollingStatus.services.realtime.isPolling ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                      <p className="font-semibold text-white text-sm">
                        실시간 데이터 폴링
                      </p>
                      <p className="text-xs text-slate-400">
                        {pollingStatus.services.realtime.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 시간별 에너지 폴링 */}
              <div className="p-4 bg-slate-700/20 border border-slate-600 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {pollingStatus.services.hourly.isPolling ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                      <p className="font-semibold text-white text-sm">
                        시간별 에너지 폴링
                      </p>
                      <p className="text-xs text-slate-400">
                        {pollingStatus.services.hourly.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleStartPolling}
              disabled={isStartingPolling || isPollingActive}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              {isStartingPolling ? "시작 중..." : "폴링 시작"}
            </button>
            <button
              onClick={checkPollingStatus}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              상태 갱신
            </button>
          </div>
        </div>

        {/* 관리 메뉴 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 설정 관리 */}
          <button
            onClick={() => router.push("/settings")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/40 to-purple-900/20 border border-purple-500/30 p-6 hover:border-purple-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:to-purple-500/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-500/20 rounded-lg mb-3">
                <Settings className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">설정 관리</h3>
              <p className="text-sm text-slate-300 mb-4">
                PLC 연결, 폴링 인터벌, 알람 임계값 등 시스템 설정을 관리합니다.
              </p>
              <div className="inline-flex items-center text-purple-400 font-semibold group-hover:gap-2 transition-all duration-300 text-sm">
                설정 수정
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </div>
            </div>
          </button>

          {/* 로그 관리 */}
          <button
            onClick={() => router.push("/logs")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-900/40 to-amber-900/20 border border-amber-500/30 p-6 hover:border-amber-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/10 group-hover:to-amber-500/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-center w-10 h-10 bg-amber-500/20 rounded-lg mb-3">
                <FileText className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">로그 관리</h3>
              <p className="text-sm text-slate-300 mb-4">
                시스템 로그를 조회하고 필터링하여 문제 진단을 돕습니다.
              </p>
              <div className="inline-flex items-center text-amber-400 font-semibold group-hover:gap-2 transition-all duration-300 text-sm">
                로그 확인
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </div>
            </div>
          </button>

          {/* DB 관리 */}
          <button
            onClick={() => alert("DB 관리 기능 개발 중입니다.")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-900/40 to-cyan-900/20 border border-cyan-500/30 p-6 hover:border-cyan-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/10 group-hover:to-cyan-500/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-center w-10 h-10 bg-cyan-500/20 rounded-lg mb-3">
                <Database className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">데이터베이스</h3>
              <p className="text-sm text-slate-300 mb-4">
                SQLite 데이터베이스 상태, 용량, 데이터 정리 기능을 관리합니다.
              </p>
              <div className="inline-flex items-center text-cyan-400 font-semibold group-hover:gap-2 transition-all duration-300 text-sm">
                데이터 관리
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* 시스템 정보 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400 mb-1">
              {settings.chartConfigs?.length || 0}
            </p>
            <p className="text-sm text-slate-400">모니터링 차트</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400 mb-1">
              {settings.plcIp}
            </p>
            <p className="text-sm text-slate-400">PLC IP</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400 mb-1">
              {settings.pollingInterval}ms
            </p>
            <p className="text-sm text-slate-400">폴링 인터벌</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400 mb-1">SQLite</p>
            <p className="text-sm text-slate-400">데이터 저장소</p>
          </div>
        </div>
      </div>
    </div>
  );
}
