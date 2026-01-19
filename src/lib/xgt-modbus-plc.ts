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

  // 디버깅용 통계
  private lastSuccessfulRead: number = 0;
  private lastConnectionTime: number = 0;
  private totalReadRequests: number = 0;
  private successfulReads: number = 0;
  private failedReads: number = 0;
  private consecutiveFailures: number = 0;
  private connectionAttempts: number = 0;

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
   * 상세 디버그 로그 출력
   */
  private logDebug(phase: string, details: Record<string, any> = {}): void {
    const timestamp = new Date().toISOString();
    const timeSinceLastSuccess = this.lastSuccessfulRead
      ? Date.now() - this.lastSuccessfulRead
      : 0;
    const timeSinceConnection = this.lastConnectionTime
      ? Date.now() - this.lastConnectionTime
      : 0;

    console.log(`[XgtModbusPLC][${timestamp}][${phase}]`);
    console.log(`   IP: ${this.ip}:${this.port}`);
    console.log(`   연결상태 플래그: ${this.isConnected}`);
    console.log(`   마지막 성공 읽기 이후: ${timeSinceLastSuccess}ms (${(timeSinceLastSuccess/1000).toFixed(1)}초)`);
    console.log(`   연결 이후 경과: ${timeSinceConnection}ms (${(timeSinceConnection/1000).toFixed(1)}초)`);
    console.log(`   통계: 총 ${this.totalReadRequests}회, 성공 ${this.successfulReads}, 실패 ${this.failedReads}, 연속실패 ${this.consecutiveFailures}`);

    if (Object.keys(details).length > 0) {
      console.log(`   추가 정보:`);
      Object.entries(details).forEach(([key, value]) => {
        console.log(`      ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      });
    }
  }

  /**
   * 에러 객체를 상세 문자열로 변환
   */
  private formatError(err: any): string {
    if (!err) return 'null/undefined error';
    if (typeof err === 'string') return err;

    const parts: string[] = [];
    if (err.name) parts.push(`name=${err.name}`);
    if (err.message) parts.push(`msg=${err.message}`);
    if (err.code) parts.push(`code=${err.code}`);
    if (err.errno) parts.push(`errno=${err.errno}`);
    if (err.syscall) parts.push(`syscall=${err.syscall}`);
    if (err.address) parts.push(`addr=${err.address}`);
    if (err.port) parts.push(`port=${err.port}`);

    if (parts.length === 0) {
      try {
        return JSON.stringify(err);
      } catch {
        return String(err);
      }
    }

    return parts.join(', ');
  }

  /**
   * 연결이 실제로 유효한지 확인
   */
  private isConnectionValid(): boolean {
    // 연결 플래그가 false면 무효
    if (!this.isConnected) {
      return false;
    }

    // 클라이언트 상태 확인
    if (!this.client || !this.client.isOpen) {
      this.logDebug('CONNECTION_CHECK', {
        valid: false,
        reason: 'client.isOpen이 false',
        clientExists: !!this.client,
        isOpen: this.client?.isOpen
      });
      this.isConnected = false;
      return false;
    }

    // 마지막 성공 읽기 이후 시간 체크 (15초 이상이면 의심)
    const timeSinceLastRead = Date.now() - this.lastSuccessfulRead;
    if (this.lastSuccessfulRead > 0 && timeSinceLastRead > 15000) {
      this.logDebug('CONNECTION_CHECK', {
        valid: 'uncertain',
        reason: `마지막 성공 이후 ${timeSinceLastRead}ms 경과 (15초 초과)`,
        recommendation: '연결 상태 불확실 - 재연결 권장'
      });
      // 15초 이상 경과했으면 연결 상태를 의심
      return false;
    }

    return true;
  }

  /**
   * 강제 재연결 수행
   */
  async forceReconnect(): Promise<void> {
    this.logDebug('FORCE_RECONNECT', { reason: '강제 재연결 시작' });

    // 기존 연결 종료
    try {
      if (this.client) {
        this.client.close();
      }
    } catch (e) {
      console.warn('[XgtModbusPLC] 기존 연결 종료 중 에러 (무시됨):', this.formatError(e));
    }

    this.isConnected = false;

    // 새 클라이언트 생성
    this.client = new ModbusRTU();

    // 잠시 대기 후 재연결 (소켓 정리 시간)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 재연결
    await this.connect();
  }

  /**
   * PLC와 Modbus TCP 연결 수행
   * - 이미 연결되어 있으면 즉시 반환
   * - 연결 실패 시 에러 로깅 및 에러 반환
   */
  async connect(): Promise<void> {
    this.connectionAttempts++;

    if (this.isConnected && this.client?.isOpen) {
      this.logDebug('CONNECT_SKIP', { reason: '이미 연결됨', isOpen: this.client.isOpen });
      return;
    }

    const connectStartTime = Date.now();
    this.logDebug('CONNECT_START', {
      attempt: this.connectionAttempts,
      previouslyConnected: this.isConnected
    });

    return new Promise((resolve, reject) => {
      // 연결 타임아웃 (10초)
      const connectionTimeout = setTimeout(() => {
        this.logDebug('CONNECT_TIMEOUT', { elapsed: Date.now() - connectStartTime });
        this.isConnected = false;
        reject(new Error('Connection timeout after 10 seconds'));
      }, 10000);

      this.client.connectTCP(this.ip, { port: this.port }, (err: any) => {
        clearTimeout(connectionTimeout);
        const connectDuration = Date.now() - connectStartTime;

        if (err) {
          console.error("\n" + "!".repeat(70));
          console.error("[XgtModbusPLC] ❌ Modbus TCP 연결 실패!");
          console.error(`   에러: ${this.formatError(err)}`);
          console.error(`   소요 시간: ${connectDuration}ms`);
          console.error("!".repeat(70) + "\n");
          this.logDebug('CONNECT_FAILED', {
            error: this.formatError(err),
            durationMs: connectDuration
          });
          this.isConnected = false;
          reject(err);
        } else {
          console.log("\n" + "=".repeat(70));
          console.log(`[XgtModbusPLC] ✅ Modbus TCP 연결 성공!`);
          console.log(`   IP: ${this.ip}:${this.port}`);
          console.log(`   소요 시간: ${connectDuration}ms`);
          console.log(`   연결 시도 횟수: ${this.connectionAttempts}`);
          console.log("=".repeat(70) + "\n");

          this.client.setID(this.slaveId);
          // TCP 타임아웃을 30초로 설정 (폴링 간격보다 길게)
          this.client.setTimeout(30000);
          this.isConnected = true;
          this.lastConnectionTime = Date.now();
          this.consecutiveFailures = 0; // 연결 성공 시 리셋

          // 연결 끊김 감지를 위한 이벤트 리스너
          this.client.on("error", (err: any) => {
            console.error("\n" + "!".repeat(70));
            console.error("[XgtModbusPLC] ❌ 소켓 에러 이벤트 발생!");
            console.error(`   에러: ${this.formatError(err)}`);
            console.error("!".repeat(70) + "\n");
            this.logDebug('SOCKET_ERROR', { error: this.formatError(err) });
            this.connectionReset();
          });

          this.client.on("close", () => {
            console.warn("[XgtModbusPLC] ⚠️ 소켓 close 이벤트 - 연결 종료됨");
            this.logDebug('SOCKET_CLOSE', { reason: 'close 이벤트' });
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
    this.totalReadRequests++;
    const readStartTime = Date.now();
    const timeSinceLastSuccess = this.lastSuccessfulRead
      ? readStartTime - this.lastSuccessfulRead
      : 0;

    this.logDebug('READ_START', {
      requestNumber: this.totalReadRequests,
      addressCount: addresses.length,
      timeSinceLastSuccessMs: timeSinceLastSuccess,
      timeSinceLastSuccessSec: (timeSinceLastSuccess / 1000).toFixed(1),
      isOpen: this.client?.isOpen
    });

    // 연결 유효성 확인 및 필요시 재연결
    if (!this.isConnectionValid()) {
      this.logDebug('CONNECTION_INVALID', {
        reason: '연결 유효하지 않음 - 재연결 시도',
        isConnected: this.isConnected,
        isOpen: this.client?.isOpen
      });
      try {
        await this.forceReconnect();
      } catch (e) {
        this.failedReads++;
        this.consecutiveFailures++;
        console.error(`[XgtModbusPLC] ❌ 재연결 실패: ${this.formatError(e)}`);
        this.logDebug('READ_FAIL', {
          reason: '재연결 실패',
          error: this.formatError(e)
        });
        const fallback: PLCData = {};
        addresses.forEach((addr) => (fallback[addr] = 0));
        return fallback;
      }
    }

    // 연결이 안 되어 있으면 연결 시도
    if (!this.isConnected || !this.client?.isOpen) {
      try {
        console.log(`[XgtModbusPLC] 연결 시도 중 ${this.ip}:${this.port}...`);
        await this.connect();
        console.log(`[XgtModbusPLC] ✅ 연결 성공`);
      } catch (e) {
        this.failedReads++;
        this.consecutiveFailures++;
        console.error(`[XgtModbusPLC] ❌ 연결 실패: ${this.formatError(e)}`);
        this.logDebug('READ_FAIL', {
          reason: '연결 실패',
          error: this.formatError(e)
        });
        const fallback: PLCData = {};
        addresses.forEach((addr) => (fallback[addr] = 0));
        return fallback;
      }
    }

    const result: PLCData = {};
    let readSuccessCount = 0;
    let readFailCount = 0;

    console.log(`[XgtModbusPLC] 📍 ${addresses.length}개 주소 읽기 시작`);

    // 순차적으로 읽기
    for (const addr of addresses) {
      try {
        const regAddr = this.addressToRegister(addr);

        // readInputRegisters (FC04) 사용 with 타임아웃
        const data = await Promise.race([
          new Promise<any>((resolve, reject) => {
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
          }),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Read timeout (5s)')), 5000)
          )
        ]);

        // 값 추출
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          const value = data.data[0];
          result[addr] = value;
          readSuccessCount++;
        } else {
          console.warn(`[XgtModbusPLC] ⚠️ ${addr} 응답 형식 오류:`, JSON.stringify(data));
          result[addr] = 0;
          readFailCount++;
        }
      } catch (e) {
        const errorMsg = this.formatError(e);
        console.error(`[XgtModbusPLC] ❌ ${addr} 읽기 실패: ${errorMsg}`);
        result[addr] = 0;
        readFailCount++;

        // 연결 에러인 경우 연결 상태 초기화
        const errCode = (e as any)?.code;
        if (errCode === 'ECONNRESET' || errCode === 'EPIPE' || errCode === 'ETIMEDOUT' ||
            (e instanceof Error && e.message.includes('timeout'))) {
          this.logDebug('CONNECTION_LOST', {
            error: errorMsg,
            code: errCode
          });
          this.connectionReset();
          // 연결이 끊어졌으면 나머지 주소도 실패 처리
          addresses.slice(addresses.indexOf(addr) + 1).forEach(a => {
            result[a] = 0;
            readFailCount++;
          });
          break;
        }
      }
    }

    const readDuration = Date.now() - readStartTime;
    const allZero = Object.values(result).every(v => v === 0);

    if (readFailCount === 0 && !allZero) {
      // 모두 성공
      this.successfulReads++;
      this.lastSuccessfulRead = Date.now();
      this.consecutiveFailures = 0;
    } else {
      this.failedReads++;
      this.consecutiveFailures++;
    }

    console.log(`\n[XgtModbusPLC] 📊 읽기 완료 (${readDuration}ms)`);
    console.log(`   성공: ${readSuccessCount}개, 실패: ${readFailCount}개`);
    if (allZero) {
      console.log(`   ⚠️ 경고: 모든 값이 0입니다!`);
      this.logDebug('ALL_ZERO_WARNING', {
        readDurationMs: readDuration,
        possibleCauses: [
          '폴링 인터벌이 길어 PLC 연결이 끊김',
          'PLC가 연결을 종료함',
          '네트워크 불안정'
        ],
        consecutiveFailures: this.consecutiveFailures
      });
    }

    this.logDebug('READ_COMPLETE', {
      readDurationMs: readDuration,
      successCount: readSuccessCount,
      failCount: readFailCount,
      allZero,
      consecutiveFailures: this.consecutiveFailures
    });

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
