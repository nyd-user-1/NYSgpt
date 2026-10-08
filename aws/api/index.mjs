// api.nysgpt.com: one read-only REST API over the NYSgpt datasets.
//
// API Gateway checks the key and the plan's quota before this runs, so a bot
// without a key never reaches a database. Every dataset answers the same three
// kinds of request: a search, one record by its id, and one record joined to
// what no single public source connects it to.
//
// Dependency-free on purpose (local builds are banned): Neon is reached over its
// HTTPS SQL endpoint with fetch, and Aurora over the RDS Data API with the SDK
// the Lambda runtime already ships.

import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data"

const rds = new RDSDataClient({})

async function neon(url, query, params = []) {
  const host = new URL(url).hostname
  const res = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: { "Neon-Connection-String": url, "Content-Type": "application/json" },
    body: JSON.stringify({ query, params }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || `neon ${res.status}`)
  return body.rows
}

// Aurora pauses when idle; the first call after a pause is refused while it
// resumes, so retry inside API Gateway's 29-second window.
async function aurora(sql, params = {}) {
  const parameters = Object.entries(params).map(([name, v]) => ({
    name,
    value: typeof v === "number" ? { longValue: v } : { stringValue: String(v) },
  }))
  for (let i = 0; ; i++) {
    try {
      const r = await rds.send(new ExecuteStatementCommand({
        resourceArn: process.env.GOV_CLUSTER_ARN,
        secretArn: process.env.GOV_SECRET_ARN,
        database: process.env.GOV_DATABASE || "policy",
        sql,
        parameters,
        formatRecordsAs: "JSON",
      }))
      return JSON.parse(r.formattedRecords || "[]")
    } catch (e) {
      if (e.name !== "DatabaseResumingException" || i >= 10) throw e
      await new Promise((r) => setTimeout(r, 2500))
    }
  }
}

const energy = (q, p) => neon(process.env.ENERGY_DATABASE_URL, q, p)
const tariffs = (q, p) => neon(process.env.TARIFFS_DATABASE_URL, q, p)
const health = (q, p) => neon(process.env.HEALTH_DATABASE_URL, q, p)

const limitOf = (qs) => Math.min(Math.max(parseInt(qs.limit ?? "25", 10) || 25, 1), 100)
const like = (s) => `%${String(s).replace(/[%_\\]/g, (c) => "\\" + c)}%`

class NotFound extends Error {}
class BadRequest extends Error {}
const one = (rows) => {
  if (!rows.length) throw new NotFound("No record with that id.")
  return rows[0]
}
const need = (v, name) => {
  if (v === undefined || v === "") throw new BadRequest(`Missing ?${name}=`)
  return v
}

// [method-less path pattern, dataset, source, handler(params, query)]
const routes = [
  // Gov: state and federal legislation, members and roll calls.
  ["gov/bills", "gov", "State legislatures via the policy database", async (_, qs) =>
    aurora(
      `select bill_id, state, session_id, bill_number, title, status_desc, last_action, last_action_date
       from "Bills" where title ilike :q ${qs.state ? "and state = :state" : ""}
       order by last_action_date desc nulls last limit :lim`,
      { q: like(need(qs.q, "q")), lim: limitOf(qs), ...(qs.state ? { state: qs.state.toUpperCase() } : {}) })],
  ["gov/bills/:id", "gov", "State legislatures", async ({ id }) => {
    const bill = one(await aurora(
      `select bill_id, state, session_id, session_title, bill_number, title, description, status_desc,
              committee, last_action, last_action_date, state_link
       from "Bills" where bill_id = :id`, { id: Number(id) }))
    const [sponsors, rollCalls] = await Promise.all([
      aurora(`select p.people_id, p.name, p.party, p.chamber, p.district, s.position
              from "Sponsors" s join "People" p using (people_id) where s.bill_id = :id order by s.position`, { id: Number(id) }),
      aurora(`select roll_call_id, date, chamber, description, yea, nay, nv, absent, total
              from "Roll Call" where bill_id = :id order by date`, { id: Number(id) }),
    ])
    return { ...bill, sponsors, roll_calls: rollCalls }
  }],
  ["gov/rollcalls/:id", "gov", "State legislatures", async ({ id }) => {
    const rc = one(await aurora(
      `select r.roll_call_id, r.bill_id, b.bill_number, b.title, r.date, r.chamber, r.description, r.yea, r.nay, r.nv, r.absent
       from "Roll Call" r left join "Bills" b using (bill_id) where r.roll_call_id = :id`, { id: Number(id) }))
    const votes = await aurora(
      `select p.people_id, p.name, p.party, p.district, v.vote_desc
       from "Votes" v join "People" p using (people_id) where v.roll_call_id = :id order by p.name`, { id: Number(id) })
    return { ...rc, votes }
  }],
  ["gov/people", "gov", "State legislatures", async (_, qs) =>
    aurora(
      `select people_id, name, party, role, chamber, district, state from "People"
       where name ilike :q ${qs.state ? "and state = :state" : ""} order by name limit :lim`,
      { q: like(need(qs.q, "q")), lim: limitOf(qs), ...(qs.state ? { state: qs.state.toUpperCase() } : {}) })],

  // Energy: every US power plant (EIA-860) joined to its generators and its
  // actual net generation by fuel (EIA-923).
  ["energy/plants", "energy", "EIA-860 and EIA-923", async (_, qs) =>
    energy(
      `select plant_code, plant_name, city, county, state, ba_code, sector_name, latitude, longitude
       from solargpt.eia860_plants
       where ($1::text is null or plant_name ilike $1) and ($2::text is null or state = $2)
       order by plant_name limit $3`,
      [qs.q ? like(qs.q) : null, qs.state ? qs.state.toUpperCase() : null, limitOf(qs)])],
  ["energy/plants/:id", "energy", "EIA-860 and EIA-923", async ({ id }) => {
    const [plant, generators, generation] = await Promise.all([
      energy(`select * from solargpt.eia860_plants where plant_code = $1`, [Number(id)]).then(one),
      energy(`select generator_id, technology, prime_mover, energy_source_1, nameplate_mw, summer_mw, winter_mw,
                     status, operating_year, planned_retirement_year
              from solargpt.eia860_generators where plant_code = $1 order by generator_id`, [Number(id)]),
      energy(`select data_year, fuel_code, fuel_label, fuel_group, prime_mover, net_gen_mwh
              from solargpt.eia923_plant_generation where plant_id = $1 order by data_year desc, net_gen_mwh desc nulls last`, [Number(id)]),
    ])
    const nameplate_mw = generators.reduce((s, g) => s + (g.nameplate_mw || 0), 0)
    return { ...plant, nameplate_mw: Math.round(nameplate_mw * 10) / 10, generators, net_generation: generation }
  }],

  // Tariffs: CBP CROSS rulings joined to the HTS lines they classify under.
  ["tariffs/rulings", "tariffs", "CBP CROSS rulings", async (_, qs) =>
    tariffs(
      `select ruling_number, ruling_date, subject, tariffs, collection
       from cross_rulings where subject ilike $1 order by ruling_date desc nulls last limit $2`,
      [like(need(qs.q, "q")), limitOf(qs)])],
  ["tariffs/rulings/:id", "tariffs", "CBP CROSS rulings and the HTS", async ({ id }) => {
    const r = one(await tariffs(
      `select ruling_number, ruling_date, subject, categories, collection, tariffs, related_rulings,
              modifies, modified_by, revokes, revoked_by, is_usmca, source_url, left(full_text, 4000) as text_excerpt
       from cross_rulings where ruling_number = $1`, [id.toUpperCase()]))
    // Rulings write 6110.20.2077, the schedule 6110.20.20.77: match on digits,
    // and return every line above the code too, since the duty rate sits on the
    // 8-digit line and the statistical suffix below it.
    const codes = (r.tariffs || []).map((t) => t.replace(/\D/g, "")).filter((d) => d.length >= 6)
    const hts = codes.length
      ? await tariffs(
          `select htsno, indent, description, general, special, other, units from hts_schedule h
           where length(regexp_replace(htsno, '\\D', '', 'g')) >= 4
             and exists (select 1 from unnest($1::text[]) c where c like regexp_replace(h.htsno, '\\D', '', 'g') || '%')
           order by seq`, [codes])
      : []
    return { ...r, hts_lines: hts }
  }],
  ["tariffs/hts/:id", "tariffs", "Harmonized Tariff Schedule and CBP CROSS rulings", async ({ id }) => {
    const digits = id.replace(/\D/g, "")
    if (digits.length < 4) throw new BadRequest("An HTS number has at least 4 digits.")
    const line = one(await tariffs(
      `select htsno, chapter, heading, indent, description, general, special, other, units, footnotes
       from hts_schedule where regexp_replace(htsno, '\\D', '', 'g') = $1 order by seq limit 1`, [digits]))
    const rulings = await tariffs(
      `select ruling_number, ruling_date, subject, tariffs from cross_rulings
       where (' ' || cross_tariff_digits(tariffs)) like '% ' || $1 || '%'
       order by ruling_date desc nulls last limit 25`, [digits])
    return { ...line, recent_rulings: rulings }
  }],

  // Health: every NPI (NPPES) joined to the payer networks it sits in and the
  // rates those payers have published for it.
  ["health/providers/:id", "health", "NPPES, payer directories and Transparency in Coverage files", async ({ id }) => {
    const p = one(await health(
      `select npi, entity_type, org_name, first_name, last_name, credential, loc_addr1, loc_city, loc_state, zip5,
              loc_phone, primary_taxonomy, enumeration_date, last_update, deactivation_date
       from nppes_npi where npi = $1`, [id]))
    const [networks, rates] = await Promise.all([
      health(`select s.name as payer, n.network_name, pnp.accepting_new_patients, pnp.source_last_updated
              from provider_network_participation pnp
              join payer_sources s on s.id = pnp.payer_source_id
              left join payer_networks n on n.id = pnp.network_id
              where pnp.npi = $1 order by s.name limit 100`, [id]),
      health(`select payer, plan_or_network, billing_code, billing_class, negotiated_type, negotiated_rate, place_of_service, as_of
              from provider_rate_signals where npi = $1 order by payer, billing_code limit 100`, [id]),
    ])
    return { ...p, networks, negotiated_rates: rates }
  }],
  ["health/providers", "health", "NPPES", async (_, qs) =>
    health(
      `select npi, org_name, loc_addr1, loc_city, loc_state, zip5, primary_taxonomy
       from nppes_npi where entity_type = 2 and deactivation_date is null and zip5 = $1
       ${qs.q ? "and org_name ilike $3" : ""} order by org_name limit $2`,
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
  return null
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
    return json(200, { endpoints: routes.map(([p, d]) => ({ dataset: d, path: `/v1/${p}` })) })
  }
  const m = match(path)
  if (!m) return json(404, { error: "No such endpoint. GET /v1 lists them." })
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
    console.error(path, e)
    return json(500, { error: "The query failed. It has been logged." })
  }
}
