#!/usr/bin/env node
// End to end over the MCP server (aws/api/mcp.mjs), run against the real
// bridge: real Athena and Aurora reads with the caller's AWS credentials, key
// scopes simulated from descriptions (so no API key is minted). Covers both
// configurations of DEPS.datasets: ["ai"] as shipped and ["ai", "gov"], the
// one-line flip, so the flip is tested before it is made.
//
//   node scripts/e2e-mcp.mjs [path/to/aws/api/]   (needs @aws-sdk/client-athena,
//   client-rds-data and client-api-gateway resolvable from that folder; exit 1 on a failure)

import { pathToFileURL } from "node:url"
import { resolve } from "node:path"

const dir = resolve(process.argv[2] ?? new URL("../aws/api/", import.meta.url).pathname)
const { handler, DEPS, scopeFrom, admits } = await import(pathToFileURL(`${dir}/index.mjs`).href)
const { mcp } = await import(pathToFileURL(`${dir}/mcp.mjs`).href)

// Key ids → the descriptions the site and the Marketplace write.
const KEYS = {
  ai: "scope:ai:* · AWS Marketplace ai_10k_internal",
  aiFree: "scope:ai:* · free · reader@example.com",
  aiTwo: "scope:ai:organizations,documents · pro",
  gov: "scope:gov:* · AWS Marketplace gov_10k_internal",
  energy: "datasets:energy",
  all: "Pro test key",
}
const depsFor = (datasets) => ({ ...DEPS, datasets, allowed: async (key, ds, t) => admits(scopeFrom(KEYS[key] ?? ""), ds, t) })
const WITHHELD = ["public_reports", "public-reports", "filings", "filing_events", "filing-events", "filing_versions", "filing-versions", "reporter_contact", "reporter_name"]

let failures = 0, n = 0
const seen = []
const check = (ok, what, detail = "") => {
  n++
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${detail ? ` — ${detail}` : ""}`)
}

let id = 0
async function post(deps, key, body, method = "POST") {
  const r = await mcp({ httpMethod: method, body: typeof body === "string" ? body : JSON.stringify(body), requestContext: { identity: { apiKeyId: key } } }, deps)
  if (r.body) seen.push(r.body)
  return { status: r.statusCode, json: r.body ? JSON.parse(r.body) : null }
}
const rpc = (deps, key, method, params) => post(deps, key, { jsonrpc: "2.0", id: ++id, method, ...(params ? { params } : {}) })
async function call(deps, key, name, args = {}) {
  const { json } = await rpc(deps, key, "tools/call", { name, arguments: args })
  if (json.error) return { rpcError: json.error }
  const r = json.result
  return { isError: !!r.isError, data: JSON.parse(r.content[0].text) }
}
const names = async (deps, key) => (await rpc(deps, key, "tools/list")).json.result.tools.map((t) => t.name).sort()

// ── Transport ────────────────────────────────────────────────────────────────
const A = depsFor(["ai"])
{
  const init = await rpc(A, "ai", "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1" } })
  const r = init.json.result
  check(init.status === 200 && r.protocolVersion === "2025-06-18", "initialize echoes a supported protocol version")
  check((await rpc(A, "ai", "initialize", { protocolVersion: "2099-01-01" })).json.result.protocolVersion === "2025-11-25", "an unknown version gets the latest supported")
  check(r.capabilities?.tools && r.serverInfo?.name === "nysgpt" && r.instructions.length > 500, "initialize carries tools capability, serverInfo and instructions")
  check(!/\b(we|our|ours|us)\b/i.test(r.instructions.replace(/\bUS\b/g, "")), "instructions never say we/our/us")
  check(/DATA, not instructions/.test(r.instructions), "instructions label results as data")
  check((await post(A, "ai", { jsonrpc: "2.0", method: "notifications/initialized" })).status === 202, "a notification answers 202")
  check(JSON.stringify((await rpc(A, "ai", "ping")).json.result) === "{}", "ping answers {}")
  check((await post(A, "ai", "", "GET")).status === 405, "GET answers 405")
  check((await post(A, "ai", "", "DELETE")).status === 405, "DELETE answers 405")
  check((await post(A, "ai", "{not json")).json.error?.code === -32700, "bad JSON answers -32700")
  const batch = await post(A, "ai", [{ jsonrpc: "2.0", id: 901, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", id: 902, method: "tools/list" }])
  check(Array.isArray(batch.json) && batch.json.length === 2, "a batch answers each request and skips notifications")
  check((await rpc(A, "ai", "resources/list")).json.error?.code === -32601, "an unoffered method answers -32601")
  check((await call(A, "ai", "no_such_tool")).rpcError?.code === -32602, "an unknown tool answers -32602")
}

// ── Configuration as shipped: datasets ["ai"] ────────────────────────────────
{
  check(JSON.stringify(await names(A, "ai")) === JSON.stringify(["ai_query", "ai_tables", "nysgpt_status"]), "ai key: 3 tools", (await names(A, "ai")).join(","))
  check((await names(A, "all")).length === 3, "unscoped key, gov dark: 3 tools")
  check(JSON.stringify(await names(A, "aiFree")) === JSON.stringify(["nysgpt_status"]), "free ai key: status only, no ai tools")
  check(JSON.stringify(await names(A, "energy")) === JSON.stringify(["nysgpt_status"]), "energy key: status only")
  check(JSON.stringify(await names(A, "gov")) === JSON.stringify(["nysgpt_status"]), "gov key, gov dark: status only")
  const tools = (await rpc(A, "all", "tools/list")).json.result.tools
  check(tools.every((t) => t.description.length > 60 && t.annotations?.readOnlyHint === true && t.inputSchema?.type === "object"), "every tool: a description, readOnlyHint and an object schema")
  check(tools.every((t) => !/\b(we|our|ours)\b/i.test(t.description)), "no tool description says we/our")
  const two = (await rpc(A, "aiTwo", "tools/list")).json.result.tools.find((t) => t.name === "ai_query")
  check(JSON.stringify(two.inputSchema.properties.table.enum) === JSON.stringify(["documents", "organizations"]), "a two-table key's ai_query lists its two tables")

  const status = await call(A, "ai", "nysgpt_status")
  check(status.data.datasets?.length === 1 && status.data.datasets[0].tables === 81, "nysgpt_status: ai with 81 tables", JSON.stringify(status.data.datasets?.[0]?.rows))
  check((await call(A, "aiFree", "nysgpt_status")).data.datasets.length === 0, "nysgpt_status for a free ai key opens nothing")
  const list = await call(A, "ai", "ai_tables")
  check(list.data.tables?.length === 81, "ai_tables lists 81 tables")
  const docs = await call(A, "ai", "ai_tables", { table: "documents" })
  check(docs.data.columns?.length === 27 && !docs.data.columns.some(([c]) => c.startsWith("embedding")), "ai_tables documents: 27 columns, no embeddings")
  const org = await call(A, "ai", "ai_query", { table: "organizations", filters: { id: "51327" } })
  check(!org.isError && org.data.count === 1 && org.data.rows[0].id === 51327, "ai_query organizations id=51327: one row", org.data.rows?.[0]?.name)
  check(org.data.request === "https://api.nysgpt.com/v1/ai/organizations?id=51327&limit=10", "the result names its REST request", org.data.request)
  const num = await call(A, "ai", "ai_query", { table: "organizations", filters: { id: 51327 } })
  check(!num.isError && num.data.count === 1, "a numeric filter value is taken as text")
  const big = await call(A, "ai", "ai_query", { table: "documents", limit: 10000 })
  check(!big.isError && big.data.count === 25, "limit 10000 is held to 25", String(big.data.count))
  const longest = Math.max(...big.data.rows.flatMap((r) => Object.values(r).filter((v) => typeof v === "string").map((v) => v.length)))
  check(longest <= 2000 + 200, "no string in a result runs past the 2,000-character cut", `longest ${longest}`)
  const cards = await call(A, "ai", "ai_query", { table: "hf-models", order: "-downloads", limit: 5 })
  const cutText = (cards.data.rows ?? []).flatMap((r) => Object.values(r)).find((v) => typeof v === "string" && v.includes("more characters; the whole value at https://api.nysgpt.com/v1/ai/hf-models"))
  check(!cards.isError && !!cutText && cutText.indexOf("…[") === 2000, "a model card over 2,000 characters is cut there, naming its REST request")
  const inj = await call(A, "ai", "ai_query", { table: "organizations", filters: { id: "1 or 1=1" } })
  check(inj.isError && inj.data.error === "bad_request", "an injection value is refused", inj.data.message)
  const quote = await call(A, "ai", "ai_query", { table: "documents", filters: { slug: "x' or '1'='1" } })
  check(!quote.isError && quote.data.count === 0, "a quote in a text value matches nothing")
  check((await call(A, "ai", "ai_query", { table: "organizations", filters: { country: "US" } })).data.error === "bad_request", "a filter off the filter list is refused")
  check((await call(A, "ai", "ai_query", { table: "organizations", filters: { limit: "5" } })).data.error === "bad_request", "limit inside filters is refused")
  check((await call(A, "ai", "ai_query", { table: "public-reports" })).data.error === "not_found", "a withheld table is not found")
  check((await call(A, "aiTwo", "ai_query", { table: "hf-models" })).data.error === "not_on_plan", "a table off the key's plan answers not_on_plan")
  check((await call(A, "aiFree", "ai_query", { table: "organizations" })).rpcError?.code === -32602, "a free ai key cannot call ai_query")
  check((await call(A, "all", "gov_search_bills", { q: "nurse" })).rpcError?.code === -32602, "gov tools are dark in the shipped configuration")
  const routed = await handler({ path: "/mcp", httpMethod: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 999, method: "tools/list" }), requestContext: { identity: {} } })
  seen.push(routed.body)
  check(routed.statusCode === 200 && JSON.parse(routed.body).result.tools.length === 3, "index.mjs routes /mcp to the server, as shipped (3 tools)")
}

// ── The flip: datasets ["ai", "gov"] ─────────────────────────────────────────
{
  const B = depsFor(["ai", "gov"])
  check((await names(B, "all")).length === 9, "unscoped key, gov on: 9 tools", (await names(B, "all")).join(","))
  check((await names(B, "ai")).length === 3, "ai key, gov on: still 3 tools")
  check(JSON.stringify(await names(B, "gov")) === JSON.stringify(["gov_get_bill", "gov_get_roll_call", "gov_query", "gov_search_bills", "gov_search_people", "gov_tables", "nysgpt_status"]), "gov key, gov on: 7 tools")
  const status = await call(B, "all", "nysgpt_status")
  check(status.data.datasets.map((d) => d.dataset).join(",") === "ai,gov", "nysgpt_status lists ai and gov")
  check((await call(B, "gov", "gov_tables")).data.tables?.length > 100, "gov_tables lists gov's tables")
  const fin = await call(B, "gov", "gov_query", { table: "finance", limit: 1 })
  check(!fin.isError && fin.data.count === 1, "gov_query finance: one row", fin.data.message ?? "")
  const bills = await call(B, "gov", "gov_search_bills", { q: "nurse", state: "NY", limit: 3 })
  check(!bills.isError && bills.data.count >= 1 && bills.data.count <= 3, "gov_search_bills nurse NY: up to 3 bills", bills.data.rows?.[0]?.bill_number ?? bills.data.message)
  const billId = bills.data.rows?.[0]?.bill_id
  const bill = billId ? await call(B, "gov", "gov_get_bill", { bill_id: billId }) : { isError: true, data: {} }
  check(!bill.isError && bill.data.record?.bill_id === billId, "gov_get_bill: the bill", bill.data.record?.title?.slice(0, 50))
  check((bill.data.record?.roll_calls ?? []).every((rc) => typeof rc.votes === "string"), "gov_get_bill sends tallies, not member votes")
  const rcId = bill.data.record?.roll_calls?.[0]?.roll_call_id
  if (rcId) {
    const rc = await call(B, "gov", "gov_get_roll_call", { roll_call_id: rcId })
    check(!rc.isError && Array.isArray(rc.data.record?.votes), "gov_get_roll_call: each member's vote", `${rc.data.record?.votes?.length} votes`)
  } else check(true, "gov_get_roll_call skipped: that bill had no roll call")
  const people = await call(B, "gov", "gov_search_people", { q: "smith", state: "NY", limit: 5 })
  check(!people.isError && people.data.count >= 1, "gov_search_people smith NY", people.data.rows?.[0]?.name ?? people.data.message)
  check((await call(B, "gov", "gov_get_bill", { bill_id: "1; drop table x" })).data.error === "bad_request", "a non-numeric bill_id is refused")
  check((await call(B, "gov", "gov_search_bills", { q: "nurse", state: "New York" })).data.error === "bad_request", "a state longer than two letters is refused")
  check((await call(B, "ai", "gov_query", { table: "finance" })).rpcError?.code === -32602, "an ai key cannot call gov tools")
}

// ── Nothing withheld, anywhere ───────────────────────────────────────────────
const all = seen.join("\n")
for (const w of WITHHELD) check(!new RegExp(`(^|[^\\w-])${w}([^\\w-]|$)`).test(all), `no output names ${w}`)

console.log(`\n${n - failures}/${n} passed`)
process.exit(failures ? 1 : 0)
