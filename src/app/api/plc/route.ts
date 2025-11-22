import { NextResponse } from "next/server";
import { plc as mockPlc } from "@/lib/mock-plc";
import { McPLC } from "@/lib/mc-plc";
import { PLCConnector } from "@/lib/plc-connector";

// Connection cache to avoid reconnecting every time
// Key: "ip:port", Value: McPLC instance
const connections = new Map<string, McPLC>();

function getPlc(ip?: string | null, port?: string | null): PLCConnector {
  if (!ip || !port) {
    return mockPlc;
  }

  const key = `${ip}:${port}`;
  if (!connections.has(key)) {
    const newPlc = new McPLC(ip, parseInt(port));
    connections.set(key, newPlc);
  }
  
  return connections.get(key)!;
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
    const data = await plc.read(addresses);
    return NextResponse.json(data);
  } catch (error) {
    console.error("PLC Read Error:", error);
    return NextResponse.json({ error: "Failed to read PLC" }, { status: 500 });
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
    await plc.write(address, value);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PLC Write Error:", error);
    return NextResponse.json({ error: "Failed to write PLC" }, { status: 500 });
  }
}
