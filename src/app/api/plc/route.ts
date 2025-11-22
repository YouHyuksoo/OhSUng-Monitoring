import { NextResponse } from "next/server";
import { plc as mockPlc } from "@/lib/mock-plc";
import { McPLC } from "@/lib/mc-plc";
import { PLCConnector } from "@/lib/plc-connector";

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

function getPlc(ip?: string | null, port?: string | null): PLCConnector {
  if (!ip || !port) {
    return mockPlc;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const addresses = searchParams.get("addresses")?.split(",") || [];
  const ip = searchParams.get("ip");
  const port = searchParams.get("port");

  if (addresses.length === 0) {
    return NextResponse.json({ error: "No addresses provided" }, { status: 400 });
  }

  try {
    const plc = getPlc(ip, port);
    const key = `${ip}:${port}`;
    const cached = connections.get(key);

    if (cached) {
      cached.isReading = true;
    }

    try {
      const data = await withTimeout(plc.read(addresses), REQUEST_TIMEOUT);
      return NextResponse.json(data);
    } finally {
      if (cached) {
        cached.isReading = false;
        cached.lastUsed = Date.now();
      }
    }
  } catch (error) {
    console.error("PLC Read Error:", error);
    const message = error instanceof Error ? error.message : "Failed to read PLC";
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
    const plc = getPlc(ip, port);
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
    const message = error instanceof Error ? error.message : "Failed to write PLC";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
