import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow accessing dev server via public IP (required for client-side JS/hydration)
  allowedDevOrigins: ["43.128.106.155", "https://43.128.106.155"],
  // pdf-parse uses Node.js fs/path — must run server-side only
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
