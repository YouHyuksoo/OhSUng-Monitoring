/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // 개발 모드에서 DB 파일 변경 시 재시작 방지
      config.watchOptions = {
        ignored: ["**/data/**", "**/*.db", "**/*.sqlite", "**/node_modules/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
