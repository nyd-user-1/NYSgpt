#!/usr/bin/env node
// Hold the MCP server to its boundary. Static: no network, no AWS.
//
// api.nysgpt.com/mcp hands a reader's own model whatever its tools return, so
// "what can the MCP code reach" must equal "what the REST routes serve the same
// key". aws/api/mcp.mjs gets everything through `deps` from index.mjs; this
// check fails if that stops being true:
//
//   1. mcp.mjs imports nothing and names no AWS client, SQL runner or statement.
//   2. index.mjs hands it DEPS with no sql() and no client in it.
//   3. No table the catalog withholds is named in mcp.mjs, and none is served.
//
// Usage: node scripts/check-mcp-boundary.mjs   (exit 1 on a violation)

import { readFileSync } from "node:fs"

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8")
const mcp = read("aws/api/mcp.mjs")
const index = read("aws/api/index.mjs")
const ai = JSON.parse(read("aws/api/catalog/ai.json"))
const bad = []

// 1. mcp.mjs reaches nothing on its own.
if (/^\s*import\s/m.test(mcp) || /\bimport\s*\(/.test(mcp) || /\brequire\s*\(/.test(mcp)) bad.push("mcp.mjs imports a module; it must take everything through deps")
for (const [what, re] of [
  ["an AWS SDK client", /@aws-sdk|Client\s*\(|\.send\s*\(/],
  ["the SQL runner", /\bsql\s*\(|\blake\s*\(|ExecuteStatement|StartQueryExecution/],
  ["a SQL statement", /\bselect\s+[\w"*(]|\binsert\s+into\b|\bdelete\s+from\b|\bupdate\s+\w+\s+set\b|\bdrop\s+table\b|\bunion\s+select\b/i],
  ["process.env", /process\.env/],
  ["fetch", /\bfetch\s*\(/],
]) if (re.test(mcp)) bad.push(`mcp.mjs names ${what}`)

// 2. What index.mjs hands over.
const deps = /export const DEPS = \{([\s\S]*?)\n\}/.exec(index)
if (!deps) bad.push("index.mjs has no `export const DEPS = {…}`")
else {
  if (/\bsql\b|\brds\b|\bathena\b|\bgateway\b|\bsend\b/.test(deps[1])) bad.push("DEPS hands mcp.mjs a SQL runner or an AWS client")
  for (const k of ["datasets", "catalogs", "readTable", "joins", "allowed", "errors"]) if (!new RegExp(`\\b${k}\\b`).test(deps[1])) bad.push(`DEPS lacks ${k}`)
}
if (!/if \(event\.path === "\/mcp"\) return mcp\(event, DEPS\)/.test(index)) bad.push("index.mjs does not route /mcp to mcp(event, DEPS)")

// 3. Withheld tables stay withheld.
const withheld = Object.keys(ai.withheld ?? {})
if (!withheld.length) bad.push("catalog/ai.json lists no withheld tables; the check expects public_reports, filings, filing_events, filing_versions")
for (const t of withheld) {
  const path = t.replace(/_/g, "-")
  if (mcp.includes(t) || mcp.includes(path)) bad.push(`mcp.mjs names the withheld table ${t}`)
  if (ai.tables.some((x) => x.table === t || x.path === path)) bad.push(`catalog/ai.json serves the withheld table ${t}`)
}

if (bad.length) {
  console.error(`MCP boundary: ${bad.length} violation(s)\n- ${bad.join("\n- ")}`)
  process.exit(1)
}
console.log(`MCP boundary holds: mcp.mjs imports nothing and names no client, runner or statement; DEPS carries no runner; ${withheld.length} withheld tables named nowhere and served nowhere.`)
