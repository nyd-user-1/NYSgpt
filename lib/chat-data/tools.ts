import "server-only"

import { neon } from "@neondatabase/serverless"

// The chat's NSR data tools (2026-11-04): the Nuclear Science References corpus in Neon
// (303,568 references — the complete NSR dump plus arXiv/APS additions, with the full relational
// layer), read-only, over the serverless HTTP driver. Three tools: free SQL for counts, filters
// and joins; weighted full-text search for topical relevance; one record in full by key number.
// NSR_DATABASE_URL carries the connection string; without it the tools answer that the corpus is
// not wired here.

const sql = () => {
  const url = process.env.NSR_DATABASE_URL
  return url ? neon(url) : null
}

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
          "Run one read-only SQL SELECT (or WITH … SELECT) against the NSR corpus in Postgres. For counts, group-bys, filters and joins across the schema in the system prompt. Rows are capped at 200; write your own LIMIT and ORDER BY for anything ranked. No writes, no multiple statements.",
        inputSchema: { json: { type: "object", properties: { sql: { type: "string", description: "One SELECT or WITH statement." } }, required: ["sql"] } },
      },
    },
    {
      toolSpec: {
        name: "nsr_search",
        description:
          "Weighted full-text search over the NSR references (title, keywords, abstract). For topical questions — 'papers about X'. Returns up to 20 rows: key_number, year, title, authors, reference, DOI, citations, the abstract's head.",
        inputSchema: { json: { type: "object", properties: { q: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } }, required: ["q"] } },
      },
    },
    {
      toolSpec: {
        name: "nsr_record",
        description: "One NSR reference in full by its key number (e.g. 2010SC08): every descriptive column, the abstract, its nuclides, reactions, subjects and EXFOR links.",
        inputSchema: { json: { type: "object", properties: { key_number: { type: "string" } }, required: ["key_number"] } },
      },
    },
  ]
}

export async function runDataTool(name: NsrTool, input: Record<string, unknown>): Promise<{ ok: boolean; payload: unknown }> {
  const db = sql()
  if (!db) return { ok: false, payload: { error: "The NSR corpus is not wired to this deployment (NSR_DATABASE_URL is unset)." } }
  try {
    if (name === "nsr_sql") {
      const raw = String(input.sql ?? "").trim().replace(/;\s*$/, "")
      if (!raw || raw.length > 6000) return { ok: false, payload: { error: "One statement, under 6000 characters." } }
      if (raw.includes(";")) return { ok: false, payload: { error: "One statement only — no semicolons." } }
      if (!/^\s*(select|with)\b/i.test(raw)) return { ok: false, payload: { error: "SELECT (or WITH … SELECT) only — the corpus is read-only here." } }
      // The wrapper is the row cap; the statement keeps its own ORDER BY and LIMIT inside.
      const rows = await db.query(`select * from (${raw}) q limit ${CAP}`)
      return { ok: true, payload: trim({ rows, count: rows.length, capped: rows.length === CAP }) }
    }
    if (name === "nsr_search") {
      const q = String(input.q ?? "").trim()
      if (q.length < 2) return { ok: false, payload: { error: "Give a few words to search for." } }
      const limit = Math.min(20, Math.max(1, Number(input.limit ?? 10) || 10))
      const rows = await db.query(
        `select key_number, pub_year, title, authors, reference, doi, citation_count, left(abstract, 300) as abstract_head,
                round(ts_rank_cd(fts, websearch_to_tsquery('english', $1))::numeric, 4) as rank
         from nsr
         where fts @@ websearch_to_tsquery('english', $1)
         order by ts_rank_cd(fts, websearch_to_tsquery('english', $1)) desc, citation_count desc nulls last
         limit ${limit}`,
        [q],
      )
      return { ok: true, payload: trim({ records: rows, count: rows.length }) }
    }
    // nsr_record
    const key = String(input.key_number ?? "").trim().toUpperCase()
    if (!/^[A-Z0-9]{4,12}$/.test(key)) return { ok: false, payload: { error: "A key number looks like 2010SC08." } }
    const rows = await db.query(
      `select key_number, pub_year, reference, authors, title, doi, venue, publication_date, reference_type, journal_code,
              keywords, left(abstract, 2400) as abstract, tldr, citation_count, influential_citation_count, reference_count,
              nuclides, reactions, subjects, topics, exfor_keys, arxiv_id, is_open_access, open_access_pdf_url, is_nsr
       from nsr where key_number = $1`,
      [key],
    )
    if (!rows[0]) return { ok: false, payload: { error: `No reference is keyed ${key}.` } }
    return { ok: true, payload: trim(rows[0]) }
  } catch (e) {
    return { ok: false, payload: { error: (e as Error).message.slice(0, 400) } }
  }
}

/** Whether this deployment can reach the corpus at all (the route folds the schema in only then). */
export const nsrWired = () => !!process.env.NSR_DATABASE_URL

/** The corpus as the system prompt teaches it: what it is, the tables that matter, the rules. */
export function nsrPrompt(): string {
  return `=== THE NSR CORPUS (data tools) ===
I hold the Nuclear Science References corpus in Postgres: 303,568 references — the complete NSR dump (255,315 entries, parity with NNDC's monthly archival) plus arXiv/APS additions — enriched from Semantic Scholar and OpenAlex, with the full relational layer. Three tools reach it: nsr_sql (one read-only SELECT), nsr_search (weighted full-text relevance), nsr_record (one reference by key number). Use nsr_search for "papers about…", nsr_sql for counts, trends, joins and rankings, nsr_record to read one paper closely. Rows cap at 200 — aggregate in SQL rather than paging raw rows.

Tables and the columns that matter (public schema, Postgres):
- nsr (~303,568): key_number, pub_year, reference, authors (text), title, doi, abstract, tldr, keywords, venue, publication_date, reference_type, journal_code, citation_count, influential_citation_count, reference_count, nuclides text[], reactions text[], z_values int[], subjects text[], topics text[], exfor_keys, arxiv_id, is_open_access, is_nsr (false = arXiv/APS addition), entry_date, fts tsvector. Nuclides are stored as '137Cs' (mass then symbol).
- nsr_authors (~1.40M): key_number, author_key, order_index → authors (~128k): author_key, initial1, initial2, last_name. Author queries join these, not nsr.authors.
- nsr_nuclides (~1.21M): key_number, z, n, a, element_symbol, element_name — the typed nuclide layer; prefer it over the array for physics filters (by Z, N, A).
- nsr_reactions (~229k): key_number, reaction_code → reaction_dict (~9.3k): reaction_code, incident_particle, outgoing_particles, is_fission, is_polarized, delta_z/n/a.
- nsr_subjects (~687k): key_number, subject_code → subject_dict (~575): subject_code, description.
- nsr_topics (~214k): key_number, topic (free-text topic labels).
- nsr_exfor (~23.5k): key_number, exfor_id → exfor_entries (~27k): exfor_id, title, year, authors, reactions jsonb.
- journals (~606): journal_code, title, min_year, max_year.
- nuclide_dict (~10k): nuclide_code, z, n, a, element. ensdf_datasets/ensdf_refs and xundl_datasets/xundl_refs link evaluated/unevaluated datasets to key_numbers; endf_reports holds report metadata.

Rules: read-only; one statement per nsr_sql call. Name the scope with every figure — "of the 303,568 references in my NSR corpus…" — and never pass a corpus count off as all of nuclear science. Cite papers by key_number and link nothing (the corpus pages are not public). When a lookup returns nothing, say so plainly rather than estimating.
=== END NSR ===`
}
