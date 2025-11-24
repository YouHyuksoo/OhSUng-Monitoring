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
import { PLCConnector } from "./plc-connector";

interface PollingConfig {
  ip: string;
  port: number;
  addresses: string[];
  interval: number; // 밀리초
  isDemoMode?: boolean;
}

interface CachedData {
  data: { [key: string]: number };
  lastUpdate: number;
  error?: string;
}

class PLCPollingService {
  private pollingConfigs = new Map<string, PollingConfig>();
  private cachedData = new Map<string, CachedData>();
  private pollingIntervals = new Map<string, NodeJS.Timeout>();
  private connections = new Map<string, PLCConnector>();

  /**
   * 폴링 설정 등록 및 시작
   */
  registerPolling(config: PollingConfig) {
    const key = this.getKey(config.ip, config.port);

    // 이미 등록되어 있으면 스킵
    if (this.pollingConfigs.has(key)) {
      console.log(`Polling already registered for ${key}`);
      return;
    }

    this.pollingConfigs.set(key, config);
    this.initializeCache(key);
    this.startPolling(key);
    console.log(`Polling registered for ${key} with interval ${config.interval}ms`);
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
  ): Promise<{ [key: string]: number }> {
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
    const key = this.getKey(ip, port);
    let plc = this.connections.get(key);

    if (!plc) {
      if (isDemoMode) {
        plc = mockPlc;
      } else {
        plc = new McPLC(ip, port);
      }
      this.connections.set(key, plc);
    }

    return plc;
  }

  private startPolling(key: string) {
    const config = this.pollingConfigs.get(key);
    if (!config) return;

    const poll = async () => {
      try {
        const plc = this.getOrCreateConnection(
          config.ip,
          config.port,
          config.isDemoMode
        );

        // 데이터 읽기 (연결은 read 메서드에서 자동 처리됨)
        const data = await plc.read(config.addresses);

        // 캐시 업데이트
        const cached = this.cachedData.get(key);
        if (cached) {
          cached.data = data;
          cached.lastUpdate = Date.now();
          cached.error = undefined;
        }

        console.log(`[Polling] ${key} - Data updated at ${new Date().toISOString()}`);
      } catch (error) {
        const cached = this.cachedData.get(key);
        if (cached) {
          cached.error = error instanceof Error ? error.message : "Unknown error";
          cached.lastUpdate = Date.now();
        }
        console.error(`[Polling] ${key} - Error:`, error);
      }
    };

    // 즉시 한 번 실행
    poll();

    // 주기적으로 실행
    const interval = setInterval(poll, config.interval);
    this.pollingIntervals.set(key, interval);
  }
}

// 싱글톤 인스턴스
export const pollingService = new PLCPollingService();
