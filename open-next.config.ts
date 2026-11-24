import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Prerendered pages are served from the worker's own static assets (2026-11-04): nothing on the site revalidates
// (app/layout.tsx), so the read-only static-assets cache is enough — no R2 or KV — and a static page no longer
// renders on every request. Cache interception answers those pages before the Next server loads.
// The repo's build script runs fumadocs-mdx before next build; the adapter's
// build must run the same, or the blog's MDX collections are missing.
export default {
  ...defineCloudflareConfig({ incrementalCache: staticAssetsIncrementalCache, enableCacheInterception: true }),
  buildCommand: "pnpm run build",
};
