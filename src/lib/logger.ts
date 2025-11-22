/**
 * @file src/lib/logger.ts
 * @description
 * 표준화된 로깅 시스템
 *
 * 이 파일은 애플리케이션 전체에서 사용할 수 있는 중앙 집중식 로거를 제공합니다.
 *
 * 주요 기능:
 * - 로그 레벨별 메서드 제공 (info, success, warning, error)
 * - 서버 파일 시스템에 로그 저장
 * - 소스 추적 (어디서 로그가 발생했는지)
 * - 타임스탬프 자동 추가
 *
 * 사용법:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('PLC 연결 시도', 'PLCConnectionContext');
 * logger.success('데이터 로드 완료', 'MonitoringPage');
 * logger.warning('온도 임계값 초과', 'RealtimeChart');
 * logger.error('연결 실패', 'PLCConnector', error);
 * ```
 */

export type LogLevel = "info" | "warning" | "error" | "success";

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source?: string;
  data?: any;
}

const MAX_LOGS = 1000; // 최대 저장 로그 수 (메모리)

class Logger {
  private logs: LogEntry[] = [];
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();

  constructor() {
    // 서버에서 기존 로그 로드
    if (typeof window !== "undefined") {
      this.loadFromServer();
    }
  }

  /**
   * 로그 추가 (내부 메서드)
   */
  private addLog(
    level: LogLevel,
    message: string,
    source?: string,
    data?: any
  ) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      source,
      data,
    };

    this.logs.unshift(entry); // 최신 로그를 앞에 추가

    // 최대 로그 수 제한
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    // 서버에 저장
    this.saveToServer(entry);

    // 리스너들에게 알림
    this.notifyListeners();

    // 개발 환경에서는 콘솔에도 출력
    if (process.env.NODE_ENV === "development") {
      const emoji = {
        info: "ℹ️",
        success: "✅",
        warning: "⚠️",
        error: "❌",
      };
      const consoleMethod = level === "error" ? console.error : console.log;
      consoleMethod(
        `${emoji[level]} [${source || "App"}] ${message}`,
        data || ""
      );
    }
  }

  /**
   * 정보 로그
   */
  info(message: string, source?: string, data?: any) {
    this.addLog("info", message, source, data);
  }

  /**
   * 성공 로그
   */
  success(message: string, source?: string, data?: any) {
    this.addLog("success", message, source, data);
  }

  /**
   * 경고 로그
   */
  warning(message: string, source?: string, data?: any) {
    this.addLog("warning", message, source, data);
  }

  /**
   * 에러 로그
   */
  error(message: string, source?: string, error?: any) {
    const errorData =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
    this.addLog("error", message, source, errorData);
  }

  /**
   * 모든 로그 가져오기
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 로그 변경 감지 리스너 등록
   */
  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 리스너들에게 알림
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.getLogs()));
  }

  /**
   * 모든 로그 삭제
   */
  async clear() {
    this.logs = [];
    await this.clearOnServer();
    this.notifyListeners();
  }

  /**
   * 서버에 로그 저장
   */
  private async saveToServer(entry: LogEntry) {
    if (typeof window === "undefined") return;

    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        }),
      });
    } catch (error) {
      console.error("Failed to save log to server:", error);
    }
  }

  /**
   * 서버에서 로그 로드
   */
  private async loadFromServer() {
    if (typeof window === "undefined") return;

    try {
      const response = await fetch("/api/logs?days=7"); // 최근 7일
      if (response.ok) {
        const data = await response.json();
        this.logs = data.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
        this.notifyListeners();
      }
    } catch (error) {
      console.error("Failed to load logs from server:", error);
      this.logs = [];
    }
  }

  /**
   * 서버에서 모든 로그 삭제
   */
  private async clearOnServer() {
    if (typeof window === "undefined") return;

    try {
      await fetch("/api/logs", {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to clear logs on server:", error);
    }
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();
