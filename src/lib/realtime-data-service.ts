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
import { plc as mockPlc } from "./mock-plc";
import { PLCConnector } from "./plc-connector";

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
  private pollInterval: number = 2000; // 기본 폴링 인터벌
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
      console.error("[RealtimeDataService] Database initialization error:", error);
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
    isDemoMode: boolean = false
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
    this.pollInterval = interval;

    // 연결 설정
    if (isDemoMode) {
      this.connection = mockPlc;
    } else {
      this.connection = new McPLC(ip, port);
    }

    // 즉시 첫 폴링 실행
    this.pollData();

    // 주기적 폴링 설정
    this.pollingInterval = setInterval(() => {
      this.pollData();
    }, interval);

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
    console.log("[RealtimeDataService] Polling stopped");
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
   * 특정 주소의 최근 데이터 조회 (메모리 캐시)
   */
  getRecentData(address: string, limit: number = 20): RealtimeDataPoint[] {
    const cache = this.memoryCache.get(address) || [];
    return cache.slice(-limit);
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

      console.log(`[RealtimeDataService] Inserted ${points.length} test data points`);
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
      console.error(
        "[RealtimeDataService] Failed to get data range:",
        error
      );
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

// 싱글톤 인스턴스
export const realtimeDataService = new RealtimeDataService();
