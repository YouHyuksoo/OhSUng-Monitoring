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
   * 마지막 성공 통신 시간 (연결 상태 추적용)
   */
  private lastSuccessfulRead: number = 0;

  /**
   * 마지막 연결 시도 시간
   */
  private lastConnectionAttempt: number = 0;

  /**
   * 연결 시도 횟수 (디버깅용)
   */
  private connectionAttempts: number = 0;

  /**
   * 총 읽기 요청 횟수
   */
  private totalReadRequests: number = 0;

  /**
   * 성공한 읽기 횟수
   */
  private successfulReads: number = 0;

  /**
   * 실패한 읽기 횟수
   */
  private failedReads: number = 0;

  /**
   * 생성자를 private으로 선언하여 외부에서 직접 인스턴스화를 방지합니다.
   * @param ip PLC IP 주소
   * @param port PLC 포트 번호
   */
  private constructor(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
    this.conn = new MC();
    this.setupEventListeners();
  }

  /**
   * mcprotocol 연결 이벤트 리스너 설정
   * 연결 끊김, 에러, 타임아웃 등을 감지
   */
  private setupEventListeners(): void {
    // TCP 소켓 이벤트 리스너
    if (this.conn && this.conn.isoConnectionState !== undefined) {
      console.log("[MC-PLC] 이벤트 리스너 설정 중...");
    }

    // mcprotocol은 내부적으로 net.Socket을 사용
    // 연결 상태 변경 감지를 위한 폴링 체크 설정
    this.conn.on && this.conn.on('error', (err: any) => {
      this.logEvent('ERROR', `소켓 에러 발생: ${err?.message || err}`);
      this.isConnected = false;
    });

    this.conn.on && this.conn.on('close', () => {
      this.logEvent('CLOSE', 'PLC 연결이 종료되었습니다');
      this.isConnected = false;
    });

    this.conn.on && this.conn.on('end', () => {
      this.logEvent('END', 'PLC가 연결을 종료했습니다 (FIN 수신)');
      this.isConnected = false;
    });

    this.conn.on && this.conn.on('timeout', () => {
      this.logEvent('TIMEOUT', '소켓 타임아웃 발생');
      this.isConnected = false;
    });
  }

  /**
   * 디버그 이벤트 로그 출력
   */
  private logEvent(type: string, message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`\n${"!".repeat(70)}`);
    console.log(`[MC-PLC][${timestamp}][${type}] ${message}`);
    console.log(`   연결상태: ${this.isConnected ? "연결됨" : "끊김"}`);
    console.log(`   마지막 성공 읽기: ${this.lastSuccessfulRead ? new Date(this.lastSuccessfulRead).toISOString() : "없음"}`);
    console.log(`   통계: 총 ${this.totalReadRequests}회 요청, 성공 ${this.successfulReads}, 실패 ${this.failedReads}`);
    console.log(`${"!".repeat(70)}\n`);
  }

  /**
   * 상세 디버그 정보 출력
   */
  private logDebugInfo(phase: string, details: Record<string, any> = {}): void {
    const timestamp = new Date().toISOString();
    const elapsed = this.lastSuccessfulRead ? Date.now() - this.lastSuccessfulRead : 0;

    console.log(`[MC-PLC][${timestamp}][${phase}]`);
    console.log(`   IP: ${this.ip}:${this.port}`);
    console.log(`   연결상태 플래그: ${this.isConnected}`);
    console.log(`   마지막 성공 이후 경과: ${elapsed}ms (${(elapsed/1000).toFixed(1)}초)`);
    console.log(`   연결 시도 횟수: ${this.connectionAttempts}`);

    if (Object.keys(details).length > 0) {
      console.log(`   추가 정보:`);
      Object.entries(details).forEach(([key, value]) => {
        console.log(`      ${key}: ${JSON.stringify(value)}`);
      });
    }
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
    this.connectionAttempts++;
    this.lastConnectionAttempt = Date.now();

    // 이미 연결된 경우 연결 상태 확인
    if (this.isConnected) {
      this.logDebugInfo('CONNECT_SKIP', {
        reason: '이미 연결됨',
        connectionState: this.conn?.isoConnectionState
      });
      return;
    }

    return new Promise((resolve, reject) => {
      const connectStartTime = Date.now();

      console.log("\n" + "=".repeat(70));
      console.log("🔌 PLC 연결 시도 중...");
      console.log(`   IP: ${this.ip}, 포트: ${this.port}`);
      console.log(`   시도 횟수: ${this.connectionAttempts}번째`);
      console.log(`   시작 시간: ${new Date().toISOString()}`);
      console.log("=".repeat(70));

      // 연결 타임아웃 설정 (15초)
      const connectionTimeout = setTimeout(() => {
        this.logEvent('CONNECT_TIMEOUT', '연결 시도 15초 타임아웃');
        this.isConnected = false;
        reject(new Error('Connection timeout after 15 seconds'));
      }, 15000);

      this.conn.initiateConnection(
        {
          port: this.port,
          host: this.ip,
          ascii: false, // 이진 모드 사용 (더 빠름)
        },
        (err: any) => {
          clearTimeout(connectionTimeout);
          const connectDuration = Date.now() - connectStartTime;

          if (err) {
            console.error("\n❌ PLC 연결 실패!");
            console.error(`   에러 메시지: ${err.message || '없음'}`);
            console.error(`   에러 코드: ${err.code || '없음'}`);
            console.error(`   에러 원인: ${err.cause || '없음'}`);
            console.error(`   에러 전체: ${JSON.stringify(err)}`);
            console.error(`   연결 소요 시간: ${connectDuration}ms`);
            console.log("=".repeat(70) + "\n");
            this.isConnected = false;
            this.logEvent('CONNECT_FAILED', `연결 실패 - ${err.code || err.message}`);
            reject(err);
          } else {
            console.log(`✅ PLC 연결 성공! (${this.ip}:${this.port})`);
            console.log(`   연결 소요 시간: ${connectDuration}ms`);
            console.log(`   연결 상태: ${this.conn?.isoConnectionState}`);
            console.log("=".repeat(70) + "\n");
            this.isConnected = true;
            this.logEvent('CONNECT_SUCCESS', `연결 성공 (${connectDuration}ms 소요)`);
            resolve();
          }
        }
      );
    });
  }

  /**
   * 연결이 실제로 유효한지 확인
   * mcprotocol 내부 상태와 마지막 통신 시간을 확인
   */
  private isConnectionValid(): boolean {
    // 연결 플래그가 false면 무효
    if (!this.isConnected) {
      this.logDebugInfo('CONNECTION_CHECK', { valid: false, reason: 'isConnected=false' });
      return false;
    }

    // 마지막 성공 읽기 이후 시간 체크 (30초 이상이면 의심)
    const timeSinceLastRead = Date.now() - this.lastSuccessfulRead;
    if (this.lastSuccessfulRead > 0 && timeSinceLastRead > 30000) {
      this.logDebugInfo('CONNECTION_CHECK', {
        valid: false,
        reason: `마지막 성공 이후 ${timeSinceLastRead}ms 경과 (30초 초과)`,
        recommendation: '재연결 권장'
      });
      // 30초 이상 통신 없으면 연결 상태를 의심하고 재연결 시도
      return false;
    }

    return true;
  }

  /**
   * 강제 재연결 수행
   */
  async forceReconnect(): Promise<void> {
    this.logEvent('FORCE_RECONNECT', '강제 재연결 시작');

    // 기존 연결 종료
    try {
      this.conn.dropConnection();
    } catch (e) {
      console.warn('[MC-PLC] 기존 연결 종료 중 에러 (무시됨):', e);
    }

    this.isConnected = false;

    // 새 연결 객체 생성
    this.conn = new MC();
    this.setupEventListeners();

    // 재연결
    await this.connect();
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
    this.totalReadRequests++;
    const readStartTime = Date.now();
    const timeSinceLastSuccess = this.lastSuccessfulRead ? readStartTime - this.lastSuccessfulRead : 0;

    this.logDebugInfo('READ_START', {
      requestNumber: this.totalReadRequests,
      addressCount: addresses.length,
      timeSinceLastSuccessMs: timeSinceLastSuccess,
      timeSinceLastSuccessSec: (timeSinceLastSuccess / 1000).toFixed(1)
    });

    // 연결 유효성 확인 및 필요시 재연결
    if (!this.isConnectionValid()) {
      this.logEvent('CONNECTION_INVALID', '연결 유효하지 않음 - 재연결 시도');
      try {
        await this.forceReconnect();
      } catch (e) {
        this.failedReads++;
        console.error("[MC-PLC] 재연결 실패:", e);
        this.logDebugInfo('READ_FAIL', {
          reason: '재연결 실패',
          error: e instanceof Error ? e.message : String(e)
        });
        const fallback: PLCData = {};
        addresses.forEach((addr) => (fallback[addr] = 0));
        return fallback;
      }
    }

    // 연결이 안 되어 있으면 연결 시도
    if (!this.isConnected) {
      this.logDebugInfo('READ_CONNECT', { reason: '연결 플래그 false' });
      try {
        await this.connect();
      } catch (e) {
        this.failedReads++;
        console.error("[MC-PLC] 읽기를 위한 연결 실패:", e);
        this.logDebugInfo('READ_FAIL', {
          reason: '연결 실패',
          error: e instanceof Error ? e.message : String(e)
        });
        const fallback: PLCData = {};
        addresses.forEach((addr) => (fallback[addr] = 0));
        return fallback;
      }
    }

    // 이미 읽고 있는 중이면 대기
    if (this.isReading) {
      this.logEvent('READ_BUSY', '다른 읽기 작업 진행 중 - 스킵');
      const fallback: PLCData = {};
      addresses.forEach((addr) => (fallback[addr] = 0));
      return fallback;
    }

    return new Promise((resolve) => {
      this.isReading = true;

      // 읽기 타임아웃 설정 (10초)
      const readTimeout = setTimeout(() => {
        this.isReading = false;
        this.failedReads++;
        this.logEvent('READ_TIMEOUT', '읽기 요청 10초 타임아웃 - PLC 응답 없음');
        this.logDebugInfo('READ_TIMEOUT_DETAIL', {
          addressCount: addresses.length,
          elapsedMs: Date.now() - readStartTime,
          possibleCauses: [
            'PLC가 연결을 끊었을 수 있음',
            '네트워크 지연/불안정',
            'PLC 과부하',
            '잘못된 주소 요청'
          ]
        });
        // 타임아웃 시 연결 상태 초기화 (다음 요청에서 재연결 시도)
        this.isConnected = false;
        const fallback: PLCData = {};
        addresses.forEach((addr) => (fallback[addr] = 0));
        resolve(fallback);
      }, 10000);

      try {
        this.logDebugInfo('READ_EXECUTE', {
          action: 'addItems + readAllItems 호출',
          addresses: addresses.slice(0, 5), // 처음 5개만 로그
          totalAddresses: addresses.length
        });

        // mcprotocol에 읽을 항목들 추가
        this.conn.addItems(addresses);

        // 모든 항목 읽기
        this.conn.readAllItems((err: any, values: any) => {
          clearTimeout(readTimeout);
          this.isReading = false;
          const readDuration = Date.now() - readStartTime;

          if (err) {
            this.failedReads++;
            console.error("\n" + "!".repeat(70));
            console.error("[MC-PLC] ❌ MC Protocol 읽기 에러!");
            console.error(`   에러 타입: ${err?.name || 'Unknown'}`);
            console.error(`   에러 메시지: ${err?.message || 'None'}`);
            console.error(`   에러 코드: ${err?.code || 'None'}`);
            console.error(`   에러 전체: ${JSON.stringify(err)}`);
            console.error(`   소요 시간: ${readDuration}ms`);
            console.error(`   요청한 주소 수: ${addresses.length}`);
            console.error("!".repeat(70) + "\n");

            this.logDebugInfo('READ_ERROR', {
              errorType: err?.name,
              errorMessage: err?.message,
              errorCode: err?.code,
              readDurationMs: readDuration,
              addressCount: addresses.length
            });

            // 에러 발생 시 연결 상태 확인
            if (err?.code === 'ECONNRESET' || err?.code === 'EPIPE' || err?.code === 'ETIMEDOUT') {
              this.logEvent('CONNECTION_LOST', `연결 끊김 감지: ${err.code}`);
              this.isConnected = false;
            }

            const fallback: PLCData = {};
            addresses.forEach((addr) => (fallback[addr] = 0));
            resolve(fallback);
          } else {
            this.successfulReads++;
            this.lastSuccessfulRead = Date.now();

            // 값이 모두 0인지 체크 (비정상 응답 감지)
            const allZero = Object.values(values).every(v =>
              Array.isArray(v) ? v.every(x => x === 0) : v === 0
            );

            console.log("\n" + "=".repeat(70));
            console.log(`✅ PLC 응답 수신! (${readDuration}ms 소요)`);
            if (allZero) {
              console.log("⚠️  경고: 모든 값이 0입니다! PLC 연결 상태를 확인하세요.");
            }
            console.log("=".repeat(70));
            console.log(`📋 요청한 주소: ${addresses.length}개`);
            console.log(`   ${addresses.slice(0, 5).join(', ')}${addresses.length > 5 ? '...' : ''}`);
            console.log(`\n📊 PLC 응답 데이터 (일부):`);

            // 결과 파싱
            const result: PLCData = {};
            let nonZeroCount = 0;
            addresses.forEach((addr) => {
              const val = values[addr];
              result[addr] = Array.isArray(val) ? val[0] : val;
              if (result[addr] !== 0) nonZeroCount++;
            });

            // 샘플 출력 (처음 5개)
            addresses.slice(0, 5).forEach((addr) => {
              console.log(`   ${addr}: ${result[addr]}`);
            });
            if (addresses.length > 5) {
              console.log(`   ... 외 ${addresses.length - 5}개`);
            }

            console.log(`\n📈 통계: 총 ${addresses.length}개 중 ${nonZeroCount}개가 0이 아님`);
            if (allZero) {
              this.logDebugInfo('ALL_ZERO_WARNING', {
                readDurationMs: readDuration,
                addressCount: addresses.length,
                possibleCauses: [
                  'PLC 연결이 끊겼지만 소켓은 열려있음',
                  'PLC가 아직 데이터를 준비하지 않음',
                  '잘못된 주소 범위',
                  'PLC 통신 타임아웃 설정 문제'
                ]
              });
            }
            console.log("=".repeat(70) + "\n");

            this.logDebugInfo('READ_SUCCESS', {
              readDurationMs: readDuration,
              addressCount: addresses.length,
              nonZeroCount,
              allZero
            });

            resolve(result);
          }
        });
      } catch (e) {
        clearTimeout(readTimeout);
        this.isReading = false;
        this.failedReads++;

        console.error("[MC-PLC] 읽기 중 예외 발생:", e);
        this.logDebugInfo('READ_EXCEPTION', {
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined
        });

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
