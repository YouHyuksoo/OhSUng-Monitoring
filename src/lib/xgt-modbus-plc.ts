/**
 * @file src/lib/xgt-modbus-plc.ts
 * @description
 * LS ELECTRIC XGT PLC와 Modbus TCP 프로토콜을 이용한 통신을 담당합니다.
 * 현재 Mitsubishi MC Protocol을 대체하기 위해 추상 인터페이스 패턴을 따릅니다.
 *
 * 아키텍처:
 * - PLCConnector 인터페이스 구현으로 다양한 PLC 프로토콜 지원
 * - modbus-serial 라이브러리를 통한 TCP 통신
 * - Modbus 레지스터 주소 변환 기능
 *
 * 초보자 가이드:
 * 1. **생성자 (Constructor)**: IP, Port, Slave ID를 받아서 초기화
 *    - 예: new XgtModbusPLC("192.168.1.10", 502, 1)
 * 2. **연결 (connect)**: PLC와 TCP 연결 수행
 * 3. **읽기 (read)**: D400 형식의 주소에서 데이터 읽기
 *    - 예: read(["D400", "D410"]) → {"D400": 25, "D410": 30}
 * 4. **쓰기 (write)**: 특정 주소에 데이터 입력
 *    - 예: write("D401", 55) → D401 에 55 설정
 *
 * @example
 * const plc = new XgtModbusPLC("192.168.1.100", 502);
 * await plc.connect();
 * const data = await plc.read(["D400", "D410"]);
 * console.log(data); // { D400: 25, D410: 30 }
 * await plc.disconnect();
 *
 * @deprecated
 * 주의: 현재는 기본적인 Modbus 주소 매핑을 사용 중입니다.
 * 실제 LS PLC의 Modbus 레지스터 매핑과 다를 수 있으므로,
 * addressToRegister 함수를 LS 사양서에 맞게 수정해야 합니다.
 */

import ModbusRTU from "modbus-serial";
import { PLCConnector, PLCData } from "./plc-connector";

/**
 * Modbus 주소 매핑 설정
 */
export interface ModbusAddressMappingConfig {
  dAddressBase: number;
  modbusOffset: number;
}

export class XgtModbusPLC implements PLCConnector {
  private client: ModbusRTU = new ModbusRTU();
  private isConnected: boolean = false;
  private ip: string;
  private port: number;
  private slaveId: number;
  private addressMapping: ModbusAddressMappingConfig;

  /**
   * XgtModbusPLC 생성자
   * @param ip - PLC IP 주소 (예: "192.168.1.100")
   * @param port - Modbus TCP 포트 (기본: 502)
   * @param slaveId - Modbus Slave ID (기본: 1)
   * @param addressMapping - Modbus 주소 매핑 설정 (기본: {dAddressBase: 0, modbusOffset: 0})
   */
  constructor(
    ip: string,
    port: number,
    slaveId: number = 1,
    addressMapping: ModbusAddressMappingConfig = {
      dAddressBase: 0,
      modbusOffset: 0,
    }
  ) {
    this.ip = ip;
    this.port = port;
    this.slaveId = slaveId;
    this.addressMapping = addressMapping;
  }

  /**
   * PLC와 Modbus TCP 연결 수행
   * - 이미 연결되어 있으면 즉시 반환
   * - 연결 실패 시 에러 로깅 및 에러 반환
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    return new Promise((resolve, reject) => {
      this.client.connectTCP(this.ip, { port: this.port }, (err: any) => {
        if (err) {
          console.error("LS PLC Modbus TCP Connection Error:", err);
          this.isConnected = false;
          reject(err);
        } else {
          console.log(
            `Connected to LS PLC (Modbus TCP) at ${this.ip}:${this.port}`
          );
          this.client.setID(this.slaveId);
          // TCP 타임아웃을 120초로 설정 (기본값 10초 → 폴링 간격이 길어도 연결 유지)
          this.client.setTimeout(120000);
          this.isConnected = true;

          // 연결 끊김 감지를 위한 이벤트 리스너
          this.client.on("error", (err: any) => {
            console.error("PLC Modbus Connection Error Event:", err);
            this.connectionReset();
          });

          resolve();
        }
      });
    });
  }

  /**
   * 연결 상태 초기화
   * - 연결 끊김 또는 에러 발생 시 호출
   */
  private connectionReset() {
    this.isConnected = false;
  }

  /**
   * PLC와의 Modbus TCP 연결 종료
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    this.client.close();
    this.isConnected = false;
    console.log("Disconnected from LS PLC");
  }

  /**
   * 주소를 Modbus 레지스터 오프셋으로 변환
   * D주소(D400) 또는 WORD주소(50)를 직접 parseInt로 처리
   *
   * @param address - D400, D401, 50, 51 등의 주소
   * @returns - parseInt 결과값 (숫자만 추출)
   */
  private addressToRegister(address: string): number {
    return parseInt(address, 10);
  }

  /**
   * PLC에서 여러 주소의 데이터 읽기 (debug-modbus.js 방식)
   * - 순차적으로 각 주소 읽기 수행 (debug-modbus.js와 동일)
   * - 연결되지 않았으면 자동 연결 시도
   * - readInputRegisters (FC04) 사용
   * - 읽기 실패 시 해당 주소 값을 0으로 설정
   *
   * @param addresses - 읽을 주소 배열 (예: ["50", "51", "52"])
   * @returns - 주소별 값의 객체 (예: {"50": 256, "51": 255, "52": 263})
   */
  async read(addresses: string[]): Promise<PLCData> {
    if (!this.isConnected) {
      try {
        console.log(`[XgtModbusPLC] 연결 시도 중 ${this.ip}:${this.port}...`);
        await this.connect();
        console.log(`[XgtModbusPLC] ✅ 연결 성공`);
      } catch (e) {
        const errorMsg =
          e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        console.error(`[XgtModbusPLC] ❌ 연결 실패 - ${errorMsg}`);
        // 연결 실패 시 모든 주소에 0 반환
        const fallback: PLCData = {};
        addresses.forEach((addr) => (fallback[addr] = 0));
        return fallback;
      }
    }

    const result: PLCData = {};

    console.log(`[XgtModbusPLC] 📍 ${addresses.length}개 주소 읽기 시작:`, addresses);
    console.log(`[XgtModbusPLC] 📊 읽기 명령:`);

    // debug-modbus.js처럼 순차적으로 읽기 (콜백 방식)
    for (const addr of addresses) {
      try {
        const regAddr = this.addressToRegister(addr);
        console.log(`   📍 ${addr} (레지스터 ${regAddr}) 읽는 중...`);

        // debug-modbus.js와 동일: readInputRegisters (FC04) 사용
        const data = await new Promise<any>((resolve, reject) => {
          (this.client as any).readInputRegisters(
            regAddr,
            1,
            (err: any, data: any) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            }
          );
        });

        // data.data[0] 형식으로 값 추출 (debug-modbus.js와 동일)
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          const value = data.data[0];
          result[addr] = value;
          console.log(`      ✅ 값: ${value}`);
        } else {
          console.warn(
            `[XgtModbusPLC] ⚠️  ${addr} 응답 형식 오류:`,
            JSON.stringify(data)
          );
          result[addr] = 0;
        }
      } catch (e) {
        const errorMsg =
          e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        console.error(`      ❌ 실패: ${errorMsg}`);
        result[addr] = 0; // 읽기 실패 시 0으로 설정
      }
    }

    console.log(`\n[XgtModbusPLC] ✅ 읽기 완료!`);
    console.log(`[XgtModbusPLC] 📊 읽기 결과:`, result);
    return result;
  }

  /**
   * PLC의 특정 주소에 데이터 쓰기
   * - 연결되지 않았으면 자동 연결 시도
   * - Modbus FC 6 (writeRegister) 사용
   *
   * @param address - 쓸 주소 (예: "D401")
   * @param value - 쓸 값 (정수)
   * @throws - 쓰기 실패 시 에러 발생
   */
  async write(address: string, value: number): Promise<void> {
    if (!this.isConnected) await this.connect();

    try {
      const regAddr = this.addressToRegister(address);

      // Modbus writeRegister (FC 6): 단일 레지스터 쓰기
      try {
        await (this.client as any).writeRegisterAsync(regAddr, value);
        console.log(`Wrote ${value} to ${address}`);
      } catch (e) {
        // 비동기 메서드가 없으면 콜백 기반으로 시도
        await new Promise<void>((resolve, reject) => {
          (this.client as any).writeRegister(regAddr, value, (err: any) => {
            if (err) {
              console.error(`Failed to write ${address}:`, err);
              reject(err);
            } else {
              console.log(`Wrote ${value} to ${address}`);
              resolve();
            }
          });
        });
      }
    } catch (e) {
      throw e;
    }
  }
}
