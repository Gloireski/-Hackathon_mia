import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      }
    ]
  }
  /* config options here */
  // experimental: {
  //   webpackBuildWorker: true,
  // }
};

export default nextConfig;
