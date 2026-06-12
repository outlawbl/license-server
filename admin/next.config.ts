import type { NextConfig } from "next";

// NEXT_OUTPUT=export → statički export (out/) koji servira FastAPI license-server
const nextConfig: NextConfig =
  process.env.NEXT_OUTPUT === "export"
    ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
    : {};

export default nextConfig;
