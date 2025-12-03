/**
 * @file src/lib/hourly-energy-service.ts
 * @description
 * 일일 전력 누적 데이터 1시간 단위 폴링 서비스 (SQLite)
 * - D6100 주소에서 매 정각마다 데이터 수집
 * - 서버 시간 기준으로 SQLite에 저장
 * - 날짜별 단일 행에 24개 시간 컬럼 (h0~h23) 저장
 *
 * 데이터베이스 스키마:
 * - daily_energy 테이블: date(PK), h0~h23, last_update
 * - 기존 hourly_energy 테이블과 호환되지 않음 (마이그레이션 필요)
 *
 * 초보자 가이드:
 * 1. **테이블 구조**: 날짜별 한 행, 시간별 컬럼 (h0=0시, h23=23시)
 * 2. **저장 방식**: 해당 시간 컬럼만 UPDATE (UPSERT)
 * 3. **조회 방식**: 날짜 범위로 한 번에 조회
 */

import Database from "better-sqlite3";
import path from "path";
import { McPLC } from "./mc-plc";
import { XgtModbusPLC } from "./xgt-modbus-plc";
import { plc as mockPlc } from "./mock-plc";
import { PLCConnector } from "./plc-connector";

/**
 * 날짜별 에너지 데이터 (단일 행)
 */
export interface DailyEnergyData {
  date: string; // YYYY-MM-DD 형식
  hours: number[]; // 인덱스 0-23 = 0시-23시 값 (Wh)
  lastUpdate: number; // 타임스탬프
}

/**
 * 여러 날짜 데이터 응답
 */
export interface EnergyDataResponse {
  data: DailyEnergyData[];
  from: string;
  to: string;
}

/**
 * 에너지 요약 데이터 (SQL SUM 결과)
 */
export interface EnergySummary {
  today: number; // 당일 누적 (Wh)
  weekly: number; // 주간 누적 (최근 7일)
  monthly: number; // 월간 누적 (최근 30일)
  dailyTotals: { date: string; total: number }[]; // 일별 합계 (차트용)
}

/**
 * 호환성을 위한 기존 인터페이스 (deprecated)
 * @deprecated DailyEnergyData 사용 권장
 */
export interface HourlyEnergyData {
  date: string;
  hours: {
    [hour: number]: number;
  };
  lastUpdate: number;
}

class HourlyEnergyService {
  private db: Database.Database | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private connection: PLCConnector | null = null;
  private currentData: DailyEnergyData | null = null;
  private ip: string = "";
  private port: number = 502;

  /**
   * 데이터베이스 초기화
   * - 새 테이블 구조: date(PK) + h0~h23 컬럼
   */
  private initializeDatabase(): void {
    try {
      const dbPath = path.join(process.cwd(), "data", "energy.db");
      this.db = new Database(dbPath);

      // 새 테이블 생성 (날짜별 단일 행, 24개 시간 컬럼)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS daily_energy (
          date TEXT PRIMARY KEY,
          h0 INTEGER DEFAULT 0,
          h1 INTEGER DEFAULT 0,
          h2 INTEGER DEFAULT 0,
          h3 INTEGER DEFAULT 0,
          h4 INTEGER DEFAULT 0,
          h5 INTEGER DEFAULT 0,
          h6 INTEGER DEFAULT 0,
          h7 INTEGER DEFAULT 0,
          h8 INTEGER DEFAULT 0,
          h9 INTEGER DEFAULT 0,
          h10 INTEGER DEFAULT 0,
          h11 INTEGER DEFAULT 0,
          h12 INTEGER DEFAULT 0,
          h13 INTEGER DEFAULT 0,
          h14 INTEGER DEFAULT 0,
          h15 INTEGER DEFAULT 0,
          h16 INTEGER DEFAULT 0,
          h17 INTEGER DEFAULT 0,
          h18 INTEGER DEFAULT 0,
          h19 INTEGER DEFAULT 0,
          h20 INTEGER DEFAULT 0,
          h21 INTEGER DEFAULT 0,
          h22 INTEGER DEFAULT 0,
          h23 INTEGER DEFAULT 0,
          last_update INTEGER NOT NULL DEFAULT 0
        );
      `);

      console.log("[HourlyEnergyService] Database initialized with new schema");
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
    plcType: string = "mc",
    addressMapping?: any
  ): void {
    this.ip = ip;
    this.port = port;

    // DB 초기화
    if (!this.db) {
      this.initializeDatabase();
    }

    // 연결 설정
    if (plcType === "demo") {
      this.connection = mockPlc;
    } else if (plcType === "modbus") {
      const mapping = addressMapping || { dAddressBase: 0, modbusOffset: 0 };
      this.connection = new XgtModbusPLC(ip, port, 1, mapping);
      console.log(
        `[HourlyEnergyService] Connecting to LS Modbus TCP at ${ip}:${port}`
      );
    } else {
      this.connection = new McPLC(ip, port);
      console.log(
        `[HourlyEnergyService] Connecting to Mitsubishi MC at ${ip}:${port}`
      );
    }

    // 오늘 데이터 로드
    this.loadTodayData();

    // 즉시 한 번 실행
    this.pollD6100();

    // 다음 정각 스케줄링
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
   * 폴링 중지 (Alias)
   */
  stopPolling(): void {
    this.stopHourlyPolling();
  }

  /**
   * 폴링 상태 확인
   */
  isPollingActive(): boolean {
    return this.pollingInterval !== null;
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
   * 특정 날짜에 랜덤 시간별 에너지 값 생성
   */
  insertTestData(date: string): void {
    if (!this.db) {
      this.initializeDatabase();
    }

    try {
      // 24시간 랜덤 값 생성
      const hours: number[] = [];
      for (let h = 0; h < 24; h++) {
        hours[h] = Math.round(500 + Math.random() * 1000); // 500~1500 Wh
      }

      const timestamp = Date.now();

      const stmt = this.db!.prepare(`
        INSERT INTO daily_energy (date, h0, h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12, h13, h14, h15, h16, h17, h18, h19, h20, h21, h22, h23, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          h0=?, h1=?, h2=?, h3=?, h4=?, h5=?, h6=?, h7=?, h8=?, h9=?, h10=?, h11=?, h12=?, h13=?, h14=?, h15=?, h16=?, h17=?, h18=?, h19=?, h20=?, h21=?, h22=?, h23=?, last_update=?
      `);

      stmt.run(
        date,
        ...hours,
        timestamp,
        ...hours,
        timestamp
      );

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
   * 현재 데이터 조회 (오늘)
   */
  getCurrentData(): DailyEnergyData | null {
    if (!this.currentData) {
      this.loadTodayData();
    }
    return this.currentData;
  }

  /**
   * 특정 날짜 데이터 조회
   */
  getDayData(date: string): DailyEnergyData | null {
    if (!this.db) {
      this.initializeDatabase();
      if (!this.db) {
        console.error("[HourlyEnergyService] Database not available");
        return null;
      }
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM daily_energy WHERE date = ?
      `);

      const row = stmt.get(date) as any;

      if (!row) {
        return null;
      }

      // 행 데이터를 hours 배열로 변환
      const hours: number[] = [];
      for (let h = 0; h < 24; h++) {
        hours[h] = row[`h${h}`] || 0;
      }

      return {
        date: row.date,
        hours,
        lastUpdate: row.last_update,
      };
    } catch (error) {
      console.error("[HourlyEnergyService] Failed to get day data:", error);
      return null;
    }
  }

  /**
   * 날짜 범위로 여러 날짜 데이터 한 번에 조회
   * @param from 시작 날짜 (YYYY-MM-DD)
   * @param to 종료 날짜 (YYYY-MM-DD)
   */
  getDateRangeData(from: string, to: string): DailyEnergyData[] {
    if (!this.db) {
      this.initializeDatabase();
      if (!this.db) {
        console.error("[HourlyEnergyService] Database not available");
        return [];
      }
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM daily_energy
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC
      `);

      const rows = stmt.all(from, to) as any[];

      return rows.map((row) => {
        const hours: number[] = [];
        for (let h = 0; h < 24; h++) {
          hours[h] = row[`h${h}`] || 0;
        }
        return {
          date: row.date,
          hours,
          lastUpdate: row.last_update,
        };
      });
    } catch (error) {
      console.error("[HourlyEnergyService] Failed to get range data:", error);
      return [];
    }
  }

  /**
   * 날짜 문자열 포맷 헬퍼
   */
  private formatDateString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  /**
   * 에너지 요약 데이터 조회 (SQL에서 SUM 계산)
   * - 당일/주간/월간 누적량과 일별 합계를 한 번의 쿼리로 조회
   * - 데이터가 없는 날짜도 0으로 채워서 30일 전체 반환
   * @returns EnergySummary
   */
  getEnergySummary(): EnergySummary {
    if (!this.db) {
      this.initializeDatabase();
      if (!this.db) {
        console.error("[HourlyEnergyService] Database not available");
        return { today: 0, weekly: 0, monthly: 0, dailyTotals: [] };
      }
    }

    try {
      const today = this.getTodayString();

      // 30일 전, 7일 전 날짜 계산
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6); // 오늘 포함 7일
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 29); // 오늘 포함 30일

      const weekAgoStr = this.formatDateString(weekAgo);
      const monthAgoStr = this.formatDateString(monthAgo);

      // 1. 일별 합계 조회 (DB에 있는 데이터만)
      const dailyStmt = this.db.prepare(`
        SELECT
          date,
          (h0 + h1 + h2 + h3 + h4 + h5 + h6 + h7 + h8 + h9 + h10 + h11 + h12 + h13 + h14 + h15 + h16 + h17 + h18 + h19 + h20 + h21 + h22 + h23) as total
        FROM daily_energy
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC
      `);

      const dailyRows = dailyStmt.all(monthAgoStr, today) as Array<{ date: string; total: number }>;

      // DB 결과를 Map으로 변환 (빠른 조회용)
      const dataMap = new Map<string, number>();
      dailyRows.forEach((row) => {
        dataMap.set(row.date, row.total || 0);
      });

      // 2. 30일 전체 날짜 생성 (데이터 없으면 0으로 채움)
      const dailyTotals: { date: string; total: number }[] = [];
      let todayTotal = 0;
      let weeklyTotal = 0;
      let monthlyTotal = 0;

      for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
        const date = new Date(now);
        date.setDate(date.getDate() - daysAgo);
        const dateStr = this.formatDateString(date);

        // DB에 데이터가 있으면 사용, 없으면 0
        const total = dataMap.get(dateStr) || 0;

        dailyTotals.push({ date: dateStr, total });

        // 합계 계산
        monthlyTotal += total;

        if (dateStr >= weekAgoStr) {
          weeklyTotal += total;
        }

        if (dateStr === today) {
          todayTotal = total;
        }
      }

      return {
        today: todayTotal,
        weekly: weeklyTotal,
        monthly: monthlyTotal,
        dailyTotals,
      };
    } catch (error) {
      console.error("[HourlyEnergyService] Failed to get energy summary:", error);
      return { today: 0, weekly: 0, monthly: 0, dailyTotals: [] };
    }
  }

  /**
   * 호환성을 위한 기존 형식 변환
   * @deprecated 새 형식 사용 권장
   */
  getDayDataLegacy(date: string): HourlyEnergyData | null {
    const data = this.getDayData(date);
    if (!data) return null;

    // 배열을 객체로 변환 (기존 형식 호환)
    const hoursObj: { [hour: number]: number } = {};
    data.hours.forEach((value, index) => {
      if (value > 0) {
        hoursObj[index] = value;
      }
    });

    return {
      date: data.date,
      hours: hoursObj,
      lastUpdate: data.lastUpdate,
    };
  }

  /**
   * 프라이빗 메서드들
   */
  private loadTodayData(): void {
    const today = this.getTodayString();
    this.currentData = this.getDayData(today);

    if (!this.currentData) {
      // 오늘 데이터가 없으면 빈 배열로 초기화
      this.currentData = {
        date: today,
        hours: new Array(24).fill(0),
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

  /**
   * 특정 시간 컬럼만 업데이트 (UPSERT)
   */
  private saveHourValue(date: string, hour: number, value: number): void {
    if (!this.db) return;

    try {
      const timestamp = Date.now();
      const hourCol = `h${hour}`;

      // UPSERT: 행이 없으면 INSERT, 있으면 해당 컬럼만 UPDATE
      const stmt = this.db.prepare(`
        INSERT INTO daily_energy (date, ${hourCol}, last_update)
        VALUES (?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET ${hourCol} = ?, last_update = ?
      `);

      stmt.run(date, value, timestamp, value, timestamp);

      console.log(
        `[HourlyEnergyService] Saved: ${date} ${hour}:00 = ${value}Wh`
      );
    } catch (error) {
      console.error("[HourlyEnergyService] Failed to save hour value:", error);
    }
  }

  private pollD6100 = async () => {
    if (!this.connection) {
      console.warn("[HourlyEnergyService] No connection available for polling");
      return;
    }

    try {
      // 자정 확인 - 날짜가 바뀌었으면 초기화
      const today = this.getTodayString();
      if (this.currentData && this.currentData.date !== today) {
        console.log(
          `[HourlyEnergyService] Date changed, reinitializing for ${today}`
        );
        this.loadTodayData();
      }

      // D6100 데이터 읽기 - 실제 통신 시작
      const hour = this.getCurrentHour();
      const startTime = Date.now();

      console.log(
        `[HourlyEnergyService] Poll started - ${today} ${hour}:00:00, connecting to PLC...`
      );

      const data = await this.connection.read(["D6100"]);
      const value = data["D6100"];
      const elapsed = Date.now() - startTime;

      if (typeof value === "number") {
        if (this.currentData) {
          // 메모리 데이터 업데이트
          this.currentData.hours[hour] = value;
          this.currentData.lastUpdate = Date.now();

          // DB에 해당 시간만 업데이트
          this.saveHourValue(today, hour, value);

          // 다음 정각 스케줄링
          this.scheduleNextPoll();

          // 성공 로그
          console.log(
            `[HourlyEnergyService] ✅ Poll success - D6100: ${value}Wh (${elapsed}ms)`
          );
        } else {
          console.error(
            "[HourlyEnergyService] currentData is null, cannot update"
          );
        }
      } else {
        console.warn(
          `[HourlyEnergyService] ⚠️  Invalid value for D6100: ${JSON.stringify(value)} (${elapsed}ms)`
        );
        this.scheduleNextPoll();
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `[HourlyEnergyService] ❌ Poll failed - ${error.name}: ${error.message}`
        );
      } else {
        console.error(`[HourlyEnergyService] ❌ Poll failed - ${error}`);
      }
      this.scheduleNextPoll();
    }
  };

  private scheduleNextPoll(): void {
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

// 전역 타입 선언
declare global {
  var hourlyEnergyService: HourlyEnergyService | undefined;
}

// 싱글톤 인스턴스 관리
export const hourlyEnergyService =
  global.hourlyEnergyService || new HourlyEnergyService();

if (process.env.NODE_ENV !== "production") {
  global.hourlyEnergyService = hourlyEnergyService;
}
