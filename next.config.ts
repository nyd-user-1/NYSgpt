import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  // The dev server's floating N button stays off (Brendan, 2026-11-19: he hides it every time it comes back).
  devIndicators: false,
  transpilePackages: ["geist"],
  // The Data Library pages are static files written by scripts/data-pages.mjs.
  async rewrites() {
    return [
      { source: "/data", destination: "/data/index.html" },
      { source: "/data/:slug([a-z0-9-]+)", destination: "/data/:slug.html" },
    ];
  },
};

export default withMDX(nextConfig);
