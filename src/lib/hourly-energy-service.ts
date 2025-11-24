/**
 * @file src/lib/hourly-energy-service.ts
 * @description
 * 일일 전력 누적 데이터 1시간 단위 폴링 서비스 (SQLite)
 * - D6100 주소에서 매 정각마다 데이터 수집
 * - 서버 시간 기준으로 SQLite에 저장
 * - 자정(00:00)에 초기화됨
 *
 * 데이터베이스 스키마:
 * - hourly_energy 테이블: date, hour, value 저장
 */

import Database from "better-sqlite3";
import path from "path";
import { McPLC } from "./mc-plc";
import { plc as mockPlc } from "./mock-plc";
import { PLCConnector } from "./plc-connector";

/**
 * 시간별 에너지 데이터
 */
export interface HourlyEnergyData {
  date: string; // YYYY-MM-DD 형식
  hours: {
    [hour: number]: number; // 0-23 시간대별 누적값 (Wh)
  };
  lastUpdate: number; // 타임스탐프
}

class HourlyEnergyService {
  private db: Database.Database | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private connection: PLCConnector | null = null;
  private currentData: HourlyEnergyData | null = null;
  private ip: string = "";
  private port: number = 502;

  /**
   * 데이터베이스 초기화
   */
  private initializeDatabase(): void {
    try {
      const dbPath = path.join(process.cwd(), "data", "energy.db");
      this.db = new Database(dbPath);

      // 테이블 생성
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS hourly_energy (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          hour INTEGER NOT NULL,
          value INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          UNIQUE(date, hour)
        );
        CREATE INDEX IF NOT EXISTS idx_date ON hourly_energy(date);
      `);

      console.log("[HourlyEnergyService] Database initialized");
    } catch (error) {
      console.error(
        "[HourlyEnergyService] Database initialization error:",
        error
      );
    }
  }

  /**
   * 1시간 단위 폴링 시작
   */
  startHourlyPolling(
    ip: string,
    port: number,
    isDemoMode: boolean = false
  ): void {
    this.ip = ip;
    this.port = port;

    // DB 초기화
    if (!this.db) {
      this.initializeDatabase();
    }

    // 연결 설정
    if (isDemoMode) {
      this.connection = mockPlc;
    } else {
      this.connection = new McPLC(ip, port);
    }

    // 초기화
    this.loadTodayData();

    // 즉시 한 번 실행
    this.pollD6100();

    // 다음 정각까지 계산해서 첫 폴링 예약
    this.scheduleNextPoll();

    console.log(`[HourlyEnergyService] Started for ${ip}:${port}`);
  }

  /**
   * 폴링 중지
   */
  stopHourlyPolling(): void {
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
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
   * 테스트 데이터 삽입 (개발/데모용)
   * 각 시간별로 랜덤 누적 에너지 값 생성
   */
  insertTestData(date: string): void {
    if (!this.db) {
      this.initializeDatabase();
    }

    try {
      const stmt = this.db!.prepare(`
        INSERT INTO hourly_energy (date, hour, value, timestamp)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(date, hour) DO UPDATE SET value = ?, timestamp = ?
      `);

      // 1~24시간대별 랜덤 값 생성
      for (let hour = 1; hour <= 24; hour++) {
        const value = Math.round(500 + Math.random() * 1000); // 500~1500 Wh
        const timestamp = Date.now();
        stmt.run(date, hour, value, timestamp, value, timestamp);
      }

      console.log(`[HourlyEnergyService] Test data inserted for ${date}`);

      // 현재 날짜면 메모리에 로드
      const today = this.getTodayString();
      if (date === today) {
        this.loadTodayData();
      }
    } catch (error) {
      console.error("[HourlyEnergyService] Failed to insert test data:", error);
    }
  }

  /**
   * 현재 데이터 조회
   */
  getCurrentData(): HourlyEnergyData | null {
    // 메모리에 없으면 DB에서 로드
    if (!this.currentData) {
      this.loadTodayData();
    }
    return this.currentData;
  }

  /**
   * 특정 날짜 데이터 조회
   */
  getDayData(date: string): HourlyEnergyData | null {
    // DB가 없으면 초기화
    if (!this.db) {
      this.initializeDatabase();
      // 초기화 후에도 DB가 없으면 null 반환
      if (!this.db) {
        console.error("[HourlyEnergyService] Database not available");
        return null;
      }
    }

    try {
      const stmt = this.db.prepare(`
        SELECT hour, value FROM hourly_energy
        WHERE date = ?
        ORDER BY hour ASC
      `);

      const rows = stmt.all(date) as Array<{ hour: number; value: number }>;

      if (rows.length === 0) {
        return null;
      }

      const hours: { [hour: number]: number } = {};
      rows.forEach((row) => {
        hours[row.hour] = row.value;
      });

      return {
        date,
        hours,
        lastUpdate: Date.now(),
      };
    } catch (error) {
      console.error("[HourlyEnergyService] Failed to get day data:", error);
      return null;
    }
  }

  /**
   * 프라이빗 메서드들
   */
  private loadTodayData(): void {
    const today = this.getTodayString();
    this.currentData = this.getDayData(today);

    if (!this.currentData) {
      this.currentData = {
        date: today,
        hours: {},
        lastUpdate: Date.now(),
      };
    }
  }

  private getTodayString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
  }

  private getCurrentHour(): number {
    return new Date().getHours();
  }

  private saveDataToDatabase(date: string, hour: number, value: number): void {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO hourly_energy (date, hour, value, timestamp)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(date, hour) DO UPDATE SET value = ?, timestamp = ?
      `);

      const timestamp = Date.now();
      stmt.run(date, hour, value, timestamp, value, timestamp);

      console.log(
        `[HourlyEnergyService] Saved to DB: ${date} ${hour}:00 = ${value}Wh`
      );
    } catch (error) {
      console.error("[HourlyEnergyService] Failed to save to database:", error);
    }
  }

  private pollD6100 = async () => {
    if (!this.connection) return;

    try {
      // 자정 확인 - 날짜가 바뀌었으면 초기화
      const today = this.getTodayString();
      if (this.currentData && this.currentData.date !== today) {
        console.log(
          `[HourlyEnergyService] Date changed, reinitializing for ${today}`
        );
        this.loadTodayData();
      }

      // D6100 데이터 읽기
      const data = await this.connection.read(["D6100"]);
      const value = data["D6100"];

      if (typeof value === "number") {
        const hour = this.getCurrentHour();

        if (this.currentData) {
          this.currentData.hours[hour] = value;
          this.currentData.lastUpdate = Date.now();

          // DB에 저장
          this.saveDataToDatabase(today, hour, value);

          // 다음 정각 스케줄링
          this.scheduleNextPoll();
        }
      }
    } catch (error) {
      console.error("[HourlyEnergyService] Polling failed:", error);
      this.scheduleNextPoll();
    }
  };

  private scheduleNextPoll(): void {
    // 다음 정각까지의 시간 계산
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

    const delay = nextHour.getTime() - now.getTime();

    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
    }

    this.pollingInterval = setTimeout(() => {
      this.pollD6100();
    }, delay);

    console.log(
      `[HourlyEnergyService] Next poll scheduled in ${Math.round(
        delay / 1000
      )}s`
    );
  }
}

// 싱글톤 인스턴스
export const hourlyEnergyService = new HourlyEnergyService();
