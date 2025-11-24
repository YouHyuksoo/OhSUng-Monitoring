import { NextResponse } from "next/server";
import { plc as mockPlc } from "@/lib/mock-plc";
import { McPLC } from "@/lib/mc-plc";
import { PLCConnector } from "@/lib/plc-connector";
import { pollingService } from "@/lib/plc-polling-service";

/**
 * PLC 연결 풀 관리 클래스
 * - 동일한 IP:Port에 대한 연결 재사용
 * - 타임아웃 기반 연결 정리
 * - 동시 요청 제어 (Mutex 패턴)
 */
interface CachedConnection {
  plc: McPLC;
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

function getPlc(
  ip?: string | null,
  port?: string | null,
  demo?: boolean
): PLCConnector {
  if (demo) {
    return mockPlc;
  }

  if (!ip || !port) {
    throw new Error("PLC IP와 Port가 필수입니다");
  }

  const key = `${ip}:${port}`;
  let cached = connections.get(key);

  if (!cached) {
    const newPlc = new McPLC(ip, parseInt(port));
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
  const check = searchParams.get("check") === "true";
  const demo = searchParams.get("demo") === "true";
  const pollingInterval = searchParams.get("pollingInterval");
  const chartConfigsJson = searchParams.get("chartConfigs");

  // 연결 확인 모드
  if (check) {
    if (!demo && (!ip || !port)) {
      return NextResponse.json(
        { error: "IP and Port required for check" },
        { status: 400 }
      );
    }
    try {
      const plc = getPlc(ip, port, demo);
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

    // 백그라운드 폴링 등록 (처음 요청 시에만)
    // 모든 클라이언트가 같은 주소 폴링
    if (ip && !demo) {
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

    // Demo 모드는 직접 폴링 (캐시 없음)
    if (demo) {
      const plc = getPlc(ip, port, demo);
      const data = await withTimeout(plc.read(pollingAddresses), REQUEST_TIMEOUT);
      return NextResponse.json(data);
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
  const { address, value, ip, port } = body;

  if (!address || value === undefined) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const plc = getPlc(ip, port, false);
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
