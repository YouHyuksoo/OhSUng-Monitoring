/**
 * @file src/lib/plc-polling-service.ts
 * @description
 * 중앙화 PLC 폴링 서비스
 * - 백그라운드에서 PLC 데이터를 주기적으로 폴링
 * - 메모리에 최신 데이터 저장
 * - 모든 클라이언트가 이 데이터를 공유
 *
 * 장점:
 * - PLC 동시 접속 문제 해결
 * - 네트워크 대역폭 절감
 * - 일관된 데이터 제공
 */

import { McPLC } from "./mc-plc";
import { plc as mockPlc } from "./mock-plc";
import { PLCConnector, PLCData } from "./plc-connector";
import { realtimeDataService } from "./realtime-data-service";

interface PollingConfig {
  ip: string;
  port: number;
  addresses: string[];
  interval: number; // 밀리초
  isDemoMode?: boolean;
}

interface CachedData {
  data: PLCData;
  lastUpdate: number;
  error?: string;
}

/**
 * 메모리 히스토리 데이터 포인트
 * 최근 20개의 폴링 결과를 저장하기 위한 구조
 */
export interface HistoryDataPoint {
  timestamp: number;
  address: string;
  value: number;
}

class PLCPollingService {
  private pollingConfigs = new Map<string, PollingConfig>();
  private cachedData = new Map<string, CachedData>();
  private pollingIntervals = new Map<string, NodeJS.Timeout>();
  private dataHistory = new Map<string, HistoryDataPoint[]>(); // 주소별 최근 20개 히스토리
  private readonly HISTORY_LIMIT = 20; // 메모리에 저장할 최대 데이터 포인트 개수

  // 디버깅용 통계
  private pollingStats = new Map<string, {
    totalPolls: number;
    successfulPolls: number;
    failedPolls: number;
    consecutiveFailures: number;
    lastPollTime: number;
    lastSuccessTime: number;
    lastErrorMessage?: string;
    allZeroResponses: number;
  }>();

  /**
   * 폴링 로그 출력 (상세 디버깅용)
   */
  private logPolling(key: string, type: string, details: Record<string, any> = {}): void {
    const timestamp = new Date().toISOString();
    const stats = this.pollingStats.get(key);

    console.log(`[PollingService][${timestamp}][${key}][${type}]`);
    if (stats) {
      console.log(`   통계: 총 ${stats.totalPolls}회, 성공 ${stats.successfulPolls}, 실패 ${stats.failedPolls}, 연속실패 ${stats.consecutiveFailures}`);
      if (stats.lastSuccessTime) {
        const elapsed = Date.now() - stats.lastSuccessTime;
        console.log(`   마지막 성공 이후: ${elapsed}ms (${(elapsed/1000).toFixed(1)}초)`);
      }
    }
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([k, v]) => {
        console.log(`   ${k}: ${JSON.stringify(v)}`);
      });
    }
  }

  /**
   * 폴링 통계 초기화
   */
  private initStats(key: string): void {
    if (!this.pollingStats.has(key)) {
      this.pollingStats.set(key, {
        totalPolls: 0,
        successfulPolls: 0,
        failedPolls: 0,
        consecutiveFailures: 0,
        lastPollTime: 0,
        lastSuccessTime: 0,
        allZeroResponses: 0
      });
    }
  }

  /**
   * 폴링 설정 등록 및 시작
   */
  registerPolling(config: PollingConfig) {
    const key = this.getKey(config.ip, config.port);

    // 이미 등록되어 있으면 스킵
    if (this.pollingConfigs.has(key)) {
      this.logPolling(key, 'REGISTER_SKIP', { reason: '이미 등록됨' });
      return;
    }

    this.pollingConfigs.set(key, config);
    this.initializeCache(key);
    this.initStats(key);
    this.startPolling(key);

    console.log("\n" + "#".repeat(70));
    console.log(`[PollingService] 폴링 등록 완료`);
    console.log(`   대상: ${key}`);
    console.log(`   인터벌: ${config.interval}ms (${config.interval/1000}초)`);
    console.log(`   주소 개수: ${config.addresses.length}`);
    console.log(`   Demo 모드: ${config.isDemoMode ? 'Y' : 'N'}`);
    if (config.interval > 10000) {
      console.log(`   ⚠️ 경고: 폴링 인터벌이 10초 이상입니다. PLC 연결 타임아웃 주의!`);
    }
    console.log("#".repeat(70) + "\n");
  }

  /**
   * 폴링 중지
   */
  stopPolling(ip: string, port: number) {
    const key = this.getKey(ip, port);
    const interval = this.pollingIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(key);
      console.log(`Polling stopped for ${key}`);
    }
  }

  /**
   * 캐시된 데이터 조회
   */
  getCachedData(ip: string, port: number): CachedData | undefined {
    const key = this.getKey(ip, port);
    return this.cachedData.get(key);
  }

  /**
   * 모든 캐시 데이터 조회
   */
  getAllCachedData(): Record<string, CachedData> {
    const result: Record<string, CachedData> = {};
    this.cachedData.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 개인 주소 폴링 (필요시 추가 폴링)
   */
  async readCustomAddresses(
    ip: string,
    port: number,
    addresses: string[],
    isDemoMode?: boolean
  ): Promise<PLCData> {
    const key = this.getKey(ip, port);
    const plc = this.getOrCreateConnection(ip, port, isDemoMode);

    try {
      const data = await plc.read(addresses);
      return data;
    } catch (error) {
      console.error(`Failed to read custom addresses for ${key}:`, error);
      throw error;
    }
  }

  /**
   * 메모리 히스토리에서 특정 주소의 최근 데이터 조회
   * @param address - 조회할 주소 (예: D4032)
   * @returns 최근 20개의 데이터 포인트 배열
   */
  getDataHistory(address: string): HistoryDataPoint[] {
    return this.dataHistory.get(address) || [];
  }

  /**
   * 모든 주소의 메모리 히스토리 데이터 조회
   */
  getAllDataHistory(): Record<string, HistoryDataPoint[]> {
    const result: Record<string, HistoryDataPoint[]> = {};
    this.dataHistory.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 프라이빗 메서드들
   */
  private getKey(ip: string, port: number): string {
    return `${ip}:${port}`;
  }

  private initializeCache(key: string) {
    this.cachedData.set(key, {
      data: {},
      lastUpdate: 0,
      error: undefined,
    });
  }

  private getOrCreateConnection(
    ip: string,
    port: number,
    isDemoMode?: boolean
  ): PLCConnector {
    if (isDemoMode) {
      return mockPlc;
    }
    return McPLC.getInstance(ip, port);
  }

  private startPolling(key: string) {
    const config = this.pollingConfigs.get(key);
    if (!config) return;

    const poll = async () => {
      const pollStartTime = Date.now();
      const stats = this.pollingStats.get(key);
      if (stats) {
        stats.totalPolls++;
        stats.lastPollTime = pollStartTime;
      }

      // 마지막 성공 이후 경과 시간
      const timeSinceLastSuccess = stats?.lastSuccessTime
        ? pollStartTime - stats.lastSuccessTime
        : 0;

      this.logPolling(key, 'POLL_START', {
        pollNumber: stats?.totalPolls,
        interval: config.interval,
        timeSinceLastSuccessMs: timeSinceLastSuccess,
        timeSinceLastSuccessSec: (timeSinceLastSuccess / 1000).toFixed(1)
      });

      try {
        const plc = this.getOrCreateConnection(
          config.ip,
          config.port,
          config.isDemoMode
        );

        // 데이터 읽기 (연결은 read 메서드에서 자동 처리됨)
        const data = await plc.read(config.addresses);
        const pollDuration = Date.now() - pollStartTime;

        // 모든 값이 0인지 체크 (비정상 응답 감지)
        const values = Object.values(data);
        const allZero = values.length > 0 && values.every(v => v === 0);
        const nonZeroCount = values.filter(v => v !== 0).length;

        if (stats) {
          if (allZero) {
            stats.allZeroResponses++;
            stats.consecutiveFailures++; // 모두 0이면 실패로 간주
            this.logPolling(key, 'ALL_ZERO_WARNING', {
              pollDurationMs: pollDuration,
              totalZeroResponses: stats.allZeroResponses,
              consecutiveFailures: stats.consecutiveFailures,
              possibleCauses: [
                '폴링 인터벌이 길어 PLC 연결이 끊김',
                'PLC가 연결을 종료함 (Keep-alive 타임아웃)',
                'PLC 통신 모듈 문제',
                '네트워크 불안정'
              ],
              recommendation: config.interval > 10000
                ? '폴링 인터벌을 10초 이하로 줄여보세요'
                : '네트워크 및 PLC 상태 확인 필요'
            });
          } else {
            stats.successfulPolls++;
            stats.lastSuccessTime = Date.now();
            stats.consecutiveFailures = 0; // 성공 시 리셋
          }
        }

        // 캐시 업데이트
        const cached = this.cachedData.get(key);
        if (cached) {
          cached.data = data;
          cached.lastUpdate = Date.now();
          cached.error = allZero ? '모든 값이 0입니다. PLC 연결 상태를 확인하세요.' : undefined;
        }

        // 타임스탬프
        const timestamp = Date.now();

        // 메모리 히스토리에 저장 (주소별 최근 20개)
        Object.entries(data).forEach(([address, value]) => {
          const numValue = typeof value === "number" ? value : 0;
          const historyPoint: HistoryDataPoint = {
            timestamp,
            address,
            value: numValue,
          };

          const history = this.dataHistory.get(address) || [];
          history.push(historyPoint);
          if (history.length > this.HISTORY_LIMIT) {
            history.shift();
          }
          this.dataHistory.set(address, history);
        });

        // DB에 저장
        const testDataPoints = Object.entries(data).map(([address, value]) => ({
          timestamp,
          address,
          value: typeof value === "number" ? value : 0,
        }));
        realtimeDataService.insertTestData(testDataPoints);

        this.logPolling(key, 'POLL_SUCCESS', {
          pollDurationMs: pollDuration,
          addressCount: Object.keys(data).length,
          nonZeroCount,
          allZero,
          nextPollIn: `${config.interval}ms`
        });

      } catch (error) {
        const pollDuration = Date.now() - pollStartTime;

        if (stats) {
          stats.failedPolls++;
          stats.consecutiveFailures++;
          stats.lastErrorMessage = error instanceof Error ? error.message : 'Unknown error';
        }

        const cached = this.cachedData.get(key);
        if (cached) {
          cached.error = error instanceof Error ? error.message : "Unknown error";
          cached.lastUpdate = Date.now();
        }

        console.error("\n" + "!".repeat(70));
        console.error(`[PollingService] 폴링 에러 발생!`);
        console.error(`   대상: ${key}`);
        console.error(`   에러: ${error instanceof Error ? error.message : error}`);
        console.error(`   소요 시간: ${pollDuration}ms`);
        console.error(`   연속 실패: ${stats?.consecutiveFailures}회`);
        if (stats && stats.consecutiveFailures >= 3) {
          console.error(`   ⚠️ 연속 3회 이상 실패! PLC 연결 상태 확인 필요`);
        }
        console.error("!".repeat(70) + "\n");

        this.logPolling(key, 'POLL_ERROR', {
          error: error instanceof Error ? error.message : 'Unknown',
          pollDurationMs: pollDuration,
          consecutiveFailures: stats?.consecutiveFailures
        });
      }
    };

    // 즉시 한 번 실행
    poll();

    // 주기적으로 실행
    const interval = setInterval(poll, config.interval);
    this.pollingIntervals.set(key, interval);

    console.log(`[PollingService] 폴링 시작: ${key}, 인터벌: ${config.interval}ms`);
  }
}

// 전역 타입 선언
declare global {
  var pollingService: PLCPollingService | undefined;
}

// 싱글톤 인스턴스 관리
export const pollingService = global.pollingService || new PLCPollingService();

if (process.env.NODE_ENV !== "production") {
  global.pollingService = pollingService;
}
