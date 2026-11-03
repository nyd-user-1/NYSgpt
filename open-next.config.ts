import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The repo's build script runs fumadocs-mdx before next build; the adapter's
// build must run the same, or the blog's MDX collections are missing.
export default { ...defineCloudflareConfig(), buildCommand: "pnpm run build" };
