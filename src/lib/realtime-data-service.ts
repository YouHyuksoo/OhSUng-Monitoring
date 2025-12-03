/**
 * @file src/lib/realtime-data-service.ts
 * @description
 * 실시간 센서 데이터 저장 및 조회 서비스 (SQLite)
 * - 설정된 폴링 인터벌로 모든 센서 데이터 수집 (D4032, D400~D470 등)
 * - 타임스탬프와 함께 SQLite에 저장
 * - 메모리 캐시로 최근 데이터 유지 (20개 포인트)
 * - 차트에서 DB 조회로 표시
 *
 * 데이터베이스 스키마:
 * - realtime_data 테이블: timestamp, address, value 저장
 * - 인덱스: address, timestamp로 빠른 조회
 */

import Database from "better-sqlite3";
import path from "path";
import { McPLC } from "./mc-plc";
import { XgtModbusPLC } from "./xgt-modbus-plc";
import { plc as mockPlc } from "./mock-plc";
import { PLCConnector } from "./plc-connector";
import { setRealtimePolling } from "./polling-state";

/**
 * 실시간 데이터 포인트
 */
export interface RealtimeDataPoint {
  timestamp: number;
  address: string;
  value: number;
}

/**
 * 주소별 최근 데이터
 */
export interface AddressData {
  address: string;
  data: RealtimeDataPoint[];
  lastValue: number;
  lastUpdate: number;
}

class RealtimeDataService {
  private db: Database.Database | null = null;
  private memoryCache = new Map<string, RealtimeDataPoint[]>(); // 주소별 최근 20개
  private pollingInterval: NodeJS.Timeout | null = null;
  private connection: PLCConnector | null = null;
  private currentAddresses: string[] = []; // 현재 폴링 중인 주소들
  private maxDataPoints = 20; // 메모리 캐시 최대 포인트

  /**
   * 데이터베이스 초기화
   */
  private initializeDatabase(): void {
    try {
      const dbPath = path.join(process.cwd(), "data", "energy.db");
      this.db = new Database(dbPath);

      // 테이블 생성
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS realtime_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          address TEXT NOT NULL,
          value INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_address ON realtime_data(address);
        CREATE INDEX IF NOT EXISTS idx_timestamp ON realtime_data(timestamp);
        CREATE INDEX IF NOT EXISTS idx_address_timestamp ON realtime_data(address, timestamp DESC);
      `);

      console.log("[RealtimeDataService] Database initialized");
    } catch (error) {
      console.error(
        "[RealtimeDataService] Database initialization error:",
        error
      );
    }
  }

  /**
   * 실시간 폴링 시작
   */
  startPolling(
    addresses: string[],
    ip: string,
    port: number,
    interval: number = 2000,
    plcType: string = "mc", // isDemoMode 대신 plcType 사용
    addressMapping?: any // Modbus 매핑 정보 추가
  ): void {
    // DB 초기화
    if (!this.db) {
      this.initializeDatabase();
    }

    // 이미 폴링 중이면 기존 폴링 중지
    if (this.pollingInterval) {
      this.stopPolling();
    }

    this.currentAddresses = addresses;

    // 연결 설정
    if (plcType === "demo") {
      this.connection = mockPlc;
    } else if (plcType === "modbus") {
      // Modbus TCP 연결
      const mapping = addressMapping || { dAddressBase: 0, modbusOffset: 0 };
      this.connection = new XgtModbusPLC(ip, port, 1, mapping);
      console.log(
        `[RealtimeDataService] Connecting to LS Modbus TCP at ${ip}:${port}`
      );
    } else {
      // 기본값: Mitsubishi MC Protocol
      this.connection = McPLC.getInstance(ip, port);
      console.log(
        `[RealtimeDataService] Connecting to Mitsubishi MC at ${ip}:${port}`
      );
    }

    // 즉시 첫 폴링 실행
    this.pollData();

    // 주기적 폴링 설정
    this.pollingInterval = setInterval(() => {
      this.pollData();
    }, interval);

    // ✅ 파일에 폴링 상태 저장 (프로세스간 공유)
    setRealtimePolling(true);

    console.log(
      `[RealtimeDataService] Started polling ${addresses.length} addresses with interval ${interval}ms`
    );
  }

  /**
   * 폴링 중지
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.memoryCache.clear();

    // ✅ 파일에 폴링 상태 저장 (프로세스간 공유)
    setRealtimePolling(false);

    console.log("[RealtimeDataService] Polling stopped");
  }

  /**
   * 폴링 상태 확인
   */
  isPollingActive(): boolean {
    return this.pollingInterval !== null;
  }

  /**
   * 데이터 폴링 실행
   */
  private async pollData(): Promise<void> {
    if (!this.connection || this.currentAddresses.length === 0) {
      return;
    }

    try {
      const data = await this.connection.read(this.currentAddresses);
      const timestamp = Date.now();

      // 각 주소별로 데이터 저장
      Object.entries(data).forEach(([address, value]) => {
        if (typeof value === "number") {
          this.saveToDatabase(address, value, timestamp);
          this.updateMemoryCache(address, value, timestamp);
        }
      });
    } catch (error) {
      console.error("[RealtimeDataService] Polling failed:", error);
    }
  }

  /**
   * DB에 데이터 저장
   */
  private saveToDatabase(
    address: string,
    value: number,
    timestamp: number
  ): void {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO realtime_data (timestamp, address, value)
        VALUES (?, ?, ?)
      `);

      stmt.run(timestamp, address, value);
    } catch (error) {
      console.error(
        "[RealtimeDataService] Failed to save data:",
        address,
        error
      );
    }
  }

  /**
   * 메모리 캐시 업데이트 (최근 20개만 유지)
   */
  private updateMemoryCache(
    address: string,
    value: number,
    timestamp: number
  ): void {
    if (!this.memoryCache.has(address)) {
      this.memoryCache.set(address, []);
    }

    const cache = this.memoryCache.get(address)!;
    cache.push({ timestamp, address, value });

    // 최대 포인트 초과 시 오래된 것 제거
    if (cache.length > this.maxDataPoints) {
      cache.shift();
    }
  }

  /**
   * 특정 주소의 최근 데이터 조회 (DB에서) - 개수 기준
   * @deprecated getRecentDataByTime 사용 권장
   */
  getRecentData(address: string, limit: number = 20): RealtimeDataPoint[] {
    if (!this.db) {
      return [];
    }

    try {
      const stmt = this.db.prepare(`
        SELECT timestamp, address, value FROM realtime_data
        WHERE address = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const rows = stmt.all(address, limit) as RealtimeDataPoint[];
      // 오래된 것부터 최신 순으로 정렬
      return rows.reverse();
    } catch (error) {
      console.error("[RealtimeDataService] Failed to get recent data:", error);
      return [];
    }
  }

  /**
   * 특정 주소의 최근 N시간 데이터 조회 (시간 범위 기준)
   * @param address PLC 주소
   * @param hours 조회할 시간 (기본값: 6시간)
   * @returns 해당 시간 범위의 모든 데이터 포인트 (시간순 정렬)
   */
  getRecentDataByTime(address: string, hours: number = 6): RealtimeDataPoint[] {
    if (!this.db) {
      return [];
    }

    try {
      // 현재 시간 기준 N시간 전 타임스탬프 계산
      const now = Date.now();
      const cutoffTime = now - hours * 60 * 60 * 1000;

      const stmt = this.db.prepare(`
        SELECT timestamp, address, value FROM realtime_data
        WHERE address = ? AND timestamp >= ?
        ORDER BY timestamp ASC
      `);

      return stmt.all(address, cutoffTime) as RealtimeDataPoint[];
    } catch (error) {
      console.error(
        "[RealtimeDataService] Failed to get recent data by time:",
        error
      );
      return [];
    }
  }


  /**
   * 가상 데이터를 DB 및 메모리 캐시에 저장 (테스트용)
   * @param points 저장할 데이터 포인트 배열
   */
  insertTestData(points: RealtimeDataPoint[]): void {
    if (!this.db) {
      this.initializeDatabase();
    }

    try {
      const stmt = this.db!.prepare(`
        INSERT INTO realtime_data (timestamp, address, value)
        VALUES (?, ?, ?)
      `);

      points.forEach((point) => {
        stmt.run(point.timestamp, point.address, point.value);
        this.updateMemoryCache(point.address, point.value, point.timestamp);
      });

      console.log(
        `[RealtimeDataService] Inserted ${points.length} test data points`
      );
    } catch (error) {
      console.error("[RealtimeDataService] Failed to insert test data:", error);
    }
  }

  /**
   * 특정 주소의 최신값 조회
   */
  getLatestValue(address: string): number | null {
    const cache = this.memoryCache.get(address);
    if (!cache || cache.length === 0) {
      return null;
    }
    return cache[cache.length - 1].value;
  }

  /**
   * 특정 시간 범위 데이터 조회 (DB에서)
   */
  getDataRange(
    address: string,
    startTime: number,
    endTime: number
  ): RealtimeDataPoint[] {
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT timestamp, address, value FROM realtime_data
        WHERE address = ? AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
      `);

      return stmt.all(address, startTime, endTime) as RealtimeDataPoint[];
    } catch (error) {
      console.error("[RealtimeDataService] Failed to get data range:", error);
      return [];
    }
  }

  /**
   * 모든 주소의 현재 값 조회
   */
  getAllLatestValues(): Record<string, number | null> {
    const result: Record<string, number | null> = {};
    this.currentAddresses.forEach((address) => {
      result[address] = this.getLatestValue(address);
    });
    return result;
  }

  /**
   * 데이터베이스 종료
   */
  closeDatabase(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 오래된 데이터 정리 (7일 이상 된 데이터 삭제)
   */
  cleanupOldData(daysToKeep: number = 7): void {
    if (!this.db) return;

    try {
      const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
      const stmt = this.db.prepare(`
        DELETE FROM realtime_data WHERE timestamp < ?
      `);

      const changes = stmt.run(cutoffTime).changes;
      console.log(
        `[RealtimeDataService] Cleaned up ${changes} old data entries`
      );
    } catch (error) {
      console.error("[RealtimeDataService] Failed to cleanup old data:", error);
    }
  }
}

/**
 * 싱글톤 인스턴스 관리 (Singleton Factory Pattern)
 * - 전역 변수에 저장하여 서버 인스턴스 재시작 전까지 유지
 * - 개발/배포 환경 모두에서 동일한 인스턴스 사용
 * - globalThis 사용으로 Next.js 모듈 캐싱 문제 해결
 */
declare global {
  var __realtimeDataServiceInstance: RealtimeDataService | undefined;
}

/**
 * 싱글톤 인스턴스 생성/반환
 * - 첫 호출: 새 인스턴스 생성
 * - 이후 호출: 기존 인스턴스 반환
 */
function getRealtimeDataServiceInstance(): RealtimeDataService {
  if (!globalThis.__realtimeDataServiceInstance) {
    globalThis.__realtimeDataServiceInstance = new RealtimeDataService();
  }
  return globalThis.__realtimeDataServiceInstance;
}

export const realtimeDataService = getRealtimeDataServiceInstance();
