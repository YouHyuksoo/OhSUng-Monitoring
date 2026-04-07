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

/**
 * 실시간 데이터 포인트
 * - 주소의 의미(name)도 함께 저장
 */
export interface RealtimeDataPoint {
  timestamp: number;
  address: string;
  value: number;
  name?: string; // 주소의 의미 (예: "수절온도1", "순방향 유효전력량")
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
  private addressNameMap = new Map<string, string>(); // 주소별 이름 매핑

  // 폴링 통계 (디버깅용)
  private pollingStats = {
    totalPolls: 0,
    successfulPolls: 0,
    failedPolls: 0,
    consecutiveFailures: 0,
    allZeroResponses: 0,
    lastPollTime: 0,
    lastSuccessTime: 0,
    currentInterval: 0
  };

  /**
   * 데이터베이스 초기화
   * - realtime_data 테이블 생성 또는 업그레이드
   * - name 컬럼이 없으면 추가 (마이그레이션)
   */
  private initializeDatabase(): void {
    try {
      const dbPath = path.join(process.cwd(), "data", "energy.db");
      this.db = new Database(dbPath);

      // 🔄 마이그레이션: name 컬럼이 없으면 추가
      try {
        this.db.prepare("SELECT name FROM realtime_data LIMIT 0").all();
      } catch {
        // name 컬럼이 없으면 추가
        console.log(
          "[RealtimeDataService] Adding 'name' column to realtime_data table..."
        );
        try {
          this.db.exec(
            `ALTER TABLE realtime_data ADD COLUMN name TEXT DEFAULT NULL;`
          );
          console.log("[RealtimeDataService] 'name' column added successfully");
        } catch (altError) {
          console.log(
            "[RealtimeDataService] 'name' column might already exist or table doesn't exist yet"
          );
        }
      }

      // 테이블 생성 (기존 테이블이 있으면 무시)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS realtime_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          address TEXT NOT NULL,
          value INTEGER NOT NULL,
          name TEXT DEFAULT NULL
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
   * - 한 번만 PLC 연결 체크 후 성공하면 폴링 루프 시작
   * - 연결 실패하면 에러 던짐 (폴링 루프 시작 안 함)
   * - addressNameMap: 주소별 이름 매핑 (예: { "D400": "수절온도1", "D4032": "순방향 유효전력량" })
   */
  async startPolling(
    addresses: string[],
    ip: string,
    port: number,
    interval: number = 2000,
    plcType: string = "mc",
    addressMapping?: any,
    addressNameMap?: Record<string, string>,
    dwordAddresses?: string[]
  ): Promise<void> {
    // DB 초기화
    if (!this.db) {
      this.initializeDatabase();
    }

    // 이미 폴링 중이면 기존 폴링 중지
    if (this.pollingInterval) {
      this.stopPolling();
    }

    this.currentAddresses = addresses;

    // 🔤 주소 이름 매핑 저장
    if (addressNameMap) {
      this.addressNameMap.clear();
      Object.entries(addressNameMap).forEach(([address, name]) => {
        this.addressNameMap.set(address, name);
      });
      console.log(
        "[RealtimeDataService] Address name map loaded:",
        this.addressNameMap
      );
    }

    // 연결 설정
    if (plcType === "demo") {
      this.connection = mockPlc;
    } else if (plcType === "modbus") {
      // Modbus TCP 연결
      const mapping = addressMapping || { dAddressBase: 0, modbusOffset: 0 };
      const plc = new XgtModbusPLC(ip, port, 1, mapping);
      if (dwordAddresses && dwordAddresses.length > 0) {
        plc.setDwordAddresses(dwordAddresses);
      }
      this.connection = plc;
    } else {
      // 기본값: Mitsubishi MC Protocol
      this.connection = McPLC.getInstance(ip, port);
    }

    // 🔴 핵심: 한 번만 연결 체크 (demo 모드 제외)
    if (plcType !== "demo") {
      console.log(`[RealtimeDataService] PLC 연결 테스트 중 ${ip}:${port}...`);
      try {
        const testData = await this.connection.read(addresses.slice(0, 1));

        // 결과 데이터 확인
        const values = Object.values(testData);
        console.log(`[RealtimeDataService] 📊 테스트 응답:`, testData);

        // null 값만 있으면 실패 (0이나 다른 숫자는 정상 응답)
        const hasOnlyNull =
          values.length === 0 ||
          values.every((val) => val === null || val === undefined);
        if (hasOnlyNull) {
          throw new Error("PLC에서 유효한 응답이 없습니다");
        }

        console.log(`[RealtimeDataService] ✅ PLC 연결 성공! 폴링 루프 시작`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[RealtimeDataService] ❌ 연결 테스트 실패: ${errorMsg}`);
        this.connection = null;
        throw new Error(`PLC 연결 실패: ${errorMsg}`);
      }
    }

    // 폴링 통계 초기화
    this.pollingStats = {
      totalPolls: 0,
      successfulPolls: 0,
      failedPolls: 0,
      consecutiveFailures: 0,
      allZeroResponses: 0,
      lastPollTime: 0,
      lastSuccessTime: 0,
      currentInterval: interval
    };

    // 연결 성공 후 주기적 폴링 설정
    this.pollingInterval = setInterval(() => {
      this.pollData();
    }, interval);

    console.log("\n" + "#".repeat(70));
    console.log(`[RealtimeDataService] 폴링 시작!`);
    console.log(`   주소 개수: ${addresses.length}개`);
    console.log(`   인터벌: ${interval}ms (${interval/1000}초)`);
    if (interval > 10000) {
      console.log(`   ⚠️ 경고: 폴링 인터벌이 10초 이상입니다!`);
      console.log(`      PLC 연결 유지 시간(Keep-alive) 초과로 값이 0이 될 수 있습니다.`);
    }
    console.log("#".repeat(70) + "\n");
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

    const pollStartTime = Date.now();
    this.pollingStats.totalPolls++;
    this.pollingStats.lastPollTime = pollStartTime;

    // 마지막 성공 이후 경과 시간
    const timeSinceLastSuccess = this.pollingStats.lastSuccessTime
      ? pollStartTime - this.pollingStats.lastSuccessTime
      : 0;

    console.log(`\n[RealtimeDataService][POLL_START]`);
    console.log(`   폴링 #${this.pollingStats.totalPolls}`);
    console.log(`   마지막 성공 이후: ${timeSinceLastSuccess}ms (${(timeSinceLastSuccess/1000).toFixed(1)}초)`);
    console.log(`   인터벌: ${this.pollingStats.currentInterval}ms`);

    try {
      const data = await this.connection.read(this.currentAddresses);
      const timestamp = Date.now();
      const pollDuration = timestamp - pollStartTime;

      // 모든 값이 0인지 체크
      const values = Object.values(data);
      const allZero = values.length > 0 && values.every(v => v === 0);
      const nonZeroCount = values.filter(v => v !== 0).length;

      if (allZero) {
        this.pollingStats.allZeroResponses++;
        this.pollingStats.consecutiveFailures++;
        console.log("\n" + "⚠".repeat(35));
        console.log(`[RealtimeDataService] ⚠️ 모든 값이 0!`);
        console.log(`   총 0응답 횟수: ${this.pollingStats.allZeroResponses}`);
        console.log(`   연속 실패: ${this.pollingStats.consecutiveFailures}`);
        console.log(`   폴링 소요 시간: ${pollDuration}ms`);
        console.log(`   가능한 원인:`);
        console.log(`      - 폴링 인터벌(${this.pollingStats.currentInterval}ms)이 PLC 연결 유지 시간 초과`);
        console.log(`      - PLC가 연결을 끊음`);
        console.log(`      - 네트워크 불안정`);
        if (this.pollingStats.currentInterval > 10000) {
          console.log(`   💡 권장: 폴링 인터벌을 10초 이하로 줄여보세요`);
        }
        console.log("⚠".repeat(35) + "\n");
      } else {
        this.pollingStats.successfulPolls++;
        this.pollingStats.lastSuccessTime = timestamp;
        this.pollingStats.consecutiveFailures = 0;
      }

      // 폴링 데이터 로깅
      console.log("\n" + "─".repeat(70));
      console.log(`📊 [폴링 ${new Date().toLocaleTimeString("ko-KR")}] (${pollDuration}ms)`);
      console.log(`   통계: 성공 ${this.pollingStats.successfulPolls}/${this.pollingStats.totalPolls}, 0응답 ${this.pollingStats.allZeroResponses}`);
      console.log("─".repeat(70));
      console.log(`📍 주소별 값 (${nonZeroCount}/${values.length}개가 0이 아님):`);

      // 각 주소별로 데이터 저장
      Object.entries(data).forEach(([address, value]) => {
        if (typeof value === "number") {
          const name = this.addressNameMap.get(address);
          const displayName = name ? `${address} (${name})` : address;
          console.log(`   ${displayName}: ${value}${value === 0 ? ' ⚠️' : ''}`);
          this.saveToDatabase(address, value, timestamp);
          this.updateMemoryCache(address, value, timestamp);
        } else {
          console.log(`   ${address}: ${value} (⚠️ 유효하지 않은 값)`);
        }
      });
      console.log("─".repeat(70) + "\n");
    } catch (error) {
      this.pollingStats.failedPolls++;
      this.pollingStats.consecutiveFailures++;
      const errorMsg = error instanceof Error ? error.message : String(error);

      console.error("\n" + "!".repeat(70));
      console.error(`[RealtimeDataService] ❌ 폴링 실패!`);
      console.error(`   에러: ${errorMsg}`);
      console.error(`   연속 실패: ${this.pollingStats.consecutiveFailures}회`);
      console.error(`   총 실패: ${this.pollingStats.failedPolls}/${this.pollingStats.totalPolls}`);
      console.error("!".repeat(70) + "\n");
    }
  }

  /**
   * DB에 데이터 저장
   * - 주소의 이름(name)도 함께 저장
   */
  private saveToDatabase(
    address: string,
    value: number,
    timestamp: number
  ): void {
    if (!this.db) return;

    try {
      // 🔤 주소의 이름 조회
      const name = this.addressNameMap.get(address) || null;

      const stmt = this.db.prepare(`
        INSERT INTO realtime_data (timestamp, address, value, name)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(timestamp, address, value, name);
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
   * - name 컬럼도 함께 조회
   * @deprecated getRecentDataByTime 사용 권장
   */
  getRecentData(address: string, limit: number = 20): RealtimeDataPoint[] {
    if (!this.db) {
      return [];
    }

    try {
      const stmt = this.db.prepare(`
        SELECT timestamp, address, value, name FROM realtime_data
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
   * - name 컬럼도 함께 조회
   * - 최대 300개로 균등 샘플링하여 차트 과부하 방지
   * @param address PLC 주소
   * @param hours 조회할 시간 (기본값: 6시간)
   * @param maxPoints 최대 반환 포인트 수 (기본값: 300)
   * @returns 해당 시간 범위의 데이터 포인트 (시간순 정렬, 최대 maxPoints개)
   */
  getRecentDataByTime(
    address: string,
    hours: number = 6,
    maxPoints: number = 300
  ): RealtimeDataPoint[] {
    if (!this.db) {
      return [];
    }

    try {
      // 현재 시간 기준 N시간 전 타임스탬프 계산
      const now = Date.now();
      const cutoffTime = now - hours * 60 * 60 * 1000;

      const stmt = this.db.prepare(`
        SELECT timestamp, address, value, name FROM realtime_data
        WHERE address = ? AND timestamp >= ?
        ORDER BY timestamp ASC
      `);

      const all = stmt.all(address, cutoffTime) as RealtimeDataPoint[];

      // 데이터가 maxPoints 이하면 그대로 반환
      if (all.length <= maxPoints) {
        return all;
      }

      // 균등 샘플링: 전체 데이터에서 maxPoints개만 추출
      const step = (all.length - 1) / (maxPoints - 1);
      const sampled: RealtimeDataPoint[] = [];
      for (let i = 0; i < maxPoints; i++) {
        sampled.push(all[Math.round(i * step)]);
      }
      return sampled;
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
   * 특정 주소의 메모리 캐시 데이터 조회
   * - useMemoryPolling이 true일 때 API에서 사용
   * - 최근 20개의 폴링 데이터를 반환
   * @param address PLC 주소
   * @returns 메모리 캐시에 저장된 최근 데이터 포인트 배열
   */
  getMemoryCache(address: string): RealtimeDataPoint[] {
    return this.memoryCache.get(address) || [];
  }

  /**
   * 특정 시간 범위 데이터 조회 (DB에서)
   * - name 컬럼도 함께 조회
   */
  getDataRange(
    address: string,
    startTime: number,
    endTime: number
  ): RealtimeDataPoint[] {
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT timestamp, address, value, name FROM realtime_data
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

  /**
   * DB에 저장된 모든 주소 목록 조회
   */
  getAvailableAddresses(): string[] {
    if (!this.db) {
      this.initializeDatabase();
    }

    try {
      const stmt = this.db!.prepare(`
        SELECT DISTINCT address FROM realtime_data
        ORDER BY address ASC
      `);

      const rows = stmt.all() as Array<{ address: string }>;
      return rows.map((row) => row.address);
    } catch (error) {
      console.error(
        "[RealtimeDataService] Failed to get available addresses:",
        error
      );
      return [];
    }
  }

  /**
   * 날짜 범위로 데이터 조회 (모든 주소 또는 특정 주소)
   * - name 컬럼도 함께 조회
   * @param from YYYY-MM-DD 형식의 시작 날짜
   * @param to YYYY-MM-DD 형식의 종료 날짜
   * @param address 특정 주소 (선택 사항)
   */
  getDateRangeData(
    from: string,
    to: string,
    address?: string
  ): RealtimeDataPoint[] {
    if (!this.db) {
      this.initializeDatabase();
    }

    try {
      // 날짜를 타임스탬프로 변환
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      const fromTime = fromDate.getTime();

      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      const toTime = toDate.getTime();

      let query = `
        SELECT timestamp, address, value, name FROM realtime_data
        WHERE timestamp >= ? AND timestamp <= ?
      `;
      const params: any[] = [fromTime, toTime];

      if (address) {
        query += ` AND address = ?`;
        params.push(address);
      }

      query += ` ORDER BY timestamp ASC`;

      const stmt = this.db!.prepare(query);
      return stmt.all(...params) as RealtimeDataPoint[];
    } catch (error) {
      console.error(
        "[RealtimeDataService] Failed to get date range data:",
        error
      );
      return [];
    }
  }

  /**
   * 날짜 범위로 데이터 삭제 (모든 주소 또는 특정 주소)
   * @param from YYYY-MM-DD 형식의 시작 날짜
   * @param to YYYY-MM-DD 형식의 종료 날짜
   * @param address 특정 주소 (선택 사항)
   * @returns 삭제된 데이터 개수
   */
  deleteDataByDateRange(
    from: string,
    to: string,
    address: string | null | undefined = undefined
  ): number {
    if (!this.db) {
      this.initializeDatabase();
    }

    try {
      // 날짜를 타임스탬프로 변환
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      const fromTime = fromDate.getTime();

      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      const toTime = toDate.getTime();

      let query = `
        DELETE FROM realtime_data
        WHERE timestamp >= ? AND timestamp <= ?
      `;
      const params: any[] = [fromTime, toTime];

      if (address) {
        query += ` AND address = ?`;
        params.push(address);
      }

      const stmt = this.db!.prepare(query);
      const result = stmt.run(...params);

      console.log(
        `[RealtimeDataService] Deleted ${
          result.changes
        } data points from ${from} to ${to}${
          address ? ` for address ${address}` : ""
        }`
      );

      return result.changes;
    } catch (error) {
      console.error(
        "[RealtimeDataService] Failed to delete date range data:",
        error
      );
      return 0;
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
