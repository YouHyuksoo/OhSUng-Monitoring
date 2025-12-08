import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";

// 동적 라우트 (빌드 시 프리-렌더링하지 않음)
export const dynamic = "force-dynamic";

const execAsync = util.promisify(exec);

export async function POST() {
  try {
    // 1. Git Pull
    console.log("Starting git pull...");
    const { stdout: gitOutput } = await execAsync("git pull");
    console.log("Git pull output:", gitOutput);

    if (gitOutput.includes("Already up to date")) {
      return NextResponse.json({
        success: true,
        message: "이미 최신 버전입니다.",
        details: gitOutput,
      });
    }

    // 2. NPM Install (변경사항이 있을 수 있으므로)
    console.log("Starting npm install...");
    await execAsync("npm install");

    // 3. Build
    console.log("Starting build...");
    await execAsync("npm run build");

    // 4. PM2 Restart
    // 응답을 먼저 보내고 재시작을 수행해야 함 (서버가 죽기 때문)
    setTimeout(() => {
      console.log("Restarting PM2...");
      exec("pm2 restart ohsung-monitoring", (error) => {
        if (error) {
          console.error("PM2 restart failed:", error);
        }
      });
    }, 1000);

    return NextResponse.json({
      success: true,
      message: "업그레이드가 완료되었습니다. 서버가 재시작됩니다.",
      details: gitOutput,
    });
  } catch (error: any) {
    console.error("Upgrade failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "업그레이드 중 오류가 발생했습니다.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
