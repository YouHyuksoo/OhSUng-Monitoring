export interface PLCData {
  [address: string]: number | null;
}

export interface PLCConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  read(addresses: string[]): Promise<PLCData>;
  write(address: string, value: number): Promise<void>;
}
