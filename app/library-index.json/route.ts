import { readFile } from "node:fs/promises"
import path from "node:path"
import { gzipSync } from "node:zlib"

// The table finder's index (lib/library-index.json, nysgpt-1, built by scripts/library-index.mjs), served as it is for
// /search's search worker (components/search/search-worker.ts). The same file the chat's finder reads on the server:
// not a second index. Catalog facts only (names, descriptions, field names, samples), no keys. Gzipped once per server
// process (7.9 MB down to about a sixth) for browsers that accept it.

export const runtime = "nodejs"

const g = globalThis as typeof globalThis & { __libraryIndex?: Promise<{ raw: Buffer; gz: Buffer }> }

const load = () =>
  (g.__libraryIndex ??= readFile(path.join(process.cwd(), "lib", "library-index.json")).then((raw) => ({ raw, gz: gzipSync(raw, { level: 6 }) })))

export async function GET(req: Request) {
  const { raw, gz } = await load()
  const zip = /\bgzip\b/.test(req.headers.get("accept-encoding") ?? "")
  return new Response(new Uint8Array(zip ? gz : raw), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600", Vary: "Accept-Encoding", ...(zip ? { "Content-Encoding": "gzip" } : {}) },
  })
}
