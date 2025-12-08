/**
 * @file src/lib/mc-plc.ts
 * @description
 * Mitsubishi MC Protocol을 이용한 PLC 통신을 구현합니다.
 * mcprotocol 라이브러리를 사용하여 FX3U/Q-Series 등의 PLC와 TCP 통신합니다.
 * 이 클래스는 애플리케이션 전체에서 단 하나의 인스턴스만 존재하는 싱글톤으로 구현됩니다.
 *
 * 초보자 가이드:
 * 1. **mcprotocol 라이브러리**: 미쓰비시 PLC와의 MC Protocol 통신을 담당
 *    - addItems(): 읽을 주소를 등록
 *    - readAllItems(): 등록된 주소들을 모두 읽음
 *    - writeItems(): 특정 주소에 값을 씀
 *
 * 2. **주소 형식**: D430,1은 D430부터 1개 데이터 읽기를 의미
 *    - D400~D470: 온도 센서 데이터
 *    - D4000~D4038: 전력 데이터
 *
 * @example
 * // new McPLC() 대신 getInstance()를 사용합니다.
 * const plc = McPLC.getInstance('192.168.0.1', 2000);
 * await plc.connect();
 * const data = await plc.read(['D430,1', 'D4000,1']);
 * await plc.disconnect();
 */

import { PLCConnector, PLCData } from "./plc-connector";
import MC from "mcprotocol";

export class McPLC implements PLCConnector {
  // 싱글톤 인스턴스를 저장하기 위한 정적 변수
  private static instance: McPLC;

  /**
   * mcprotocol 라이브러리 인스턴스
   */
  private conn: any;

  /**
   * 연결 상태 플래그
   */
  private isConnected: boolean = false;

  /**
   * PLC IP 주소
   */
  private ip: string;

  /**
   * PLC 포트 번호
   */
  private port: number;

  /**
   * 현재 읽고 있는 작업 진행 중 상태
   */
  private isReading: boolean = false;

  /**
   * 생성자를 private으로 선언하여 외부에서 직접 인스턴스화를 방지합니다.
   * @param ip PLC IP 주소
   * @param port PLC 포트 번호
   */
  private constructor(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
    this.conn = new MC();
  }

  /**
   * McPLC의 싱글톤 인스턴스를 가져옵니다.
   * 최초 호출 시에만 인스턴스를 생성하고, 이후에는 생성된 인스턴스를 반환합니다.
   * @param ip PLC IP 주소 (최초 생성 시에만 사용됨)
   * @param port PLC 포트 번호 (최초 생성 시에만 사용됨)
   * @returns McPLC 인스턴스
   */
  public static getInstance(ip: string, port: number): McPLC {
    if (!McPLC.instance) {
      McPLC.instance = new McPLC(ip, port);
    }
    return McPLC.instance;
  }

  /**
   * PLC와의 TCP 연결을 시작합니다.
   * 이미 연결되어 있으면 아무것도 하지 않습니다.
   *
   * @throws Error PLC 연결 실패 시
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    return new Promise((resolve, reject) => {
      console.log("\n" + "=".repeat(70));
      console.log("🔌 PLC 연결 시도 중...");
      console.log(`   IP: ${this.ip}, 포트: ${this.port}`);
      console.log("=".repeat(70));

      this.conn.initiateConnection(
        {
          port: this.port,
          host: this.ip,
          ascii: false, // 이진 모드 사용 (더 빠름)
        },
        (err: any) => {
          if (err) {
            console.error("\n❌ PLC 연결 실패!");
            console.error(`   에러: ${err.message || JSON.stringify(err)}`);
            console.error(`   코드: ${err.code}`);
            console.log("=".repeat(70) + "\n");
            this.isConnected = false;
            reject(err);
          } else {
            console.log(`✅ PLC 연결 성공! (${this.ip}:${this.port})`);
            console.log("=".repeat(70) + "\n");
            this.isConnected = true;
            resolve();
          }
        }
      );
    });
  }

  /**
   * PLC와의 연결을 종료합니다.
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    this.conn.dropConnection();
    this.isConnected = false;
    console.log("Disconnected from PLC");
  }

  /**
   * PLC에서 주어진 주소들의 데이터를 읽습니다.
   * mcprotocol의 addItems()와 readAllItems()를 사용합니다.
   *
   * @param addresses - 읽을 주소 배열 (예: ['D430,1', 'D400,1'])
   * @returns 주소를 키, 읽은 값을 value로 하는 객체
   *
   * @example
   * const data = await plc.read(['D430,1', 'D4000,1']);
   * console.log(data); // { 'D430,1': 45.2, 'D4000,1': 220 }
   */
  async read(addresses: string[]): Promise<PLCData> {
    // 연결이 안 되어 있으면 연결 시도
    if (!this.isConnected) {
      try {
        await this.connect();
      } catch (e) {
        console.error("Failed to connect for read:", e);
        // 연결 실패 시 0으로 채운 결과 반환
        const fallback: PLCData = {};
        addresses.forEach((addr) => (fallback[addr] = 0));
        return fallback;
      }
    }

    // 이미 읽고 있는 중이면 대기
    if (this.isReading) {
      console.warn("Read already in progress, waiting...");
      // 간단히 0 반환 또는 별도의 큐 시스템 구현 가능
      const fallback: PLCData = {};
      addresses.forEach((addr) => (fallback[addr] = 0));
      return fallback;
    }

    return new Promise((resolve) => {
      this.isReading = true;

      try {
        // mcprotocol에 읽을 항목들 추가
        // 예: 'D430,1' = D430부터 1개 값 읽기
        this.conn.addItems(addresses);

        // 모든 항목 읽기
        this.conn.readAllItems((err: any, values: any) => {
          this.isReading = false;

          if (err) {
            console.error("❌ MC Protocol 읽기 에러:", err);
            // 에러 발생 시 0으로 채운 결과 반환
            const fallback: PLCData = {};
            addresses.forEach((addr) => (fallback[addr] = 0));
            resolve(fallback);
          } else {
            // 📡 PLC 응답 데이터 콘솔 출력
            console.log("\n" + "=".repeat(70));
            console.log("✅ PLC 응답 수신!");
            console.log("=".repeat(70));
            console.log("📋 요청한 주소:");
            addresses.forEach((addr, i) => {
              console.log(`   ${i + 1}. ${addr}`);
            });
            console.log("\n📊 PLC 응답 데이터:");
            console.log(JSON.stringify(values, null, 2));
            console.log("\n📈 파싱된 결과:");

            // values는 { 'D430,1': value, 'D4000,1': value, ... } 형태
            // 배열로 반환되는 경우 첫 번째 값만 추출
            const result: PLCData = {};
            addresses.forEach((addr) => {
              const val = values[addr];
              // 배열로 반환되면 첫 번째 값 사용
              result[addr] = Array.isArray(val) ? val[0] : val;
              console.log(`   ${addr}: ${result[addr]}`);
            });
            console.log("=".repeat(70) + "\n");
            resolve(result);
          }
        });
      } catch (e) {
        this.isReading = false;
        console.error("Failed to read:", e);
        const fallback: PLCData = {};
        addresses.forEach((addr) => (fallback[addr] = 0));
        resolve(fallback);
      }
    });
  }

  /**
   * PLC의 특정 주소에 값을 씁니다.
   * mcprotocol의 writeItems()를 사용합니다.
   *
   * @param address - 쓸 주소 (예: 'D430,1')
   * @param value - 쓸 값
   *
   * @example
   * await plc.write('D430,1', 50); // D430에 50 저장
   */
  async write(address: string, value: number): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.connect();
      } catch (e) {
        console.error("Failed to connect for write:", e);
        throw e;
      }
    }

    return new Promise((resolve, reject) => {
      try {
        console.log("\n" + "=".repeat(70));
        console.log("✍️  PLC에 데이터 쓰기 시도");
        console.log(`   주소: ${address}`);
        console.log(`   값: ${value}`);
        console.log("=".repeat(70));

        // mcprotocol writeItems 사용
        // writeItems(항목, 값, 콜백)
        this.conn.writeItems(address, [value], (err: any) => {
          if (err) {
            console.error(`\n❌ 쓰기 실패 (${address}):`);
            console.error(`   에러: ${err.message || JSON.stringify(err)}`);
            console.log("=".repeat(70) + "\n");
            reject(err);
          } else {
            console.log(`✅ 쓰기 성공!`);
            console.log(`   ${address} = ${value}`);
            console.log("=".repeat(70) + "\n");
            resolve();
          }
        });
      } catch (e) {
        console.error("❌ 쓰기 중 에러:", e);
        console.log("=".repeat(70) + "\n");
        reject(e);
      }
    });
  }
}
