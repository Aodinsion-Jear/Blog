import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["198.18.0.1"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
