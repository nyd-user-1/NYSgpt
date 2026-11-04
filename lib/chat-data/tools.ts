import "server-only"

import { athenaQuery, athenaWired, lit } from "./athena"

// The chat's NSR data tools: the Nuclear Science References corpus (303,568 references — the
// complete NSR dump plus arXiv/APS additions, with the full relational layer), read-only, from the
// lake. Since 2026-11-04 the corpus is parquet in S3 (the Aurora snapshot nsr-final-2026-10-15,
// exported) queried through Athena — Glue database nysgpt_nsr, workgroup nysgpt-chat; see
// athena.ts. Three tools: free SQL for counts, filters and joins; a scored text scan for topical
// questions; one record in full by key number. Without the Athena key the tools answer that the
// corpus is not wired here.

const CAP = 200
/** A payload past this many characters is truncated — tool results ride the model's context. */
const PAYLOAD_CAP = 24_000

const trim = (payload: unknown) => {
  const s = JSON.stringify(payload)
  return s.length <= PAYLOAD_CAP ? payload : { truncated: true, text: s.slice(0, PAYLOAD_CAP) }
}

export const NSR_TOOL_NAMES = ["nsr_sql", "nsr_search", "nsr_record"] as const
export type NsrTool = (typeof NSR_TOOL_NAMES)[number]
export const isDataTool = (name: string): name is NsrTool => (NSR_TOOL_NAMES as readonly string[]).includes(name)

export function dataToolSpecs() {
  return [
    {
      toolSpec: {
        name: "nsr_sql",
        description:
          "Run one read-only SELECT (or WITH … SELECT) against the NSR corpus — Athena, Trino SQL dialect, over parquet. For counts, group-bys, filters and joins across the schema in the system prompt. Rows are capped at 200; write your own ORDER BY and LIMIT for anything ranked. A query takes a few seconds. No writes, no multiple statements.",
        inputSchema: { json: { type: "object", properties: { sql: { type: "string", description: "One SELECT or WITH statement, Trino dialect." } }, required: ["sql"] } },
      },
    },
    {
      toolSpec: {
        name: "nsr_search",
        description:
          "Find NSR references by words in their title, keywords and abstract. A text scan, not semantic search: every term must appear (matched at the start of a word, case-insensitive, so 'fission' also finds 'fissions'); \"quoted phrases\" match as written; OR between two terms accepts either; -term excludes. Ranked by where terms hit (title, then keywords, then abstract), then citations. Pass a few distinctive technical terms, not a sentence — nuclides as NSR writes them ('7Li', '235U'), reactions as '(n,gamma)' or '(n,g)'. Returns up to 20 rows: key_number, year, title, authors, reference, DOI, citations, the abstract's head.",
        inputSchema: { json: { type: "object", properties: { q: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } }, required: ["q"] } },
      },
    },
    {
      toolSpec: {
        name: "nsr_record",
        description:
          "One NSR reference in full by its key number — an NSR key like 2010SC08, or for the arXiv/APS additions the DOI-style key they carry (e.g. 10.48550/arXiv.1501.00018): every descriptive column, the abstract, its nuclides, reactions, subjects and EXFOR links.",
        inputSchema: { json: { type: "object", properties: { key_number: { type: "string" } }, required: ["key_number"] } },
      },
    },
  ]
}

/* ---------- nsr_search: the query, websearch-style, as a scored regex scan ---------- */

const STOP = new Set(["a", "an", "the", "of", "on", "in", "for", "and", "to", "with", "by", "at", "from", "about", "as", "is", "are", "using", "via", "papers", "paper"])
/** Lowercased, LaTeX markup stripped — titles and abstracts write nuclides as $^{7}$Li. */
const norm = (s: string) => s.toLowerCase().replace(/[$^{}_\\]/g, "").replace(/\s+/g, " ").trim()
/** A term as a word-start regex (punctuation-led terms like "(n,g)" match anywhere). */
const termRe = (t: string) => (/^[a-z0-9]/.test(t) ? "(^|[^a-z0-9])" : "") + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")

function parseSearch(q: string): { groups: string[][]; neg: string[] } {
  const groups: string[][] = []
  const neg: string[] = []
  let orNext = false
  for (const m of q.matchAll(/(-?)"([^"]*)"|(\S+)/g)) {
    let text: string
    let negative = false
    if (m[2] !== undefined) {
      negative = m[1] === "-"
      text = norm(m[2])
    } else {
      const w = m[3]
      if (/^or$/i.test(w)) {
        orNext = groups.length > 0
        continue
      }
      negative = w.length > 1 && w.startsWith("-")
      text = norm((negative ? w.slice(1) : w).replace(/[,;:!?.]+$/, ""))
      if (STOP.has(text)) continue
    }
    if (text.length < 2) continue
    if (negative) neg.push(text)
    else if (orNext) groups[groups.length - 1].push(text)
    else groups.push([text])
    orNext = false
  }
  return { groups: groups.slice(0, 8), neg: neg.slice(0, 4) }
}

function searchSql(q: string, limit: number): string | null {
  const { groups, neg } = parseSearch(q)
  if (!groups.length) return null
  const any = (re: string) => `(regexp_like(t, ${lit(re)}) OR regexp_like(k, ${lit(re)}) OR regexp_like(a, ${lit(re)}))`
  const score = groups
    .flat()
    .map(termRe)
    .map((re) => `if(regexp_like(t, ${lit(re)}), 3, 0) + if(regexp_like(k, ${lit(re)}), 2, 0) + if(regexp_like(a, ${lit(re)}), 1, 0)`)
    .join(" + ")
  const where = [...groups.map((g) => `(${g.map((t) => any(termRe(t))).join(" OR ")})`), ...neg.map((t) => `NOT ${any(termRe(t))}`)].join("\n    AND ")
  return `WITH c AS (
  SELECT key_number, pub_year, title, authors, reference, doi, citation_count, substr(abstract, 1, 300) AS abstract_head,
         regexp_replace(lower(coalesce(title, '')), '[$^{}_\\\\]', '') AS t,
         lower(coalesce(keywords, '') || ' ' || coalesce(array_join(reactions, ' '), '')) AS k,
         regexp_replace(lower(coalesce(abstract, '')), '[$^{}_\\\\]', '') AS a
  FROM nsr
)
SELECT key_number, pub_year, title, authors, reference, doi, citation_count, abstract_head, ${score} AS score
FROM c
WHERE ${where}
ORDER BY score DESC, citation_count DESC NULLS LAST, key_number
LIMIT ${limit}`
}

/* ---------- the runner ---------- */

/** One statement, ending in a LIMIT — appended when the statement has none at its end. */
function capped(raw: string): string {
  const body = raw.replace(/(\s*--[^\n]*)+$/, "").trimEnd()
  return /\b(limit\s+(\d+|all)|fetch\s+(first|next)\s+\d*\s*rows?\s+only)$/i.test(body) ? body : `${body}\nLIMIT ${CAP}`
}

const ARRAYS = ["nuclides", "reactions", "subjects", "topics"] as const

export async function runDataTool(name: NsrTool, input: Record<string, unknown>): Promise<{ ok: boolean; payload: unknown }> {
  if (!athenaWired()) return { ok: false, payload: { error: "The NSR corpus is not wired to this deployment (the Athena key is unset)." } }
  try {
    if (name === "nsr_sql") {
      const raw = String(input.sql ?? "").trim().replace(/;\s*$/, "")
      if (!raw || raw.length > 6000) return { ok: false, payload: { error: "One statement, under 6000 characters." } }
      if (raw.includes(";")) return { ok: false, payload: { error: "One statement only — no semicolons." } }
      if (!/^[\s(]*(select|with)\b/i.test(raw)) return { ok: false, payload: { error: "SELECT (or WITH … SELECT) only — the corpus is read-only here." } }
      const { rows, more } = await athenaQuery(capped(raw), { maxRows: CAP })
      return { ok: true, payload: trim({ rows, count: rows.length, capped: more || rows.length >= CAP }) }
    }
    if (name === "nsr_search") {
      const q = String(input.q ?? "").trim()
      const limit = Math.min(20, Math.max(1, Number(input.limit ?? 10) || 10))
      const sql = q.length >= 2 ? searchSql(q, limit) : null
      if (!sql) return { ok: false, payload: { error: "Give a few distinctive words to search for." } }
      const { rows } = await athenaQuery(sql, { maxRows: limit })
      return { ok: true, payload: trim({ records: rows, count: rows.length }) }
    }
    // nsr_record — NSR keys are uppercase (2010SC08); the additions carry DOI-style keys, kept as given.
    let key = String(input.key_number ?? "").trim()
    if (/^[A-Za-z0-9]{4,12}$/.test(key)) key = key.toUpperCase()
    else if (!/^10\.\d{4,9}\/[A-Za-z0-9.\/_:()-]{1,80}$/.test(key)) return { ok: false, payload: { error: "A key number looks like 2010SC08 (or 10.48550/arXiv.1501.00018 for an arXiv addition)." } }
    const { rows } = await athenaQuery(
      `SELECT key_number, pub_year, reference, authors, title, doi, venue, publication_date, reference_type, journal_code,
              keywords, substr(abstract, 1, 2400) AS abstract, tldr, citation_count, influential_citation_count, reference_count,
              ${ARRAYS.map((c) => `json_format(CAST(${c} AS json)) AS ${c}`).join(", ")},
              exfor_keys, arxiv_id, is_open_access, open_access_pdf_url, is_nsr
       FROM nsr WHERE key_number = ${lit(key)}`,
      { maxRows: 1 },
    )
    const row = rows[0]
    if (!row) return { ok: false, payload: { error: `No reference is keyed ${key}.` } }
    for (const c of ARRAYS) if (typeof row[c] === "string") row[c] = JSON.parse(row[c] as string)
    return { ok: true, payload: trim(row) }
  } catch (e) {
    return { ok: false, payload: { error: (e as Error).message.slice(0, 400) } }
  }
}

/** Whether this deployment can reach the corpus at all (the route folds the schema in only then). */
export const nsrWired = athenaWired

/** The corpus as the system prompt teaches it: what it is, the tables that matter, the dialect, the rules. */
export function nsrPrompt(): string {
  return `=== THE NSR CORPUS (data tools) ===
I hold the Nuclear Science References corpus: 303,568 references — the complete NSR dump (255,315 entries, parity with NNDC's monthly archival) plus arXiv/APS additions — enriched from Semantic Scholar and OpenAlex, with the full relational layer. It sits in my data lake as parquet, queried through Athena. Three tools reach it: nsr_sql (one read-only SELECT), nsr_search (a scored word scan over title, keywords and abstract), nsr_record (one reference by key number). Use nsr_search for "papers about…", nsr_sql for counts, trends, joins and rankings, nsr_record to read one paper closely. Rows cap at 200 — aggregate in SQL rather than paging raw rows. Each call takes a few seconds, so plan the query before running it.

nsr_sql speaks Trino SQL (Athena engine 3), not Postgres:
- Strings in 'single quotes', identifiers in "double quotes". String comparison is case-sensitive: lower(title) LIKE '%…%' or regexp_like(lower(title), '…'). No ILIKE, no :: casts (CAST(x AS integer), try_cast), no DISTINCT ON, no full-text search functions.
- Arrays (nuclides, reactions, subjects, topics, fields_of_study, z_values on nsr): contains(nuclides, '137Cs'), cardinality(reactions), CROSS JOIN UNNEST(subjects) AS u(subject).
- JSON columns are JSON text: json_extract_scalar(col, '$.field'), CAST(json_parse(col) AS array(varchar)).
- Useful: count_if(cond), approx_distinct, approx_percentile, corr, array_agg, array_join, year(date), date_trunc. ORDER BY … NULLS LAST works.

Tables (database nysgpt_nsr) and the columns that matter:
- nsr (303,568): key_number, pub_year int, reference, authors (text), title, doi, abstract, tldr, keywords, venue, publication_date (text 'YYYY-MM-DD'), entry_date date, reference_type, journal_code, citation_count, influential_citation_count, reference_count, openalex_cited_by, nuclides array, reactions array, z_values array(integer), subjects array, topics array, fields_of_study array, exfor_keys (text), arxiv_id, is_open_access, oa_status, is_nsr (false = arXiv/APS addition), collaborations/authors_json/openalex_topics (JSON text). Nuclides read '137Cs' (mass then symbol), reactions '(N,G)' (uppercase). Titles and abstracts carry LaTeX ('$^{7}$Li'). NSR keys read 2010SC08; the additions are keyed by DOI.
- nsr_authors (1.40M): key_number, author_key bigint, order_index → authors (128,190): author_key, initial1, initial2, last_name. Author queries join these, not nsr.authors.
- nsr_nuclides (1.21M): key_number, z, n, a, element_symbol, element_name — the typed nuclide layer; prefer it for physics filters (by Z, N, A).
- nsr_reactions (229k): key_number, reaction_code → reaction_dict (9,323): reaction_code, incident_particle, outgoing_particles (JSON text array), is_fission, is_polarized, is_charge_exchange, delta_z, delta_n, delta_a.
- nsr_subjects (687k): key_number, subject_code → subject_dict (~575): subject_code, description.
- nsr_topics (214k): key_number, topic (free-text topic labels).
- nsr_exfor (23,515): key_number, exfor_id → exfor_entries (27,070): exfor_id, title, year, authors, reactions (JSON text array), num_subentries.
- journals (606): journal_code, title, min_year, max_year.
- nuclide_dict (10,043): nuclide_code, z, n, a, element. ensdf_datasets/ensdf_refs and xundl_datasets/xundl_refs link evaluated/unevaluated datasets to key_numbers; endf_reports holds report metadata.

Rules: read-only; one statement per nsr_sql call. Name the scope with every figure — "of the 303,568 references in my NSR corpus…" — and never pass a corpus count off as all of nuclear science. Cite papers by key_number and link nothing (the corpus pages are not public). When a lookup returns nothing, say so plainly rather than estimating.
=== END NSR ===`
}
