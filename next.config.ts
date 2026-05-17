import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove "standalone" for Vercel deployment (Vercel uses its own output)
  // Uncomment below for Docker/self-hosted deployment:
  // output: "standalone",

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
