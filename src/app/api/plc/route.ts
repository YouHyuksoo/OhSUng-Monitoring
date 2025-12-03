import { NextResponse } from "next/server";
import { plc as mockPlc } from "@/lib/mock-plc";
import { McPLC } from "@/lib/mc-plc";
import { XgtModbusPLC } from "@/lib/xgt-modbus-plc";
import { PLCConnector } from "@/lib/plc-connector";
import { pollingService } from "@/lib/plc-polling-service";

/**
 * PLC 연결 풀 관리 클래스
 * - 동일한 IP:Port에 대한 연결 재사용
 * - 타임아웃 기반 연결 정리
 * - 동시 요청 제어 (Mutex 패턴)
 * - Mitsubishi MC와 LS Modbus TCP 모두 지원
 */
interface CachedConnection {
  plc: PLCConnector;
  lastUsed: number;
  isReading: boolean;
}

const connections = new Map<string, CachedConnection>();
const CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5분
const REQUEST_TIMEOUT = 10 * 1000; // 10초

// 주기적으로 오래된 연결 정리
setInterval(() => {
  const now = Date.now();
  for (const [key, conn] of connections.entries()) {
    if (now - conn.lastUsed > CONNECTION_TIMEOUT && !conn.isReading) {
      try {
        conn.plc.disconnect();
        connections.delete(key);
        console.log(`Cleaned up stale connection: ${key}`);
      } catch (e) {
        console.error(`Failed to clean connection ${key}:`, e);
      }
    }
  }
}, 60 * 1000); // 1분마다 정리

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout")), ms)
  );
  return Promise.race([promise, timeoutPromise]);
}

/**
 * PLC 인스턴스를 가져옵니다.
 * - plcType에 따라 적절한 PLC 드라이버 생성
 * - "demo": MockPLC 반환
 * - "modbus": LS ELECTRIC XGT Modbus TCP
 * - "mc" (기본값): Mitsubishi MC Protocol
 * - 동일한 IP:Port는 연결 캐시 재사용
 *
 * @param ip - PLC IP 주소
 * @param port - PLC 포트
 * @param plcType - "mc" (Mitsubishi) | "modbus" (LS Modbus TCP) | "demo" (Mock)
 * @param addressMapping - Modbus 주소 매핑 설정 (plcType=modbus일 때만 사용)
 */
function getPlc(
  ip?: string | null,
  port?: string | null,
  plcType?: string,
  addressMapping?: any
): PLCConnector {
  // Demo 모드는 항상 MockPLC 반환 (IP/Port 불필요)
  if (plcType === "demo") {
    return mockPlc;
  }

  if (!ip || !port) {
    throw new Error("PLC IP와 Port가 필수입니다");
  }

  const key = `${ip}:${port}`;
  let cached = connections.get(key);

  if (!cached) {
    let newPlc: PLCConnector;

    // plcType에 따라 적절한 PLC 드라이버 생성
    if (plcType === "modbus") {
      // Modbus 주소 매핑 설정 (기본값: 그대로 사용)
      const mapping = addressMapping || {
        dAddressBase: 0,
        modbusOffset: 0,
      };
      newPlc = new XgtModbusPLC(ip, parseInt(port), 1, mapping);
    } else {
      // 기본값: Mitsubishi MC Protocol
      newPlc = new McPLC(ip, parseInt(port));
    }

    cached = {
      plc: newPlc,
      lastUsed: Date.now(),
      isReading: false,
    };
    connections.set(key, cached);
  } else {
    // Update last used time
    cached.lastUsed = Date.now();
  }

  return cached.plc;
}

/**
 * PLC 주소를 mcprotocol 형식으로 변환합니다.
 * D430 -> D430,1 형식으로 변환하여 1개 값 읽기를 지정합니다.
 *
 * @param address - PLC 주소 (D430, D4000 등)
 * @returns mcprotocol 형식 주소 (D430,1, D4000,1 등)
 */
function normalizeMCAddress(address: string): string {
  // 이미 ,를 포함하면 그대로 반환
  if (address.includes(",")) {
    return address;
  }
  // D430 형식 -> D430,1로 변환 (1개 값 읽기)
  return `${address},1`;
}

/**
 * 설정값에서 모든 PLC 주소 추출
 * - address: 현재값 또는 측정값 주소
 * - setAddress: 온도 설정값 주소
 * - accumulationAddress: 누적 측정값 주소 (에너지 차트용)
 */
function extractAllAddressesFromSettings(chartConfigs: any[]): string[] {
  const addresses = new Set<string>();

  if (Array.isArray(chartConfigs)) {
    chartConfigs.forEach((config) => {
      if (config.address) addresses.add(config.address);
      if (config.setAddress) addresses.add(config.setAddress);
      if (config.accumulationAddress) addresses.add(config.accumulationAddress);
    });
  }

  return Array.from(addresses);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const addresses = searchParams.get("addresses")?.split(",") || [];
  const ip = searchParams.get("ip");
  const port = searchParams.get("port");
  const plcType = searchParams.get("plcType") || "mc";
  const addressMappingJson = searchParams.get("addressMapping");
  const check = searchParams.get("check") === "true";
  const pollingInterval = searchParams.get("pollingInterval");
  const chartConfigsJson = searchParams.get("chartConfigs");

  // Modbus 주소 매핑 파싱
  let addressMapping: any = undefined;
  if (plcType === "modbus" && addressMappingJson) {
    try {
      addressMapping = JSON.parse(decodeURIComponent(addressMappingJson));
    } catch (e) {
      console.warn("Failed to parse addressMapping:", e);
    }
  }

  // 연결 확인 모드
  if (check) {
    // Demo 모드는 IP/Port 불필요, 나머지는 필수
    if (plcType !== "demo" && (!ip || !port)) {
      return NextResponse.json(
        { error: "IP and Port required for check" },
        { status: 400 }
      );
    }
    try {
      const plc = getPlc(ip, port, plcType, addressMapping);
      // 연결 시도 (이미 연결되어 있으면 즉시 리턴됨)
      await withTimeout(plc.connect(), 5000);
      return NextResponse.json({ connected: true });
    } catch (error) {
      console.error("PLC Connection Check Failed:", error);
      return NextResponse.json(
        { connected: false, error: "Connection Failed" },
        { status: 500 }
      );
    }
  }

  try {
    const portNum = port ? parseInt(port) : 502;
    const interval = pollingInterval ? parseInt(pollingInterval) : 2000;

    // 설정값의 모든 주소 추출 (chartConfigs 전달된 경우)
    let pollingAddresses = addresses;
    if (chartConfigsJson) {
      try {
        const chartConfigs = JSON.parse(decodeURIComponent(chartConfigsJson));
        pollingAddresses = extractAllAddressesFromSettings(chartConfigs);
      } catch (e) {
        console.warn("Failed to parse chartConfigs:", e);
      }
    }

    if (pollingAddresses.length === 0) {
      return NextResponse.json(
        { error: "No addresses provided" },
        { status: 400 }
      );
    }

    // MC Protocol의 경우 주소를 mcprotocol 형식으로 정규화 (D430 -> D430,1)
    if (plcType === "mc" || !plcType) {
      pollingAddresses = pollingAddresses.map(normalizeMCAddress);
    }

    // Demo 모드도 백그라운드 폴링 등록 (DB에 저장)
    if (plcType === "demo") {
      pollingService.registerPolling({
        ip: "demo",
        port: portNum,
        addresses: pollingAddresses,
        interval,
        isDemoMode: true,
      });

      // 캐시된 데이터 반환
      const cached = pollingService.getCachedData("demo", portNum);
      if (cached) {
        return NextResponse.json({
          ...cached.data,
          _lastUpdate: cached.lastUpdate,
          _error: cached.error,
        });
      }

      // 데이터가 아직 없으면 대기
      return NextResponse.json(
        { error: "Demo polling in progress, please retry" },
        { status: 202 }
      );
    }

    // 실제 PLC 백그라운드 폴링 등록 (처음 요청 시에만)
    // 모든 클라이언트가 같은 주소 폴링
    if (ip) {
      pollingService.registerPolling({
        ip,
        port: portNum,
        addresses: pollingAddresses,
        interval,
        isDemoMode: false,
      });

      // 캐시된 데이터 반환
      const cached = pollingService.getCachedData(ip, portNum);
      if (cached) {
        return NextResponse.json({
          ...cached.data,
          _lastUpdate: cached.lastUpdate,
          _error: cached.error,
        });
      }
    }

    // 데이터가 아직 없으면 대기
    return NextResponse.json(
      { error: "Polling in progress, please retry" },
      { status: 202 }
    );
  } catch (error) {
    console.error("PLC Read Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to read PLC";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { address, value, ip, port, plcType, addressMapping } = body;

  if (!address || value === undefined) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const plc = getPlc(ip, port, plcType, addressMapping);
    const key = `${ip}:${port}`;
    const cached = connections.get(key);

    if (cached) {
      cached.isReading = true;
    }

    try {
      await withTimeout(plc.write(address, value), REQUEST_TIMEOUT);
      return NextResponse.json({ success: true });
    } finally {
      if (cached) {
        cached.isReading = false;
        cached.lastUsed = Date.now();
      }
    }
  } catch (error) {
    console.error("PLC Write Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to write PLC";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
