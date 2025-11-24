import { PLCConnector, PLCData } from "./plc-connector";

export class MockPLC implements PLCConnector {
  private memory: Map<string, number> = new Map();
  private isConnected: boolean = false;

  constructor() {
    // Initialize with some default values
    this.initializeMemory();
  }

  private initializeMemory() {
    // Temperature (D400-D470) - 각 센서마다 다른 초기값
    // 수절 건조로 (D400, D410, D420): 35-45도
    // 열풍 건조로 (D430-D470): 45-55도
    for (let i = 0; i <= 70; i += 10) {
      const address = 400 + i;
      // 수절 건조로 (D400, D410, D420)
      if (i <= 20) {
        this.memory.set(`D${address}`, 35 + Math.random() * 10); // 35-45도
        this.memory.set(`D${address + 1}`, 40); // 설정값 40도
      }
      // 열풍 건조로 (D430-D470)
      else {
        this.memory.set(`D${address}`, 45 + Math.random() * 10); // 45-55도
        this.memory.set(`D${address + 1}`, 50); // 설정값 50도
      }
    }

    // Power (D4000-D4038)
    this.memory.set("D4000", 220); // Voltage
    this.memory.set("D4002", 10); // Current
    this.memory.set("D4024", 2200); // Active Power
    this.memory.set("D4030", 60); // Frequency
    this.memory.set("D4032", 15000 + Math.random() * 1000); // Forward Active Energy (Wh) - 15000-16000
    this.memory.set("D6100", 5000); // Hourly Energy Accumulation (Wh) - 초기값
  }

  async connect(): Promise<void> {
    console.log("Mock PLC Connected");
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    console.log("Mock PLC Disconnected");
    this.isConnected = false;
  }

  async read(addresses: string[]): Promise<PLCData> {
    if (!this.isConnected) await this.connect();

    const result: PLCData = {};
    addresses.forEach((addr) => {
      // Simulate fluctuation for monitoring
      if (this.memory.has(addr)) {
        let val = this.memory.get(addr) || 0;
        // Add random noise to simulate sensor reading
        const addrNum = parseInt(addr.substring(1));
        // Temp current values (D400, D410, ... D470) - Ends with 0
        if (addrNum >= 400 && addrNum <= 470 && addrNum % 10 === 0) {
          val += Math.random() - 0.5;
          val = Math.round(val * 10) / 10;
        } else if (addr === "D4032") {
          // Power Energy
          val += (Math.random() - 0.5) * 10;
          val = Math.round(val);
        } else if (addr === "D6100") {
          // Hourly Energy Accumulation (Wh) - 계속 증가
          val += Math.round(Math.random() * 50); // 0~50Wh 증가
        }
        result[addr] = val;
        this.memory.set(addr, val);
      } else {
        result[addr] = 0;
      }
    });
    return result;
  }

  async write(address: string, value: number): Promise<void> {
    if (!this.isConnected) await this.connect();
    console.log(`Writing ${value} to ${address}`);
    this.memory.set(address, value);
  }
}

export const plc = new MockPLC();
