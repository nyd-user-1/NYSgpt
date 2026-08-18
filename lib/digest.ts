import { sql } from '@/lib/db'
import { categoryLabel } from '@/lib/arxiv-categories'

/**
 * The same figures 44b's `scripts/discord-digest.mjs` posts to the channel,
 * read live for the switchboard's Discord drill-down.
 *
 * WHY IT IS COMPUTED HERE AND NOT REPLAYED FROM DISCORD: the channel holds
 * SNAPSHOTS — what was true when the job ran. The panel can answer for right
 * now, off the same tables, so the drill-down is the live version of the post
 * rather than a transcript of it.
 *
 * ⚠ The queries are duplicated from that script ON PURPOSE — three copies now:
 * the worker box's .mjs, 44b's src/app/nysgpt-site/digest.ts, and this file.
 * If you change the shape here, change it there too.
 *
 * Every read is wrapped: nysgpt.com is a marketing surface and must render even
 * when the database is unreachable. A failed query yields zeros, never a 500.
 */

export type DigestTopic = {
  /** The raw arXiv code — still what the Library is queried by. */
  topic: string
  /** "Artificial Intelligence (cs.AI)" — resolved here so the panel stays dumb. */
  label: string
  count: number
  recent: { slug: string; title: string }[]
}
export type Digest = {
  documents24h: number
  totals: { documents: number; patents: number; models: number; benchmarks: number }
  topics: DigestTopic[]
  /** null when the read failed — the UI says so rather than showing a confident 0. */
  ok: boolean
}

const EMPTY: Digest = {
  documents24h: 0,
  totals: { documents: 0, patents: 0, models: 0, benchmarks: 0 },
  topics: [],
  ok: false,
}

/**
 * How many categories to break out, and the floor to be worth breaking out.
 *
 * ⚠ `documents.topics` carries TWO vocabularies since the 2026-07-26 merge:
 * arXiv category codes (`cs.AI`, `stat.ML`) and Semantic Scholar subject tags
 * (`Computer Science`, `Engineering`, `Medicine`). Only the first kind is a
 * category a reader can act on, and they are the ones containing a dot — hence
 * the `LIKE '%.%'` filter. Without it the top of the list is "Computer Science",
 * which is true of nearly every row and therefore says nothing.
 */
const MAX_TOPICS = 6
const MIN_PAPERS = 5

export async function getDigest(): Promise<Digest> {
  try {
    const since = new Date(Date.now() - 24 * 3600e3)

    const [docs, facts, cats] = await Promise.all([
      sql`SELECT count(*)::int AS n FROM documents WHERE created_at >= ${since}`,
      sql`SELECT key, value FROM fact_stats
           WHERE key IN ('documents.listed','patents.total','analysis.models','llmstats.benchmarks')`,
      sql`SELECT t AS topic, count(*)::int AS n
            FROM documents, unnest(topics) AS t
           WHERE created_at >= ${since} AND t LIKE '%.%'
           GROUP BY t HAVING count(*) >= ${MIN_PAPERS}
           ORDER BY n DESC LIMIT ${MAX_TOPICS}`,
    ])

    const f = Object.fromEntries((facts as { key: string; value: string }[]).map(r => [r.key, Number(r.value)]))
    const categories = cats as { topic: string; n: number }[]

    // One five-row read per surviving category, in parallel.
    const recents = await Promise.all(
      categories.map(c => sql`
        SELECT slug, title FROM documents
         WHERE created_at >= ${since} AND ${c.topic} = ANY(topics)
         ORDER BY created_at DESC, slug DESC LIMIT 5`),
    )

    return {
      documents24h: (docs as { n: number }[])[0]?.n ?? 0,
      totals: {
        documents: f['documents.listed'] ?? 0,
        patents: f['patents.total'] ?? 0,
        models: f['analysis.models'] ?? 0,
        benchmarks: f['llmstats.benchmarks'] ?? 0,
      },
      topics: categories.map((c, i) => ({
        topic: c.topic,
        label: categoryLabel(c.topic),
        count: c.n,
        recent: recents[i] as { slug: string; title: string }[],
      })),
      ok: true,
    }
  } catch {
    return EMPTY
  }
}
