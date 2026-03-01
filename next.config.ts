import type { NextConfig } from "next";

const nextConfig: any = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  experimental: {
    // 빌드 성능 및 안정성 최적화
    cpus: 1,
    workerThreads: false,
  }
};

export default nextConfig;
