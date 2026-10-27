// api.nysgpt.com: one read-only REST API over the NYSgpt datasets.
//
// API Gateway checks the key and the plan's quota before this runs, so a bot
// without a key never reaches a database. A dataset is either its product's
// own Aurora cluster, read over the RDS Data API (no VPC, no pool, no driver),
// or Parquet in the S3 lake, read through Athena (ATHENA below):
//
//   GET /v1                         the datasets
//   GET /v1/{dataset}               every table it publishes, with columns and filters
//   GET /v1/{dataset}/{table}       rows, filtered on indexed columns: ?col=, col.gte=, col.lte=, order=, limit=, offset=
//   GET /v1/{dataset}/...           a few joins: one record with what no single source connects it to
//
// The tables come from catalog/*.json, built from the clusters themselves; a
// table not in its catalog cannot be read. Dependency-free on purpose (local
// builds are banned): the SDK ships in the Lambda runtime.

import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data"
import { APIGatewayClient, GetApiKeyCommand } from "@aws-sdk/client-api-gateway"
import { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand, StopQueryExecutionCommand } from "@aws-sdk/client-athena"
import { readdirSync, readFileSync } from "node:fs"

const rds = new RDSDataClient({})
const ARN = "arn:aws:rds:us-east-1:638175140432:cluster:"
const SECRET = "arn:aws:secretsmanager:us-east-1:638175140432:secret:"

// Dataset → its product's cluster. Health is the leuk cluster's public data;
// leuk-phi is never read. Solar is a slice of the solar cluster's tables.
const CLUSTERS = {
  gov: ["govblock", "rds!cluster-ee58a523-8533-4ef9-8436-a38afeb469ec-OYP1jc", "policy"],
  energy: ["solar", "rds!cluster-be75506a-a452-4fb8-91f3-04bca767adf0-jS457V", "solar"],
  solar: ["solar", "rds!cluster-be75506a-a452-4fb8-91f3-04bca767adf0-jS457V", "solar"],
  health: ["leuk", "rds!cluster-0765911c-d2fa-4cb6-ab7c-37d894c83b4b-IugwnE", "leuk"],
  tariffs: ["tariffs", "rds!cluster-8f84eea9-738b-4419-b790-f8896404ddfc-0ehFVQ", "tariffs"],
  science: ["nsr", "rds!cluster-7939e7b3-a70e-444e-a851-d93a4f14aea1-JNOYBn", "nsr"],
  childcare: ["childcare", "rds!cluster-bbe4fe60-ee32-4bf8-9994-67985de204c9-HmzZBa", "childcare"],
  insurance: ["insurance", "rds!cluster-1ab764bb-5f80-4f41-9770-06fb8b8a12ec-7HJ4Wh", "insurance"],
  sports: ["sports", "rds!cluster-155ee307-3be6-4ade-b2f3-728024bdaed6-XZJhHP", "sports"],
}

// Dataset → its Glue database, for datasets served from the lake. The AI
// API's cluster was deleted 10-15; its final snapshot is Parquet under
// lake/v1/ai, and nysgpt_ai registers only the 85 tables in catalog/ai.json.
// The nysgpt-api workgroup stops any one query at 2 GB scanned and enforces
// its own results location (SSE-S3). The catalog serves no embedding or
// tsvector columns; each table's `omitted` lists them, for a later opt-in.
const ATHENA = {
  ai: { database: "nysgpt_ai", workgroup: "nysgpt-api", output: "s3://govblock-lake-638175140432/lake/v1/_athena/results/" },
}

class NotFound extends Error {}
class BadRequest extends Error {}
class TooSlow extends Error {}
class Busy extends Error {}

/**
 * One statement on a dataset's cluster. `params` is a list bound as :p1, :p2…
 * Aurora pauses when idle and refuses calls while it resumes, so retry inside
 * API Gateway's 29-second window.
 */
async function sql(dataset, statement, params = []) {
  const [cluster, secret, database] = CLUSTERS[dataset]
  const parameters = params.map((v, i) => ({
    name: `p${i + 1}`,
    value: v === null ? { isNull: true } : typeof v === "number" && Number.isInteger(v) ? { longValue: v } : { stringValue: String(v) },
  }))
  for (let i = 0; ; i++) {
    try {
      const r = await rds.send(new ExecuteStatementCommand({
        resourceArn: ARN + cluster, secretArn: SECRET + secret, database, sql: statement, parameters, formatRecordsAs: "JSON",
      }))
      return JSON.parse(r.formattedRecords || "[]")
    } catch (e) {
      if (e.name === "DatabaseResumingException" && i < 10) {
        await new Promise((r) => setTimeout(r, 2500))
        continue
      }
      if (/exceeded|too large|1 ?MB/i.test(e.message)) throw new BadRequest("The response is over 1 MB. Ask for fewer rows with ?limit=.")
      throw e
    }
  }
}

const ident = (s) => `"${s.replace(/"/g, '""')}"`
const limitOf = (qs, max = 100) => Math.min(Math.max(parseInt(qs.limit ?? "25", 10) || 25, 1), max)
const like = (s) => `%${String(s).replace(/[%_\\]/g, (c) => "\\" + c)}%`
const one = (rows) => {
  if (!rows.length) throw new NotFound("No record with that id.")
  return rows[0]
}
const need = (v, name) => {
  if (v === undefined || v === "") throw new BadRequest(`Missing ?${name}=`)
  return v
}

// The catalogs: every table each dataset publishes (built from the clusters).
const CATALOGS = Object.fromEntries(
  readdirSync(new URL("./catalog/", import.meta.url))
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const c = JSON.parse(readFileSync(new URL(`./catalog/${f}`, import.meta.url), "utf8"))
      return [c.dataset, { ...c, byPath: new Map(c.tables.map((t) => [t.path, t])) }]
    })
)

// Types the Data API returns as JSON values; anything else is read as text.
const NATIVE = /^(integer|bigint|smallint|numeric|double precision|real|boolean|text|character varying|character|date|timestamp|json|jsonb|uuid)/

async function table(dataset, t, qs) {
  const types = new Map(t.columns)
  const where = [], params = []
  for (const [key, value] of Object.entries(qs)) {
    if (["limit", "offset", "order"].includes(key)) continue
    const [col, op = "eq"] = key.split(".")
    if (!t.filters.includes(col)) throw new BadRequest(t.filters.length ? `Filter on one of: ${t.filters.join(", ")}.` : "This table has no filters; page with limit and offset.")
    const sqlOp = { eq: "=", gte: ">=", lte: "<=", gt: ">", lt: "<" }[op]
    if (!sqlOp) throw new BadRequest("Operators: col=, col.gte=, col.lte=, col.gt=, col.lt=")
    params.push(value)
    // Cast the value to the column's own type, so the column's index is used.
    where.push(`${ident(col)} ${sqlOp} cast(:p${params.length} as ${types.get(col)})`)
  }
  let order = ""
  if (qs.order) {
    const col = qs.order.replace(/^-/, "")
    if (!t.filters.includes(col)) throw new BadRequest(`Order by one of: ${t.filters.join(", ")}.`)
    order = ` order by ${ident(col)} ${qs.order.startsWith("-") ? "desc" : "asc"}`
  }
  const offset = Math.max(parseInt(qs.offset ?? "0", 10) || 0, 0)
  // 100 rows a call, as the docs and the Marketplace listing say (security report F2).
  params.push(limitOf(qs), offset)
  const cols = t.columns.map(([c, type]) => (NATIVE.test(type) ? ident(c) : `${ident(c)}::text as ${ident(c)}`)).join(", ")
  const rows = await sql(dataset, `select ${cols} from ${ident(t.schema)}.${ident(t.table)}${where.length ? " where " + where.join(" and ") : ""}${order} limit :p${params.length - 1} offset :p${params.length}`, params)
  // jsonb arrives as a string; hand it back as JSON.
  const json = t.columns.filter(([, type]) => type === "json" || type === "jsonb").map(([c]) => c)
  if (json.length) for (const r of rows) for (const c of json) if (typeof r[c] === "string") try { r[c] = JSON.parse(r[c]) } catch {}
  return rows
}

// The lake. The snapshot export wrote every type but whole numbers, floats
// and booleans as text (dates, timestamps, numeric, arrays, jsonb), so a
// filter value becomes a typed SQL literal here, checked against the column's
// catalog type, and goes to Athena as an execution parameter: the statement
// itself holds only catalog names, fixed operators and numbers made here.
const athena = new AthenaClient({})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function lake(dataset, statement, params, deadline) {
  const { database, workgroup, output } = ATHENA[dataset]
  let id
  for (let i = 0; !id; i++) {
    try {
      id = (await athena.send(new StartQueryExecutionCommand({
        QueryString: statement,
        QueryExecutionContext: { Catalog: "AwsDataCatalog", Database: database },
        WorkGroup: workgroup,
        ResultConfiguration: { OutputLocation: output },
        // The lake is a fixed snapshot, so an identical query's answer stays good.
        ResultReuseConfiguration: { ResultReuseByAgeConfiguration: { Enabled: true, MaxAgeInMinutes: 60 } },
        ...(params.length ? { ExecutionParameters: params } : {}),
      }))).QueryExecutionId
    } catch (e) {
      if (e.name !== "TooManyRequestsException") throw e
      if (i >= 3 || Date.now() > deadline - 4000) throw new Busy()
      await sleep(400 * 2 ** i)
    }
  }
  for (let wait = 150; ; wait = Math.min(wait * 1.5, 1000)) {
    if (Date.now() + wait > deadline) {
      await athena.send(new StopQueryExecutionCommand({ QueryExecutionId: id })).catch(() => {})
      throw new TooSlow()
    }
    await sleep(wait)
    const { Status } = (await athena.send(new GetQueryExecutionCommand({ QueryExecutionId: id }))).QueryExecution
    if (Status.State === "SUCCEEDED") break
    if (Status.State === "FAILED" || Status.State === "CANCELLED") {
      console.error("athena", id, Status.State, Status.StateChangeReason)
      // Category 2 is the user's query (a value out of a column's range, say).
      if (Status.AthenaError?.ErrorCategory === 2) throw new BadRequest("The query was refused. Check the filter values against the column types at /v1/" + dataset + ".")
      throw new Error(`Athena ${Status.State}: ${Status.StateChangeReason}`)
    }
  }
  const { ResultSet } = await athena.send(new GetQueryResultsCommand({ QueryExecutionId: id, MaxResults: 1000 }))
  // The first row of a SELECT's results is its header.
  return ResultSet.Rows.slice(1).map((r) => r.Data.map((d) => d.VarCharValue ?? null))
}

// Postgres array text ({a,"b c",NULL}) back to a list.
function pgArray(s) {
  if (typeof s !== "string" || s[0] !== "{") return s
  if (s === "{}") return []
  const out = []
  let cur = "", quoted = false, inQuote = false
  for (let i = 1; i < s.length; i++) {
    const c = s[i]
    if (inQuote) {
      if (c === "\\") cur += s[++i]
      else if (c === '"') inQuote = false
      else cur += c
    } else if (c === '"') inQuote = quoted = true
    else if (c === "," || c === "}") {
      out.push(!quoted && cur === "NULL" ? null : cur)
      cur = ""
      quoted = false
      if (c === "}") break
    } else cur += c
  }
  return out
}

const WHOLE = /^(integer|bigint|smallint)$/
const FLOAT = /^(real|double precision|numeric)/
const text = (v) => `'${v.replace(/'/g, "''")}'`

// A filter value as a SQL literal of the column's type, or a 400.
function literal(col, type, v) {
  if (v.length > 1000) throw new BadRequest(`?${col}= is over 1,000 characters.`)
  if (WHOLE.test(type)) {
    if (!/^-?\d{1,19}$/.test(v) || BigInt(v) > 9223372036854775807n || BigInt(v) < -9223372036854775808n) throw new BadRequest(`?${col}= takes a whole number.`)
    return BigInt(v).toString()
  }
  if (FLOAT.test(type)) {
    if (!/^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(v) || !Number.isFinite(Number(v))) throw new BadRequest(`?${col}= takes a number.`)
    return `DOUBLE ${text(String(Number(v)))}`
  }
  if (type === "boolean") {
    const b = { true: "true", t: "true", 1: "true", false: "false", f: "false", 0: "false" }[v.toLowerCase()]
    if (!b) throw new BadRequest(`?${col}= takes true or false.`)
    return b
  }
  if (type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new BadRequest(`?${col}= takes a date, YYYY-MM-DD.`)
  if (type.startsWith("timestamp")) {
    // Stored as UTC text, "2026-07-28 20:40:53.066763+00", which sorts as it reads.
    const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?))?(Z|\+00(?::?00)?)?$/.exec(v)
    if (!m) throw new BadRequest(`?${col}= takes a UTC time, YYYY-MM-DD or YYYY-MM-DD HH:MM:SS.`)
    return text(m[2] ? `${m[1]} ${m[2]}${m[3] ? "+00" : ""}` : m[1])
  }
  return text(v)
}

// The column as the literal compares to it: numeric is stored as text.
const lakeCol = (col, type) => (/^numeric/.test(type) ? `try_cast(${ident(col)} as double)` : ident(col))

// A value from Athena (always text) back to the JSON the cluster path sends.
const fromLake = (type) =>
  WHOLE.test(type) || /^(real|double precision)$/.test(type) ? (v) => Number(v)
  : type === "boolean" ? (v) => v === "true"
  : /^jsonb?$/.test(type) ? (v) => { try { return JSON.parse(v) } catch { return v } }
  : type.endsWith("[]") ? pgArray
  : (v) => v

async function lakeTable(dataset, t, qs) {
  const deadline = Date.now() + 24_000
  const types = new Map(t.columns)
  const where = [], params = []
  for (const [key, value] of Object.entries(qs)) {
    if (["limit", "offset", "order"].includes(key)) continue
    const [col, op = "eq"] = key.split(".")
    if (!t.filters.includes(col)) throw new BadRequest(t.filters.length ? `Filter on one of: ${t.filters.join(", ")}.` : "This table has no filters; page with limit and offset.")
    const sqlOp = { eq: "=", gte: ">=", lte: "<=", gt: ">", lt: "<" }[op]
    if (!sqlOp) throw new BadRequest("Operators: col=, col.gte=, col.lte=, col.gt=, col.lt=")
    const type = types.get(col)
    if (type.endsWith("[]") && op !== "eq") throw new BadRequest(`${col} is a list; match it whole, as ?${col}={a,b}.`)
    params.push(literal(col, type, String(value)))
    where.push(`${lakeCol(col, type)} ${sqlOp} ?`)
  }
  const offset = Math.min(Math.max(parseInt(qs.offset ?? "0", 10) || 0, 0), Number.MAX_SAFE_INTEGER)
  let order = ""
  if (qs.order) {
    const col = qs.order.replace(/^-/, "")
    if (!t.filters.includes(col)) throw new BadRequest(`Order by one of: ${t.filters.join(", ")}.`)
    // Postgres's defaults: nulls sort last going up, first going down.
    order = ` order by ${lakeCol(col, types.get(col))} ${qs.order.startsWith("-") ? "desc nulls first" : "asc nulls last"}`
  } else if (offset) {
    // Athena reads files in parallel, so without an order a second page can
    // repeat the first. Page on the table's first column.
    const [col, type] = t.columns[0]
    order = ` order by ${lakeCol(col, type)} asc nulls last`
  }
  const cols = t.columns.map(([c]) => ident(c)).join(", ")
  const statement = `select ${cols} from ${ident(ATHENA[dataset].database)}.${ident(t.table)}${where.length ? " where " + where.join(" and ") : ""}${order}${offset ? ` offset ${offset}` : ""} limit ${limitOf(qs)}`
  const conv = t.columns.map(([c, type]) => [c, fromLake(type)])
  const rows = (await lake(dataset, statement, params, deadline)).map((r) => Object.fromEntries(conv.map(([c, f], i) => [c, r[i] === null ? null : f(r[i])])))
  // A Lambda answers at most 6 MB.
  if (Buffer.byteLength(JSON.stringify(rows)) > 5_000_000) throw new BadRequest("The response is over 5 MB. Ask for fewer rows with ?limit=.")
  return rows
}

// A Postgres array read as text ({a,b}) back to a list.
const list = (s) => (s || "{}").replace(/^\{|\}$/g, "").split(",").map((x) => x.replace(/^"|"$/g, "")).filter(Boolean)

// The joins: [path pattern, dataset, source, handler(params, query)]
const routes = [
  ["gov/bills", "gov", "State legislatures and Congress", async (_, qs) =>
    sql("gov",
      `select bill_id, state, session_id, bill_number, title, status_desc, last_action, last_action_date
       from "Bills" where title ilike :p1 ${qs.state ? "and state = :p3" : ""}
       order by last_action_date desc nulls last limit :p2`,
      [like(need(qs.q, "q")), limitOf(qs), ...(qs.state ? [qs.state.toUpperCase()] : [])])],
  ["gov/bills/:id", "gov", "State legislatures and Congress", async ({ id }) => {
    const bill = one(await sql("gov",
      `select bill_id, state, session_id, session_title, bill_number, title, description, status_desc,
              committee, last_action, last_action_date, state_link
       from "Bills" where bill_id = :p1`, [Number(id)]))
    const [sponsors, rollCalls] = await Promise.all([
      sql("gov", `select p.people_id, p.name, p.party, p.chamber, p.district, s.position
                  from "Sponsors" s join "People" p using (people_id) where s.bill_id = :p1 order by s.position`, [Number(id)]),
      sql("gov", `select roll_call_id, date, chamber, description, yea, nay, nv, absent, total
                  from "Roll Call" where bill_id = :p1 order by date`, [Number(id)]),
    ])
    // Each member's vote on each roll call. Capped so a bill with dozens of
    // House roll calls stays under the Data API's 1 MB response limit; the rest
    // are at /rollcalls/{id}.
    const votes = rollCalls.length
      ? await sql("gov",
          `select v.roll_call_id, p.people_id, p.name, p.party, p.district, v.vote_desc
           from "Votes" v join "People" p using (people_id)
           where v.roll_call_id = any(cast(:p1 as bigint[])) order by v.roll_call_id, p.name limit 5000`,
          [`{${rollCalls.map((r) => r.roll_call_id).join(",")}}`])
      : []
    const byRollCall = new Map()
    for (const { roll_call_id, ...v } of votes) {
      const k = String(roll_call_id)
      byRollCall.set(k, [...(byRollCall.get(k) ?? []), v])
    }
    return { ...bill, sponsors, roll_calls: rollCalls.map((r) => ({ ...r, votes: byRollCall.get(String(r.roll_call_id)) ?? [] })) }
  }],
  ["gov/rollcalls/:id", "gov", "State legislatures and Congress", async ({ id }) => {
    const rc = one(await sql("gov",
      `select r.roll_call_id, r.bill_id, b.bill_number, b.title, r.date, r.chamber, r.description, r.yea, r.nay, r.nv, r.absent
       from "Roll Call" r left join "Bills" b using (bill_id) where r.roll_call_id = :p1`, [Number(id)]))
    const votes = await sql("gov",
      `select p.people_id, p.name, p.party, p.district, v.vote_desc
       from "Votes" v join "People" p using (people_id) where v.roll_call_id = :p1 order by p.name`, [Number(id)])
    return { ...rc, votes }
  }],
  ["gov/people", "gov", "State legislatures and Congress", async (_, qs) =>
    sql("gov",
      `select people_id, name, party, role, chamber, district, state from "People"
       where name ilike :p1 ${qs.state ? "and state = :p3" : ""} order by name limit :p2`,
      [like(need(qs.q, "q")), limitOf(qs), ...(qs.state ? [qs.state.toUpperCase()] : [])])],

  ["energy/plants", "energy", "EIA-860 and EIA-923", async (_, qs) =>
    sql("energy",
      `select plant_code, plant_name, city, county, state, ba_code, sector_name, latitude, longitude
       from solargpt.eia860_plants
       where (cast(:p1 as text) is null or plant_name ilike :p1) and (cast(:p2 as text) is null or state = :p2)
       order by plant_name limit :p3`,
      [qs.q ? like(qs.q) : null, qs.state ? qs.state.toUpperCase() : null, limitOf(qs)])],
  ["energy/plants/:id", "energy", "EIA-860 and EIA-923", async ({ id }) => {
    const [plant, generators, generation] = await Promise.all([
      sql("energy", `select * from solargpt.eia860_plants where plant_code = :p1`, [Number(id)]).then(one),
      sql("energy", `select generator_id, technology, prime_mover, energy_source_1, nameplate_mw, summer_mw, winter_mw,
                            status, operating_year, planned_retirement_year
                     from solargpt.eia860_generators where plant_code = :p1 order by generator_id`, [Number(id)]),
      sql("energy", `select data_year, fuel_code, fuel_label, fuel_group, prime_mover, net_gen_mwh
                     from solargpt.eia923_plant_generation where plant_id = :p1 order by data_year desc, net_gen_mwh desc nulls last`, [Number(id)]),
    ])
    const nameplate_mw = generators.reduce((s, g) => s + (Number(g.nameplate_mw) || 0), 0)
    return { ...plant, nameplate_mw: Math.round(nameplate_mw * 10) / 10, generators, net_generation: generation }
  }],

  ["tariffs/rulings", "tariffs", "CBP CROSS rulings", async (_, qs) =>
    (await sql("tariffs",
      `select ruling_number, ruling_date, subject, tariffs::text as tariffs, collection
       from cross_rulings where subject ilike :p1 order by ruling_date desc nulls last limit :p2`,
      [like(need(qs.q, "q")), limitOf(qs)])).map((r) => ({ ...r, tariffs: list(r.tariffs) }))],
  ["tariffs/rulings/:id", "tariffs", "CBP CROSS rulings and the HTS", async ({ id }) => {
    const r = one(await sql("tariffs",
      `select ruling_number, ruling_date, subject, categories, collection, tariffs::text as tariffs, related_rulings::text as related_rulings,
              modifies::text as modifies, modified_by::text as modified_by, revokes::text as revokes, revoked_by::text as revoked_by,
              is_usmca, source_url, left(full_text, 4000) as text_excerpt
       from cross_rulings where ruling_number = :p1`, [id.toUpperCase()]))
    for (const k of ["tariffs", "related_rulings", "modifies", "modified_by", "revokes", "revoked_by"]) r[k] = list(r[k])
    // Rulings write 6110.20.2077, the schedule 6110.20.20.77: match on digits,
    // and return every line above the code too, since the duty rate sits on the
    // 8-digit line and the statistical suffix below it.
    const codes = r.tariffs.map((t) => t.replace(/\D/g, "")).filter((d) => d.length >= 6)
    const hts = codes.length
      ? await sql("tariffs",
          `select htsno, indent, description, general, special, other, units::text as units from hts_schedule h
           where length(regexp_replace(htsno, '\\D', '', 'g')) >= 4
             and exists (select 1 from unnest(cast(:p1 as text[])) c where c like regexp_replace(h.htsno, '\\D', '', 'g') || '%')
           order by seq`, [`{${codes.join(",")}}`])
      : []
    return { ...r, hts_lines: hts }
  }],
  ["tariffs/hts/:id", "tariffs", "Harmonized Tariff Schedule and CBP CROSS rulings", async ({ id }) => {
    const digits = id.replace(/\D/g, "")
    if (digits.length < 4) throw new BadRequest("An HTS number has at least 4 digits.")
    const line = one(await sql("tariffs",
      `select htsno, chapter, heading, indent, description, general, special, other, units::text as units, footnotes::text as footnotes
       from hts_schedule where regexp_replace(htsno, '\\D', '', 'g') = :p1 order by seq limit 1`, [digits]))
    const rulings = await sql("tariffs",
      `select ruling_number, ruling_date, subject from cross_rulings
       where (' ' || cross_tariff_digits(tariffs)) like '% ' || :p1 || '%'
       order by ruling_date desc nulls last limit 25`, [digits])
    return { ...line, recent_rulings: rulings }
  }],

  ["health/providers/:id", "health", "NPPES, insurer directories and price files", async ({ id }) => {
    const p = one(await sql("health",
      `select npi, entity_type, org_name, first_name, last_name, credential, loc_addr1, loc_city, loc_state, zip5,
              loc_phone, primary_taxonomy, enumeration_date, last_update, deactivation_date
       from nppes_npi where npi = :p1`, [id]))
    const [networks, rates] = await Promise.all([
      sql("health", `select s.name as payer, n.network_name, pnp.accepting_new_patients, pnp.source_last_updated
                     from provider_network_participation pnp
                     join payer_sources s on s.id = pnp.payer_source_id
                     left join payer_networks n on n.id = pnp.network_id
                     where pnp.npi = :p1 order by s.name limit 100`, [id]),
      sql("health", `select payer, plan_or_network, billing_code, billing_class, negotiated_type, negotiated_rate, place_of_service, as_of
                     from provider_rate_signals where npi = :p1 order by payer, billing_code limit 100`, [id]),
    ])
    return { ...p, networks, negotiated_rates: rates }
  }],
  ["health/providers", "health", "NPPES", async (_, qs) =>
    sql("health",
      `select npi, org_name, loc_addr1, loc_city, loc_state, zip5, primary_taxonomy
       from nppes_npi where entity_type = 2 and deactivation_date is null and zip5 = :p1
       ${qs.q ? "and org_name ilike :p3" : ""} order by org_name limit :p2`,
      [need(qs.zip, "zip"), limitOf(qs), ...(qs.q ? [like(qs.q)] : [])])],
]

function match(path) {
  const parts = path.split("/").filter(Boolean)
  for (const [pattern, dataset, source, fn] of routes) {
    const pp = pattern.split("/")
    if (pp.length !== parts.length) continue
    const params = {}
    if (pp.every((seg, i) => (seg.startsWith(":") ? ((params[seg.slice(1)] = decodeURIComponent(parts[i])), true) : seg === parts[i])))
      return { dataset, source, fn, params }
  }
  const [dataset, name, ...rest] = parts
  const c = CATALOGS[dataset]
  if (!c || rest.length) return null
  if (!name) return { dataset, source: "Catalog", fn: async () => c.tables.map(({ path, rows, columns, filters }) => ({ path: `/v1/${dataset}/${path}`, rows, columns, filters })), params: {} }
  const t = c.byPath.get(name)
  return t ? { dataset, table: t.path, source: `${t.schema}.${t.table}`, fn: (_, qs) => (ATHENA[dataset] ? lakeTable : table)(dataset, t, qs), params: {} } : null
}

// A key's scope is in its description: "scope:<dataset>:<tables|*>" for a
// plan built in a box's control panel, "datasets:<a,b|*>" for the first keys.
// A key with neither (hand-issued) reads everything. Cached ten minutes per
// warm instance.
const gateway = new APIGatewayClient({})
const scopes = new Map()
async function allowed(keyId, dataset, table) {
  if (!keyId) return true
  let s = scopes.get(keyId)
  if (!s || s.at < Date.now() - 600_000) {
    const d = (await gateway.send(new GetApiKeyCommand({ apiKey: keyId }))).description || ""
    const scope = /scope:([^:\s]+):(\S+)/.exec(d)
    const old = /datasets:([^\s·]+)/.exec(d)
    s = { at: Date.now(), sets: scope ? [scope[1]] : old ? old[1].split(",") : ["*"], tables: scope && scope[2] !== "*" ? scope[2].split(",") : null }
    scopes.set(keyId, s)
  }
  if (!(s.sets.includes("*") || s.sets.includes(dataset))) return false
  return !table || !s.tables || s.tables.includes(table)
}

const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  // CROSS stores an empty list as [""]; send it as [].
  body: JSON.stringify(body, (_, v) => (Array.isArray(v) && v.every((x) => x === "") ? [] : v)),
})

export const handler = async (event) => {
  const path = (event.path || "").replace(/^\/v1/, "")
  const qs = event.queryStringParameters || {}
  if (path === "" || path === "/") {
    return json(200, {
      datasets: Object.values(CATALOGS).map((c) => ({ dataset: c.dataset, path: `/v1/${c.dataset}`, tables: c.tables.length, rows: c.tables.reduce((s, t) => s + t.rows, 0) })),
      joins: routes.map(([p, d]) => ({ dataset: d, path: `/v1/${p}` })),
    })
  }
  const m = match(path)
  if (!m) return json(404, { error: "No such endpoint. GET /v1 lists them." })
  if (!(await allowed(event.requestContext?.identity?.apiKeyId, m.dataset, m.table)))
    return json(403, { error: `This key's plan does not include ${m.table ? `/${m.table}` : `the ${m.dataset} API`}. Add it at nysgpt.com` })
  const t0 = Date.now()
  try {
    const data = await m.fn(m.params, qs)
    return json(200, {
      data,
      meta: { dataset: m.dataset, source: m.source, count: Array.isArray(data) ? data.length : 1, ms: Date.now() - t0 },
    })
  } catch (e) {
    if (e instanceof NotFound) return json(404, { error: e.message })
    if (e instanceof BadRequest) return json(400, { error: e.message })
    if (e instanceof TooSlow) return json(504, { error: "The query ran past 24 seconds and was stopped. Narrow it with a filter." })
    if (e instanceof Busy) return json(503, { error: "The API is busy. Try again in a few seconds." })
    console.error(path, e)
    return json(500, { error: "The query failed. It has been logged." })
  }
}
