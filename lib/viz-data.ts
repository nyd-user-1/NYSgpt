import "server-only"

import { neon } from "@neondatabase/serverless"

// The /viz pages' datasets (Brendan's eleven, 2026-11-04): one query per chart, all read-only
// over the NSR corpus on Neon (the stopgap serving copy; the lake parquet is the durable home).
// Every function answers [] quietly where the corpus isn't wired, so a page renders its
// explainer instead of a 500.

const sql = () => {
  const url = process.env.NSR_DATABASE_URL
  return url ? neon(url) : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const q = async <T = any>(text: string): Promise<T[]> => {
  const db = sql()
  if (!db) return []
  try {
    return (await db.query(text)) as T[]
  } catch {
    return []
  }
}

/** The nuclide field: every (N, Z) the literature touches, with its paper count. ~7,800 rows. */
export const nuclideField = () =>
  q<{ n: number; z: number; c: number }>(
    `select n, z, count(*)::int c from nsr_nuclides
     where z between 0 and 118 and n between 0 and 200 group by n, z`,
  )

/** Nuclides with their names, for the big bar run: 137Cs over its paper count. */
export const nuclideBars = () =>
  q<{ a: number; sym: string; c: number }>(
    `select a, element_symbol sym, count(*)::int c from nsr_nuclides
     where z between 1 and 118 and a between 1 and 320 and element_symbol is not null
     group by a, element_symbol order by c desc`,
  )

/** The corpus by year, and the slice of it that flowed into EXFOR as measured data —
 *  the rainfall and the river. Two cheap group-bys. */
export async function perYear() {
  const papers = await q<{ y: number; c: number }>(
    `select pub_year y, count(*)::int c from nsr where pub_year between 1900 and 2026 group by pub_year order by pub_year`,
  )
  const exfor = await q<{ y: number; c: number }>(
    `select s.pub_year y, count(distinct s.key_number)::int c
     from nsr s join nsr_exfor x on x.key_number = s.key_number
     where s.pub_year between 1900 and 2026 group by s.pub_year order by s.pub_year`,
  )
  return { papers, exfor }
}

/** A sample of papers for the two-group scatter: year × citations, NSR vs the arXiv/APS additions. */
export const paperScatter = () =>
  q<{ y: number; c: number; nsr: boolean }>(
    `select pub_year y, citation_count c, is_nsr nsr from nsr
     where citation_count > 0 and pub_year between 1950 and 2026
     order by random() limit 12000`,
  )

/** A sample of papers in three measures, for the 3D dataset scatter. */
export const paperTriples = () =>
  q<{ y: number; refs: number; cites: number; nsr: boolean }>(
    `select pub_year y, reference_count refs, citation_count cites, is_nsr nsr from nsr
     where citation_count > 0 and reference_count > 0 and pub_year between 1950 and 2026
     order by random() limit 10000`,
  )

/** Reaction flow: for each nuclide the literature pairs with a reaction, the (ΔN, ΔZ) the
 *  reaction's code carries — a trajectory on the chart of nuclides, weighted by paper count.
 *  Paper-level pairing (every nuclide × every reaction a paper carries), so it sketches the flow
 *  rather than measures it. */
export const reactionFlows = () =>
  q<{ n: number; z: number; dn: number; dz: number; w: number }>(
    `select nn.n, nn.z, rd.delta_n dn, rd.delta_z dz, count(*)::int w
     from nsr_reactions nr
     join reaction_dict rd on rd.reaction_code = nr.reaction_code
     join nsr_nuclides nn on nn.key_number = nr.key_number
     where rd.delta_n is not null and rd.delta_z is not null
       and not (rd.delta_n = 0 and rd.delta_z = 0)
       and abs(rd.delta_n) <= 12 and abs(rd.delta_z) <= 12
       and nn.z between 1 and 110 and nn.n between 0 and 170
     group by nn.n, nn.z, rd.delta_n, rd.delta_z
     order by w desc limit 20000`,
  )

/** Co-authorship among the most-published authors: nodes with their paper counts, edges where two
 *  of them share at least three papers. */
export async function authorGraph() {
  const nodes = await q<{ id: number; name: string; c: number }>(
    `select a.author_key id, trim(coalesce(a.initial1 || '.', '') || coalesce(a.initial2 || '.', '') || ' ' || a.last_name) name, x.c
     from (select author_key, count(*)::int c from nsr_authors group by author_key order by c desc limit 1200) x
     join authors a on a.author_key = x.author_key`,
  )
  if (!nodes.length) return { nodes: [], edges: [] }
  const edges = await q<{ s: number; t: number; w: number }>(
    `with top as (select author_key from nsr_authors group by author_key order by count(*) desc limit 1200)
     select a1.author_key s, a2.author_key t, count(*)::int w
     from nsr_authors a1
     join nsr_authors a2 on a2.key_number = a1.key_number and a2.author_key > a1.author_key
     where a1.author_key in (select author_key from top)
       and a2.author_key in (select author_key from top)
     group by a1.author_key, a2.author_key
     having count(*) >= 4`,
  )
  return { nodes, edges }
}

/** The measure matrix: Pearson correlations, computed in the database, across nine per-paper
 *  measures of the whole corpus — year, citations, influential citations, references carried,
 *  authors, nuclides, reactions, subjects, and whether the paper flowed into EXFOR. ~12s: five
 *  grouped joins and 36 corr() aggregates over 303,568 rows. */
export async function measureMatrix(): Promise<{ vars: string[]; cells: [number, number, number][] }> {
  const VARS = ["yr", "cites", "infl", "refs", "authors", "nuclides", "reactions", "subjects", "exfor"]
  const pairs: string[] = []
  for (let i = 0; i < VARS.length; i++) for (let j = i + 1; j < VARS.length; j++) pairs.push(`corr(${VARS[i]}, ${VARS[j]}) as "${VARS[i]}__${VARS[j]}"`)
  const rows = await q<Record<string, number | null>>(
    `with f as (
       select s.pub_year::float as yr,
              coalesce(s.citation_count, 0)::float cites,
              coalesce(s.influential_citation_count, 0)::float infl,
              coalesce(s.reference_count, 0)::float refs,
              coalesce(a.c, 0)::float authors,
              coalesce(nn.c, 0)::float nuclides,
              coalesce(r.c, 0)::float reactions,
              coalesce(sub.c, 0)::float subjects,
              (x.key_number is not null)::int::float exfor
       from nsr s
       left join (select key_number, count(*) c from nsr_authors group by 1) a using (key_number)
       left join (select key_number, count(*) c from nsr_nuclides group by 1) nn using (key_number)
       left join (select key_number, count(*) c from nsr_reactions group by 1) r using (key_number)
       left join (select key_number, count(*) c from nsr_subjects group by 1) sub using (key_number)
       left join (select distinct key_number from nsr_exfor) x using (key_number)
       where s.pub_year between 1900 and 2026
     )
     select ${pairs.join(", ")} from f`,
  )
  const row = rows[0] ?? {}
  const cells: [number, number, number][] = VARS.map((_, i) => [i, i, 1] as [number, number, number])
  for (let i = 0; i < VARS.length; i++)
    for (let j = i + 1; j < VARS.length; j++) {
      const v = Number(row[`${VARS[i]}__${VARS[j]}`] ?? 0)
      cells.push([i, j, v], [j, i, v])
    }
  return { vars: VARS, cells }
}
