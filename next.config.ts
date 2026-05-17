import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serverless deployment for Vercel (remove "standalone" for Vercel)
  // For local development with standalone: uncomment the line below
  // output: "standalone",

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/index.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
