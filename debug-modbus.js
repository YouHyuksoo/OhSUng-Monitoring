/**
 * @file debug-modbus.js
 * @description
 * Modbus TCP PLC 통신 디버깅 스크립트
 *
 * 이 스크립트는 Modbus TCP 프로토콜을 사용하여 PLC와 직접 통신하고
 * 읽은 데이터를 콘솔에 상세히 출력합니다.
 *
 * 실행 방법:
 * node debug-modbus.js [IP] [PORT] [SLAVE_ID] [주소1] [주소2] ...
 *
 * 예시:
 * node debug-modbus.js 192.168.111.186 502 1 D400 D430 D4000
 * node debug-modbus.js 127.0.0.1 502 1 D400
 *
 * 기본값:
 * - IP: 127.0.0.1
 * - PORT: 502
 * - SLAVE_ID: 1
 * - 주소: D400 D430 (온도센서)
 *
 * @author PLC Monitoring System
 * @version 1.0.0
 */

const ModbusRTU = require("modbus-serial");

/**
 * Modbus TCP PLC 통신 디버거
 */
class ModbusDebugger {
  /**
   * 생성자
   * @param {string} ip PLC IP 주소
   * @param {number} port Modbus TCP 포트
   * @param {number} slaveId Modbus Slave ID
   * @param {string[]} addresses 읽을 주소 배열 (D400, D430 등)
   */
  constructor(ip, port, slaveId, addresses) {
    this.ip = ip;
    this.port = port;
    this.slaveId = slaveId;
    this.addresses = addresses;
    this.client = new ModbusRTU();
    this.isConnected = false;

    console.log("\n");
    console.log("═".repeat(70));
    console.log("🔧 Modbus TCP PLC 디버거");
    console.log("═".repeat(70));
    console.log(`📡 IP: ${this.ip}:${this.port}`);
    console.log(`🆔 Slave ID: ${this.slaveId}`);
    console.log(`📍 읽을 주소 (${this.addresses.length}개):`);
    this.addresses.forEach((addr, i) => {
      console.log(`   ${i + 1}. ${addr}`);
    });
    console.log("═".repeat(70));
  }

  /**
   * WORD 번호를 레지스터로 변환
   * @param {string|number} address WORD 번호
   * @returns {number} 레지스터 번호
   */
  addressToRegister(address) {
    return parseInt(address, 10);
  }

  /**
   * PLC와 Modbus TCP 연결
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log("\n⏳ Modbus TCP 연결 시도 중...");
      console.log(`   ${this.ip}:${this.port}`);

      this.client.connectTCP(this.ip, { port: this.port }, (err) => {
        if (err) {
          console.error("\n❌ 연결 실패!");
          console.error(`   에러: ${err.message || err}`);
          console.error(`   코드: ${err.code}`);
          this.isConnected = false;
          reject(err);
        } else {
          console.log("✅ Modbus TCP 연결 성공!");
          this.client.setID(this.slaveId);
          this.isConnected = true;

          // 에러 이벤트 리스너
          this.client.on("error", (err) => {
            console.error("❌ Modbus 연결 에러:", err.message || err);
          });

          resolve();
        }
      });
    });
  }

  /**
   * PLC에서 데이터 읽기
   */
  async readData() {
    if (!this.isConnected) {
      throw new Error("PLC가 연결되지 않았습니다");
    }

    console.log("\n⏳ 데이터 읽기 시도 중...");
    console.log(`   주소: ${this.addresses.join(", ")}`);
    console.log("\n📊 읽기 명령:");

    const results = {};

    for (const address of this.addresses) {
      try {
        const register = this.addressToRegister(address);
        console.log(`   📍 ${address} (레지스터 ${register}) 읽는 중...`);

        // Modbus FC04 (Read Input Registers)
        // readInputRegisters(address, length)
        const data = await new Promise((resolve, reject) => {
          this.client.readInputRegisters(register, 1, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });

        console.log(`      ✅ 값: ${data.data[0]}`);
        results[address] = data.data[0];
      } catch (err) {
        console.error(
          `      ❌ 실패: ${err.message || err}`
        );
        results[address] = null;
      }
    }

    return results;
  }

  /**
   * 결과 표시
   */
  displayResults(results) {
    console.log("\n" + "─".repeat(70));
    console.log("✅ 읽기 완료!");
    console.log("─".repeat(70));

    console.log("\n📊 결과 데이터:");
    console.log(JSON.stringify(results, null, 2));

    console.log("\n📊 주소별 값:");
    console.log("┌─────────────┬──────────────┐");
    console.log("│ 주소        │ 값           │");
    console.log("├─────────────┼──────────────┤");

    for (const [address, value] of Object.entries(results)) {
      const paddedAddress = String(address).padEnd(11);
      const paddedValue = String(value !== null ? value : "N/A").padEnd(12);
      console.log(`│ ${paddedAddress} │ ${paddedValue} │`);
    }

    console.log("└─────────────┴──────────────┘");

    console.log("\n💾 추가 정보:");
    const successCount = Object.values(results).filter((v) => v !== null).length;
    console.log(`   읽기 성공: ${successCount}/${Object.keys(results).length}`);
  }

  /**
   * 연결 종료
   */
  disconnect() {
    if (this.isConnected) {
      try {
        this.client.close();
      } catch (e) {
        // 이미 끊어진 연결 무시
      }
      this.isConnected = false;
      console.log("\n👋 Modbus 연결 종료");
    }

    // 에러 리스너 제거 (ECONNRESET 방지)
    if (this.client) {
      this.client.removeAllListeners("error");
    }
  }

  /**
   * 전체 실행
   */
  async run() {
    try {
      await this.connect();
      const results = await this.readData();
      this.displayResults(results);
    } catch (error) {
      console.error("\n💥 에러 발생:", error.message || error);
    } finally {
      this.disconnect();
      console.log("\n" + "═".repeat(70));
      console.log("✨ 디버깅 완료\n");
    }
  }
}

/**
 * 메인 함수
 */
async function main() {
  const args = process.argv.slice(2);

  // 기본값
  let ip = "127.0.0.1";
  let port = 502;
  let slaveId = 1;
  let addresses = ["D400", "D430"];

  // 인자 파싱
  if (args.length > 0) {
    ip = args[0] || ip;
  }
  if (args.length > 1) {
    port = parseInt(args[1]) || port;
  }
  if (args.length > 2) {
    slaveId = parseInt(args[2]) || slaveId;
  }
  if (args.length > 3) {
    addresses = args.slice(3);
  }

  const debugger_ = new ModbusDebugger(ip, port, slaveId, addresses);
  await debugger_.run();

  // 정상 종료
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
