import { PLCConnector, PLCData } from "./plc-connector";

export class MockPLC implements PLCConnector {
  private memory: Map<string, number> = new Map();
  private isConnected: boolean = false;

  constructor() {
    // Initialize with some default values
    this.initializeMemory();
  }

  private initializeMemory() {
    // Temperature (D400-D470)
    for (let i = 0; i <= 70; i += 10) {
      this.memory.set(`D${400 + i}`, 30 + Math.random() * 10); // Current Temp
      this.memory.set(`D${401 + i}`, 40); // Set Temp
    }

    // Power (D4000-D4038)
    this.memory.set("D4000", 220); // Voltage
    this.memory.set("D4002", 10); // Current
    this.memory.set("D4024", 2200); // Active Power
    this.memory.set("D4030", 60); // Frequency
    this.memory.set("D4032", 15000); // Forward Active Energy (Wh)
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
