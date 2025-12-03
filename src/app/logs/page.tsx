/**
 * @file src/app/logs/page.tsx
 * @description
 * 로그 뷰어 페이지
 * 시스템 로그를 실시간으로 확인할 수 있는 페이지입니다.
 *
 * 주요 기능:
 * - PLC 연결 로그 표시
 * - 에러 로그 필터링
 * - 로그 레벨별 색상 구분
 * - 자동 스크롤 기능
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Download, Trash2, RefreshCw } from "lucide-react";
import { logger, LogLevel, LogEntry } from "@/lib/logger";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 로거에서 실제 로그 가져오기 및 실시간 업데이트 구독
  useEffect(() => {
    // 초기 로그 로드
    setLogs(logger.getLogs());

    // 로그 변경 감지
    const unsubscribe = logger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 자동 스크롤
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // 필터링된 로그
  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === "all" || log.level === filter;
    const matchesSearch =
      searchTerm === "" ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // 필터나 검색어 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  // 로그 레벨별 색상
  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case "success":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
      case "info":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
      case "error":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
    }
  };

  const getLevelBadge = (level: LogLevel) => {
    const labels = {
      success: "성공",
      info: "정보",
      warning: "경고",
      error: "에러",
    };
    return labels[level];
  };

  const handleClearLogs = () => {
    setShowConfirmDialog(true);
  };

  const confirmClearLogs = () => {
    logger.clear();
    setShowConfirmDialog(false);
  };

  const handleDownloadLogs = () => {
    const logText = logs
      .map(
        (log) =>
          `[${log.timestamp.toLocaleString(
            "ko-KR"
          )}] [${log.level.toUpperCase()}] ${
            log.source ? `[${log.source}] ` : ""
          }${log.message}`
      )
      .join("\n");

    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plc-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">시스템 로그</h1>
          <p className="text-muted-foreground mt-1">
            전력/온도 모니터링 시스템의 실시간 로그를 확인합니다
          </p>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-card rounded-lg border p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* 검색 */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="로그 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
              />
            </div>
          </div>

          {/* 레벨 필터 */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter("success")}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                filter === "success"
                  ? "bg-green-600 text-white"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              성공
            </button>
            <button
              onClick={() => setFilter("info")}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                filter === "info"
                  ? "bg-blue-600 text-white"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              정보
            </button>
            <button
              onClick={() => setFilter("warning")}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                filter === "warning"
                  ? "bg-yellow-600 text-white"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              경고
            </button>
            <button
              onClick={() => setFilter("error")}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                filter === "error"
                  ? "bg-red-600 text-white"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              에러
            </button>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-2 rounded-md transition-colors ${
                autoScroll
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
              title={autoScroll ? "자동 스크롤 켜짐" : "자동 스크롤 꺼짐"}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadLogs}
              className="p-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
              title="로그 다운로드"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearLogs}
              className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors"
              title="로그 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 로그 목록 */}
      <div className="bg-card rounded-lg border">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            로그 목록 ({filteredLogs.length}개)
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">페이지당:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value={25}>25개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
              <option value={200}>200개</option>
            </select>
          </div>
        </div>
        <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
          {paginatedLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              표시할 로그가 없습니다
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {paginatedLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-3 py-1.5 hover:bg-accent/30 transition-colors flex items-center gap-2 text-xs"
                >
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${getLevelColor(
                      log.level
                    )}`}
                  >
                    {getLevelBadge(log.level)}
                  </span>
                  <span className="text-muted-foreground flex-shrink-0 w-32">
                    {log.timestamp.toLocaleString("ko-KR", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  {log.source && (
                    <span className="text-muted-foreground font-mono flex-shrink-0 w-40 truncate">
                      [{log.source}]
                    </span>
                  )}
                  <span className="flex-1 truncate">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="p-3 border-t flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} /{" "}
              {filteredLogs.length}개
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                처음
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="px-3 py-1 text-xs">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                마지막
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 로그 삭제 확인 다이얼로그 */}
      {showConfirmDialog && (
        <ConfirmDialog
          title="로그 삭제 확인"
          message="모든 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          confirmText="삭제"
          cancelText="취소"
          variant="danger"
          onConfirm={confirmClearLogs}
          onCancel={() => setShowConfirmDialog(false)}
        />
      )}
    </div>
  );
}
