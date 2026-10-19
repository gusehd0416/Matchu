import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 판정 API가 서버에서 읽는 사전·온도 데이터를 배포에 포함한다.
  outputFileTracingIncludes: {
    '/api/**': ['./data/**'],
  },
};

export default nextConfig;
