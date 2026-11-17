import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
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
