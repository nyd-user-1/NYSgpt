import { readFile } from "node:fs/promises"
import path from "node:path"

// The table finder's index (lib/library-index.json, nysgpt-1, built by scripts/library-index.mjs), served as it is for
// /search's search worker (components/search/search-worker.ts). The same file the chat's finder reads on the server:
// not a second index. Catalog facts only (names, descriptions, field names, samples), no keys.

export const runtime = "nodejs"

export async function GET() {
  const body = await readFile(path.join(process.cwd(), "lib", "library-index.json"))
  return new Response(new Uint8Array(body), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } })
}
