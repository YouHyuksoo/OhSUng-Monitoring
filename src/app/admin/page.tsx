/**
 * @file src/app/admin/page.tsx
 * @description
 * 관리자 대시보드 페이지
 * - 폴링 서비스 상태 확인 및 관리 (시작/중지)
 * - DB 관리 (용량, 데이터 정리)
 * - 설정 관리 (시스템 설정 페이지로 이동)
 * - 로그 관리 (로그 페이지로 이동)
 *
 * 기능:
 * - 폴링 서비스 시작/중지
 * - 현재 설정 표시
 * - DB 파일 크기 및 데이터 행 수 표시
 * - 오래된 데이터 정리
 *
 * 주의: PLC 통신 방식 및 데모 모드는 settings 페이지에서만 변경
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/useSettings";
import {
  Activity,
  Database,
  FileText,
  Play,
  Square,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";

interface PollingStatus {
  status: string;
  services: {
    realtime: { isPolling: boolean; lastUpdate: string; message: string };
    hourly: { isPolling: boolean; lastUpdate: string; message: string };
  };
  timestamp: number;
}

interface DBStats {
  database: {
    filePath: string;
    fileExists: boolean;
    fileSizeBytes: number;
    fileSizeMB: string;
  };
  tables: {
    realtime_data: {
      rowCount: number;
      oldestData: string | null;
      newestData: string | null;
    };
    hourly_energy: {
      rowCount: number;
      oldestData: string | null;
      newestData: string | null;
    };
  };
  totalRows: number;
  timestamp: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();

  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(
    null
  );
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [isStartingPolling, setIsStartingPolling] = useState(false);
  const [isStoppingPolling, setIsStoppingPolling] = useState(false);
  const [isCleaningDB, setIsCleaningDB] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>(
    new Date().toLocaleTimeString()
  );
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [daysToKeep, setDaysToKeep] = useState("7");

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

  // DB 통계 조회
  const checkDBStats = async () => {
    try {
      const response = await fetch("/api/db/stats");
      if (response.ok) {
        const data = await response.json();
        setDbStats(data);
      }
    } catch (error) {
      console.error("Failed to check DB stats:", error);
    }
  };

  // 초기 로드 및 자동 갱신
  useEffect(() => {
    checkPollingStatus();
    checkDBStats();
    const interval = setInterval(() => {
      checkPollingStatus();
      checkDBStats();
    }, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, []);

  // 폴링 서비스 시작
  const handleStartPolling = async () => {
    setIsStartingPolling(true);
    try {
      // 1. 시간별 에너지 폴링 시작
      const hourlyResponse = await fetch("/api/energy/hourly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: settings.plcIp,
          port: settings.plcPort,
          plcType: settings.plcType,
          modbusAddressMapping: settings.modbusAddressMapping,
        }),
      });

      if (!hourlyResponse.ok) {
        throw new Error(
          `시간별 에너지 폴링 시작 실패: ${hourlyResponse.statusText}`
        );
      }

      // 2. 실시간 데이터 폴링 시작
      const realtimeResponse = await fetch("/api/realtime/polling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: settings.plcIp,
          port: settings.plcPort,
          interval: settings.plcPollingInterval, // PLC 폴링 주기 사용
          chartConfigs: settings.chartConfigs,
          plcType: settings.plcType,
          modbusAddressMapping: settings.modbusAddressMapping,
        }),
      });

      if (!realtimeResponse.ok) {
        throw new Error(
          `실시간 데이터 폴링 시작 실패: ${realtimeResponse.statusText}`
        );
      }

      // 상태 갱신 (약간의 지연을 줘서 서버가 폴링을 완전히 시작하도록 대기)
      await new Promise((resolve) => setTimeout(resolve, 500));
      await checkPollingStatus();
      setIsPollingActive(true);
    } catch (error) {
      console.error("Failed to start polling:", error);
      alert(
        "폴링 서비스 시작 실패: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsStartingPolling(false);
    }
  };

  // 폴링 서비스 중지
  const handleStopPolling = async () => {
    setIsStoppingPolling(true);
    try {
      const response = await fetch("/api/polling/stop", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          `폴링 서비스 중지 실패: ${response.statusText}`
        );
      }

      // 상태 갱신 (약간의 지연을 줘서 서버가 폴링을 완전히 중지하도록 대기)
      await new Promise((resolve) => setTimeout(resolve, 500));
      await checkPollingStatus();
      setIsPollingActive(false);
    } catch (error) {
      console.error("Failed to stop polling:", error);
      alert(
        "폴링 서비스 중지 실패: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsStoppingPolling(false);
    }
  };

  // DB 데이터 정리
  const handleCleanupDB = async () => {
    setIsCleaningDB(true);
    try {
      const response = await fetch(`/api/db/cleanup?daysToKeep=${daysToKeep}`, {
        method: "POST",
      });

      if (response.ok) {
        await checkDBStats();
        setShowCleanupDialog(false);
        alert(`${daysToKeep}일 이전의 데이터가 정리되었습니다.`);
      }
    } catch (error) {
      console.error("Failed to cleanup database:", error);
      alert(
        "데이터베이스 정리 실패: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsCleaningDB(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
                {settings.plcType === "demo"
                  ? "Demo Mode"
                  : settings.plcType === "modbus"
                  ? "LS Modbus"
                  : "Mitsubishi MC"}
              </p>
              <p className="text-xs text-slate-500">
                {settings.plcIp}:{settings.plcPort}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">PLC 폴링 주기</p>
              <p className="text-sm font-semibold text-white">
                {settings.plcPollingInterval / 1000}초
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">모니터링 갱신 주기</p>
              <p className="text-sm font-semibold text-white">
                {settings.monitoringRefreshInterval / 1000}초
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
              onClick={handleStopPolling}
              disabled={isStoppingPolling || !isPollingActive}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="w-4 h-4" />
              {isStoppingPolling ? "중지 중..." : "폴링 중지"}
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

        {/* DB 관리 카드 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-cyan-500/20 rounded-lg">
                <Database className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">데이터베이스</h2>
                <p className="text-sm text-slate-400">SQLite DB 상태 및 관리</p>
              </div>
            </div>
          </div>

          {/* DB 통계 */}
          {dbStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-700/30 rounded-lg">
              <div>
                <p className="text-xs text-slate-400 mb-1">파일 크기</p>
                <p className="text-sm font-semibold text-cyan-400">
                  {dbStats.database.fileSizeMB} MB
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">실시간 데이터</p>
                <p className="text-sm font-semibold text-white">
                  {dbStats.tables.realtime_data.rowCount.toLocaleString()} 행
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">시간별 에너지</p>
                <p className="text-sm font-semibold text-white">
                  {dbStats.tables.hourly_energy.rowCount.toLocaleString()} 행
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">총 데이터</p>
                <p className="text-sm font-semibold text-white">
                  {dbStats.totalRows.toLocaleString()} 행
                </p>
              </div>
            </div>
          )}

          {/* DB 상세 정보 */}
          {dbStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-slate-700/20 border border-slate-600 rounded-lg">
              <div>
                <p className="text-xs text-slate-400 mb-2 font-semibold">
                  실시간 데이터
                </p>
                <p className="text-xs text-slate-300 mb-1">
                  가장 오래된:
                  {dbStats.tables.realtime_data.oldestData
                    ? new Date(
                        dbStats.tables.realtime_data.oldestData
                      ).toLocaleDateString()
                    : "없음"}
                </p>
                <p className="text-xs text-slate-300">
                  가장 최신:
                  {dbStats.tables.realtime_data.newestData
                    ? new Date(
                        dbStats.tables.realtime_data.newestData
                      ).toLocaleDateString()
                    : "없음"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-2 font-semibold">
                  시간별 에너지
                </p>
                <p className="text-xs text-slate-300 mb-1">
                  가장 오래된:
                  {dbStats.tables.hourly_energy.oldestData
                    ? new Date(
                        dbStats.tables.hourly_energy.oldestData
                      ).toLocaleDateString()
                    : "없음"}
                </p>
                <p className="text-xs text-slate-300">
                  가장 최신:
                  {dbStats.tables.hourly_energy.newestData
                    ? new Date(
                        dbStats.tables.hourly_energy.newestData
                      ).toLocaleDateString()
                    : "없음"}
                </p>
              </div>
            </div>
          )}

          {/* 정리 버튼 */}
          <button
            onClick={() => setShowCleanupDialog(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors w-full"
          >
            <Trash2 className="w-4 h-4" />
            오래된 데이터 정리
          </button>
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
                PLC 연결, 폴링 인터벌, 알람 임계값 등을 관리합니다.
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
                시스템 로그를 조회하고 필터링하여 문제를 진단합니다.
              </p>
              <div className="inline-flex items-center text-amber-400 font-semibold group-hover:gap-2 transition-all duration-300 text-sm">
                로그 확인
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </div>
            </div>
          </button>

          {/* 도움말 관리 */}
          <button
            onClick={() => router.push("/help")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-900/40 to-green-900/20 border border-green-500/30 p-6 hover:border-green-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/0 group-hover:from-green-500/10 group-hover:to-green-500/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-lg mb-3">
                <AlertCircle className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">도움말</h3>
              <p className="text-sm text-slate-300 mb-4">
                시스템 사용 방법과 문서를 확인합니다.
              </p>
              <div className="inline-flex items-center text-green-400 font-semibold group-hover:gap-2 transition-all duration-300 text-sm">
                도움말 보기
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 데이터 정리 다이얼로그 */}
      {showCleanupDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-4">
              오래된 데이터 정리
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              지정한 날짜보다 오래된 모든 데이터가 삭제됩니다. 신중하게
              선택해주세요.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                보관할 기간 (일)
              </label>
              <input
                type="number"
                value={daysToKeep}
                onChange={(e) => setDaysToKeep(e.target.value)}
                min="1"
                max="365"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-slate-400 mt-2">
                기본값: 7일 (7일 이전의 데이터 삭제)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCleanupDialog(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCleanupDB}
                disabled={isCleaningDB}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCleaningDB ? "정리 중..." : "정리"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
