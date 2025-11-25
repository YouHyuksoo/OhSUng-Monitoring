/**
 * @file ecosystem.config.js
 * @description
 * PM2 Ecosystem 설정 파일
 * 이 파일은 PM2로 관리할 애플리케이션의 설정을 정의합니다.
 *
 * 초보자 가이드:
 * 1. **name**: PM2에서 표시될 애플리케이션 이름
 * 2. **script**: 실행할 스크립트 경로
 * 3. **args**: script에 전달할 인자
 * 4. **cwd**: 작업 디렉토리 (현재 폴더)
 * 5. **instances**: 실행할 인스턴스 개수 (1 = 단일, max = CPU 코어 수만큼)
 * 6. **autorestart**: 프로세스 종료 시 자동 재시작 여부
 * 7. **watch**: 파일 변경 감지 시 자동 재시작 (개발용, 프로덕션에서는 false)
 * 8. **max_memory_restart**: 메모리 사용량이 이 값을 초과하면 재시작
 * 9. **env**: 환경 변수 설정
 *
 * @example
 * // 실행: pm2 start ecosystem.config.js
 * // 중지: pm2 stop ecosystem.config.js
 * // 재시작: pm2 restart ecosystem.config.js
 * // 삭제: pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      // 애플리케이션 이름
      name: "plc-monitor",

      // Next.js 실행 스크립트
      script: "node_modules/next/dist/bin/next",
      args: "start",

      // 현재 디렉토리에서 실행
      cwd: "./",

      // 단일 인스턴스로 실행
      instances: 1,

      // 실행 모드 (fork 또는 cluster)
      exec_mode: "fork",

      // 프로세스 종료 시 자동 재시작
      autorestart: true,

      // 파일 변경 감지 비활성화 (프로덕션 환경)
      watch: false,

      // 메모리 1GB 초과 시 재시작
      max_memory_restart: "1G",

      // 환경 변수 (프로덕션)
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },

      // 개발 환경 변수 (사용 시: pm2 start ecosystem.config.js --env development)
      env_development: {
        NODE_ENV: "development",
        PORT: 3002,
      },

      // 최대 재시작 횟수 제한 (무한 재시작 방지)
      max_restarts: 10,
      min_uptime: "10s",

      // 프로세스가 응답하지 않을 때 kill 신호 전송까지 대기 시간 (ms)
      kill_timeout: 5000,

      // 재시작 시 딜레이 (ms)
      restart_delay: 4000,
    },
  ],
};
