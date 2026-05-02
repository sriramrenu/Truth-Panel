import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiPort = process.env.API_PORT;
    const internalHost = process.env.INTERNAL_HOST;
    return [
      {
        source: '/api/:path*',
        destination: `http://${internalHost}:${apiPort}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
