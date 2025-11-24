export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      // 동적 import로 순환 참조 방지
      const { realtimeDataService } = await import(
        "./lib/realtime-data-service"
      );
      const { hourlyEnergyService } = await import(
        "./lib/hourly-energy-service"
      );

      // 서버 시작 시 모든 폴링 서비스 강제 중지
      realtimeDataService.stopPolling();
      hourlyEnergyService.stopPolling();

      console.log(
        "[Instrumentation] Server started - All polling services have been reset to STOPPED state."
      );
    } catch (error) {
      console.error(
        "[Instrumentation] Failed to stop polling services:",
        error
      );
    }
  }
}
