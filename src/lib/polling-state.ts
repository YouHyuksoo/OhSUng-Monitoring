/**
 * @file src/lib/polling-state.ts
 * @description
 * 서버 전역 폴링 상태 관리 (메모리 기반 싱글톤)
 * - 실시간 데이터 폴링 상태
 * - 시간별 에너지 폴링 상태
 * - 모든 API 라우트에서 공유되는 전역 상태
 *
 * 초보자 가이드:
 * 1. **상태 저장소**: 메모리 (process.env.NODE_ENV 기반 globalThis 저장)
 * 2. **상태 포맷**: { realtimePolling: boolean, hourlyPolling: boolean }
 * 3. **사용법**: getPollingState() / setPollingState()
 *
 * @deprecated 파일 I/O 대신 메모리 싱글톤 사용
 */

/**
 * 폴링 상태 인터페이스
 */
export interface PollingState {
  realtimePolling: boolean;
  hourlyPolling: boolean;
  lastUpdated: number;
}

/**
 * 전역 상태 저장소
 * - Node.js 프로세스 레벨에서 공유되는 메모리
 * - 모든 API 라우트 요청이 같은 인스턴스 접근
 */
let pollingState: PollingState = {
  realtimePolling: false,
  hourlyPolling: false,
  lastUpdated: Date.now(),
};

/**
 * 현재 폴링 상태 조회
 * - 동기식 (파일 I/O 없음)
 * - 모든 프로세스에서 같은 메모리 공간 접근
 */
export function getPollingState(): PollingState {
  return { ...pollingState };
}

/**
 * 폴링 상태 저장
 * - 동기식 메모리 업데이트
 * - 즉시 모든 다른 요청에서 볼 수 있음
 */
export function setPollingState(state: Partial<PollingState>): void {
  pollingState = {
    ...pollingState,
    ...state,
    lastUpdated: Date.now(),
  };
  console.log(
    `[PollingState] Updated: realtime=${pollingState.realtimePolling}, hourly=${pollingState.hourlyPolling}`
  );
}

/**
 * 실시간 폴링 상태 설정
 */
export function setRealtimePolling(isPolling: boolean): void {
  setPollingState({ realtimePolling: isPolling });
}

/**
 * 시간별 에너지 폴링 상태 설정
 */
export function setHourlyPolling(isPolling: boolean): void {
  setPollingState({ hourlyPolling: isPolling });
}

/**
 * 모든 폴링 중지
 */
export function stopAllPolling(): void {
  setPollingState({
    realtimePolling: false,
    hourlyPolling: false,
  });
}
