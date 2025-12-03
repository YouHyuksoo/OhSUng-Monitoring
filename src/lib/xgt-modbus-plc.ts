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
   * D 주소를 Modbus 레지스터 오프셋으로 변환
   *
   * 변환 공식:
   * Modbus 오프셋 = (D주소 값 - dAddressBase) + modbusOffset
   *
   * 예시:
   * - dAddressBase=0, modbusOffset=0 → D400 = 400 (그대로)
   * - dAddressBase=400, modbusOffset=0 → D400 = 0, D401 = 1
   * - dAddressBase=0, modbusOffset=100 → D400 = 500 (모든 주소에 100 추가)
   *
   * @param address - "D400", "D410" 형식의 주소
   * @returns - Modbus 레지스터 오프셋 (0-Based)
   * @throws - 잘못된 주소 형식이면 에러 발생
   */
  private addressToRegister(address: string): number {
    const match = address.match(/^D(\d+)$/);
    if (!match) {
      throw new Error(`Invalid address format: ${address}`);
    }

    const dAddressValue = parseInt(match[1]);

    // 설정된 매핑 규칙 적용
    const modbusOffset =
      dAddressValue -
      this.addressMapping.dAddressBase +
      this.addressMapping.modbusOffset;

    // 디버그 모드일 때만 상세 매핑 로그 출력 (기본은 비활성화 - 반복 제거)
    if (process.env.DEBUG_MODBUS_MAPPING === "true") {
      console.log(
        `Address mapping: D${dAddressValue} → Modbus offset ${modbusOffset} ` +
          `(base=${this.addressMapping.dAddressBase}, offset=${this.addressMapping.modbusOffset})`
      );
    }

    return modbusOffset;
  }

  /**
   * PLC에서 여러 주소의 데이터 읽기
   * - 병렬로 모든 주소 읽기 수행
   * - 연결되지 않았으면 자동 연결 시도
   * - 읽기 실패 시 해당 주소 값을 0으로 설정
   *
   * @param addresses - 읽을 주소 배열 (예: ["D400", "D410"])
   * @returns - 주소별 값의 객체 (예: {"D400": 25, "D410": 30})
   */
  async read(addresses: string[]): Promise<PLCData> {
    if (!this.isConnected) {
      try {
        console.log(`[XgtModbusPLC] Connecting to ${this.ip}:${this.port}...`);
        await this.connect();
        console.log(`[XgtModbusPLC] ✅ Connected successfully`);
      } catch (e) {
        const errorMsg =
          e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        console.error(`[XgtModbusPLC] ❌ Connection failed - ${errorMsg}`);
        // 연결 실패 시 모든 주소에 0 반환 (크래시 방지)
        const fallback: PLCData = {};
        addresses.forEach((addr) => (fallback[addr] = 0));
        return fallback;
      }
    }

    const result: PLCData = {};

    await Promise.all(
      addresses.map(async (addr) => {
        try {
          const regAddr = this.addressToRegister(addr);

          // Modbus readHoldingRegisters (FC 3): 홀딩 레지스터 읽기
          try {
            // modbus-serial의 readHoldingRegisters는 { data: [val1, val2...], buffer: Buffer } 형태의 객체를 반환함
            const res = await (this.client as any).readHoldingRegistersAsync(
              regAddr,
              1
            );

            // 응답 구조 확인 및 값 추출
            if (res && Array.isArray(res.data) && res.data.length > 0) {
              result[addr] = res.data[0];
            } else if (Array.isArray(res)) {
              // 혹시 모를 배열 반환 대응
              result[addr] = res[0];
            } else {
              console.warn(
                `[XgtModbusPLC] Unexpected response format for ${addr}:`,
                JSON.stringify(res)
              );
              result[addr] = 0;
            }
          } catch (e) {
            // 비동기 메서드가 없으면 콜백 기반으로 시도
            const values = await new Promise<number[]>((resolve, reject) => {
              (this.client as any).readHoldingRegisters(
                regAddr,
                1,
                (err: any, data: any) => {
                  if (err) {
                    reject(err);
                  } else {
                    // 콜백의 data도 동일한 구조일 수 있음
                    if (data && Array.isArray(data.data)) {
                      resolve(data.data);
                    } else if (Array.isArray(data)) {
                      resolve(data);
                    } else {
                      resolve([0]);
                    }
                  }
                }
              );
            });
            result[addr] = values[0] || 0;
          }
        } catch (e) {
          const errorMsg =
            e instanceof Error ? `${e.name}: ${e.message}` : String(e);
          console.error(
            `[XgtModbusPLC] ❌ Read failed for ${addr} - ${errorMsg}`
          );
          result[addr] = 0; // Fallback
        }
      })
    );

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
