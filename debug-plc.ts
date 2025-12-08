/**
 * @file debug-plc.ts
 * @description
 * PLC 통신 디버깅 스크립트
 *
 * 이 스크립트는 Mitsubishi MC Protocol을 사용하여 PLC와 직접 통신하고
 * 읽은 데이터를 콘솔에 상세히 출력합니다.
 *
 * 실행 방법:
 * npx ts-node debug-plc.ts [IP] [PORT] [주소1] [주소2] ...
 *
 * 예시:
 * npx ts-node debug-plc.ts 192.168.0.1 2000 D400,1 D430,1 D4000,1
 * npx ts-node debug-plc.ts 127.0.0.1 2000 D400 D430 D440
 *
 * 기본값:
 * - IP: 127.0.0.1 (로컬호스트)
 * - PORT: 2000
 * - 주소: D400,1 D430,1 (온도센서)
 *
 * @author PLC Monitoring System
 * @version 1.0.0
 */

// @ts-ignore
import MC from "mcprotocol";

/**
 * PLC 통신 디버거
 * MC Protocol을 사용하여 PLC와 통신합니다
 */
class PLCDebugger {
  /**
   * mcprotocol 라이브러리 인스턴스
   */
  private conn: any;

  /**
   * PLC IP 주소
   */
  private ip: string;

  /**
   * PLC 포트 번호
   */
  private port: number;

  /**
   * 연결 상태
   */
  private isConnected: boolean = false;

  /**
   * 읽을 주소 배열
   */
  private addresses: string[];

  /**
   * 생성자
   * @param ip PLC IP 주소
   * @param port PLC 포트 번호
   * @param addresses 읽을 PLC 주소 배열
   */
  constructor(ip: string, port: number, addresses: string[]) {
    this.ip = ip;
    this.port = port;
    this.addresses = addresses;
    this.conn = new MC();

    console.log("\n");
    console.log("═".repeat(70));
    console.log("🔧 PLC 통신 디버거 (MC Protocol)");
    console.log("═".repeat(70));
    console.log(`📡 IP: ${this.ip}:${this.port}`);
    console.log(`📍 읽을 주소 (${this.addresses.length}개):`);
    this.addresses.forEach((addr, i) => {
      console.log(`   ${i + 1}. ${addr}`);
    });
    console.log("═".repeat(70));
  }

  /**
   * PLC와 TCP 연결을 시작합니다
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("\n⏳ PLC 연결 시도 중...");
      console.log(`   ${this.ip}:${this.port}`);

      this.conn.initiateConnection(
        {
          port: this.port,
          host: this.ip,
          ascii: false, // 이진 모드 (Binary Mode)
        },
        (err: any) => {
          if (err) {
            console.error("\n❌ 연결 실패!");
            console.error(`   에러: ${err.message}`);
            console.error(`   코드: ${err.code}`);
            this.isConnected = false;
            reject(err);
          } else {
            console.log("✅ PLC 연결 성공!");
            this.isConnected = true;
            resolve();
          }
        }
      );
    });
  }

  /**
   * PLC에서 데이터를 읽습니다
   * mcprotocol의 addItems() + readAllItems() 사용
   */
  async readData(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("PLC가 연결되지 않았습니다");
    }

    return new Promise((resolve) => {
      console.log("\n⏳ 데이터 읽기 명령 전송 중...");
      console.log(`   주소: ${this.addresses.join(", ")}`);

      try {
        // mcprotocol에 읽을 항목들 추가
        // 형식: 'D430,1' = D430부터 1개 값
        //      'D430' = D430 주소 (자동으로 1로 처리)
        this.conn.addItems(this.addresses);

        // 모든 항목을 읽습니다
        this.conn.readAllItems((err: any, values: any) => {
          if (err) {
            console.error("\n❌ 데이터 읽기 실패!");
            console.error(`   에러: ${err.message}`);
            console.error(`   상세정보:`, err);
            resolve();
          } else {
            console.log("\n✅ PLC 응답 수신!");
            this.displayResults(values);
            resolve();
          }
        });
      } catch (e: any) {
        console.error("\n❌ 명령 전송 실패!");
        console.error(`   에러: ${e.message}`);
        resolve();
      }
    });
  }

  /**
   * 읽은 데이터를 포맷하여 표시합니다
   * @param values mcprotocol에서 반환한 값 객체
   */
  private displayResults(values: any): void {
    console.log("\n" + "─".repeat(70));
    console.log("📊 읽은 데이터 결과");
    console.log("─".repeat(70));

    // 응답 데이터 구조 분석
    console.log("\n📋 응답 데이터 구조:");
    console.log(JSON.stringify(values, null, 2));

    console.log("\n📊 각 주소별 값:");
    console.log("┌─────────────┬──────────┬──────────────────┐");
    console.log("│ 주소        │ 값       │ 타입             │");
    console.log("├─────────────┼──────────┼──────────────────┤");

    this.addresses.forEach((address) => {
      const value = values[address];
      let displayValue = "N/A";
      let displayType = "undefined";

      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          displayValue = value.join(", ");
          displayType = `Array[${value.length}]`;
        } else if (typeof value === "number") {
          displayValue = value.toString();
          displayType = "Number";
        } else if (typeof value === "string") {
          displayValue = value;
          displayType = "String";
        } else {
          displayValue = JSON.stringify(value);
          displayType = typeof value;
        }
      }

      const paddedAddress = address.padEnd(11);
      const paddedValue = displayValue.padEnd(8);
      const paddedType = displayType.padEnd(16);

      console.log(
        `│ ${paddedAddress} │ ${paddedValue} │ ${paddedType} │`
      );
    });

    console.log("└─────────────┴──────────┴──────────────────┘");

    // 추가 정보
    console.log("\n💾 추가 정보:");
    console.log(`   응답 객체 키: ${Object.keys(values).join(", ")}`);
    console.log(`   총 데이터 항목: ${Object.keys(values).length}개`);
  }

  /**
   * PLC 연결을 종료합니다
   */
  disconnect(): void {
    if (this.isConnected) {
      this.conn.dropConnection();
      this.isConnected = false;
      console.log("\n👋 PLC 연결 종료");
    }
  }

  /**
   * 전체 프로세스 실행
   */
  async run(): Promise<void> {
    try {
      await this.connect();
      await this.readData();
    } catch (error) {
      console.error("\n💥 에러 발생:", error);
    } finally {
      this.disconnect();
      console.log("\n" + "═".repeat(70));
      console.log("✨ 디버깅 완료\n");
    }
  }
}

/**
 * 메인 함수
 * 커맨드라인 인자 처리
 */
async function main() {
  // 커맨드라인 인자 파싱
  const args = process.argv.slice(2);

  // 기본값 설정
  let ip = "127.0.0.1";
  let port = 2000;
  let addresses = ["D400,1", "D430,1"]; // 기본 온도센서

  // 인자가 있으면 파싱
  if (args.length > 0) {
    ip = args[0] || ip;
  }
  if (args.length > 1) {
    port = parseInt(args[1]) || port;
  }
  if (args.length > 2) {
    addresses = args.slice(2);
  }

  // 디버거 생성 및 실행
  const debugger_ = new PLCDebugger(ip, port, addresses);
  await debugger_.run();
}

// 스크립트 실행
main().catch(console.error);
