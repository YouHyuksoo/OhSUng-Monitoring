import { PLCConnector, PLCData } from "./plc-connector";
import MC from "mcprotocol";

export class McPLC implements PLCConnector {
  private conn: any;
  private isConnected: boolean = false;
  private ip: string;
  private port: number;

  constructor(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
    this.conn = new MC();
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    return new Promise((resolve, reject) => {
      this.conn.initiateConnection(
        { port: this.port, host: this.ip, ascii: false },
        (err: any) => {
          if (err) {
            console.error("MC Protocol Connection Error:", err);
            this.isConnected = false;
            reject(err);
          } else {
            console.log(`Connected to PLC at ${this.ip}:${this.port}`);
            this.isConnected = true;

            // 연결 끊김 감지를 위한 이벤트 리스너 등록
            // mcprotocol 라이브러리의 내부 소켓에 접근할 수 있다면 좋겠지만,
            // 라이브러리가 이벤트를 전파하는지 확인 필요.
            // 보통 'error', 'close', 'timeout' 이벤트를 emit 함.
            this.conn.on("error", (err: any) => {
              console.error("PLC Connection Error Event:", err);
              this.connectionReset();
            });

            this.conn.on("close", (hadError: boolean) => {
              console.warn(
                "PLC Connection Closed",
                hadError ? "with error" : ""
              );
              this.connectionReset();
            });

            resolve();
          }
        }
      );
    });
  }

  private connectionReset() {
    this.isConnected = false;
    // 필요한 경우 재연결 로직을 여기에 추가할 수 있음
    // 하지만 현재 구조에서는 요청 시 재연결하므로 상태만 갱신함
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    this.conn.dropConnection();
    this.isConnected = false;
    console.log("Disconnected from PLC");
  }

  async read(addresses: string[]): Promise<PLCData> {
    if (!this.isConnected) {
      try {
        await this.connect();
      } catch (e) {
        console.error("Failed to connect for read:", e);
        // Return empty or zeros if connection fails, to prevent crashing
        const fallback: PLCData = {};
        addresses.forEach((addr) => (fallback[addr] = 0));
        return fallback;
      }
    }

    // Group addresses to optimize reading?
    // For simplicity, we'll just read them one by one or in small batches if the library supports it.
    // mcprotocol readPR (Read Random) might be useful if addresses are scattered.
    // But `readPR` takes a list of addresses.

    // Convert addresses like "D400" to "D,400" format expected by some libs,
    // OR just pass "D400" if the lib handles it.
    // mcprotocol usually expects "D,0", "D,1" etc. for `read`.
    // But `read` usually reads a block. `readRandom` is better for arbitrary list.

    // Let's try to use `read` for single items loop for robustness first, or `readPR` if available.
    // Looking at mcprotocol docs (assumed), `readPR` is for random read.

    // However, the library `mcprotocol` on npm typically has `read(addr, length, callback)`.
    // We need to map our "D400" strings to what the library expects.

    const result: PLCData = {};

    // Naive implementation: Read each address individually.
    // Optimization: Group contiguous addresses later.

    await Promise.all(
      addresses.map(async (addr) => {
        try {
          // Parse address: D400 -> type: D, offset: 400
          const type = addr.substring(0, 1);
          const offset = parseInt(addr.substring(1));

          // Using a promise wrapper for the callback-based library
          const value = await new Promise<number>((resolve, reject) => {
            // Note: This library might expect "D,400" or just "D400".
            // Common usage: conn.read("D400", (err, values) => ...)
            // If it reads multiple, it returns array. We read 1.
            this.conn.read(`${type}${offset},1`, (err: any, values: any) => {
              if (err) reject(err);
              else resolve(values[0]); // values is array
            });
          });

          result[addr] = value;
        } catch (e) {
          console.error(`Failed to read ${addr}:`, e);
          result[addr] = 0; // Fallback
        }
      })
    );

    return result;
  }

  async write(address: string, value: number): Promise<void> {
    if (!this.isConnected) await this.connect();

    return new Promise((resolve, reject) => {
      // Parse address
      const type = address.substring(0, 1);
      const offset = parseInt(address.substring(1));

      this.conn.write(`${type}${offset},1`, [value], (err: any) => {
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
}
