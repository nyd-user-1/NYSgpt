import { sql } from '@/lib/db'
import { categoryLabel } from '@/lib/arxiv-categories'
import type { HomeCardData } from '@/lib/home-data'

/**
 * The homepage "Refresh": the ten most recently harvested papers in the 44b
 * Library, shaped as contents-plate cards so they drop into the same grid as
 * the ten products.
 *
 * ── Read from the corpus DB, not from 44b's API
 * nysgpt.com already reads the 44b corpus (see lib/db.ts, lib/digest.ts).
 * A paper card only needs what's on the `documents` row, so this is one query
 * against the same connection — no cross-repo dependency, no HTTP hop.
 *
 * ── "Recently added" = created_at, not published_date
 * created_at is when the nightly harvest wrote the row (~350 papers/night);
 * published_date is arXiv's date, which the harvest catches a day or two late
 * and which the 07-28 bulk load would otherwise dominate. `page` walks back
 * ten at a time on the same ordering.
 *
 * ── The hover figure
 * The product cards reveal a headline count on hover. A paper has no obvious
 * count of its own, so each card shows how many papers in ITS primary arXiv
 * category the harvest added in the last 14 days — a real, varied figure that
 * says how busy that corner of the corpus is. 14 days sits inside the nightly
 * cadence and outside the bulk load.
 *
 * Every read is wrapped: a failure yields [] and the client keeps the plate it
 * had. Never a 500 from a marketing surface.
 */

export const PAPERS_PER_PAGE = 10

/** The 44B accent — every paper card links into 44b, so they carry its colour. */
const PAPER_ACCENT = '#033882'
const CATEGORY_WINDOW_DAYS = 14
const BODY_CHARS = 150

type Row = {
  slug: string
  title: string
  developer: string | null
  category: string | null
  abstract: string | null
}
type CatRow = { category: string; n: number }

function snippet(text: string | null, max: number): string {
  if (!text) return ''
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.]$/, '') + '…'
}

export async function getRecentPapers(page = 0): Promise<HomeCardData[]> {
  const offset = Math.max(0, Math.floor(page)) * PAPERS_PER_PAGE
  const since = new Date(Date.now() - CATEGORY_WINDOW_DAYS * 24 * 3600e3)
  try {
    const [rows, cats] = await Promise.all([
      // Ids first, bodies second: sorting the whole row would drag every
      // paper's jsonb through the sort. Backed by idx_documents_paper_created
      // (created_at DESC, id DESC) WHERE doc_type='paper' — added 2026-08-18.
      sql`WITH recent AS (
             SELECT id, created_at FROM documents
              WHERE doc_type = 'paper'
              ORDER BY created_at DESC, id DESC
              LIMIT ${PAPERS_PER_PAGE} OFFSET ${offset})
           SELECT d.slug, d.title, d.developer, d.topics[1] AS category,
                  d.body_json->0->'paragraphs'->>0 AS abstract
             FROM documents d JOIN recent r USING (id)
            ORDER BY r.created_at DESC, d.id DESC` as unknown as Promise<Row[]>,
      sql`SELECT topics[1] AS category, count(*)::int AS n
            FROM documents
           WHERE doc_type = 'paper' AND created_at >= ${since} AND topics[1] IS NOT NULL
           GROUP BY 1` as unknown as Promise<CatRow[]>,
    ])
    const byCat = new Map(cats.map(c => [c.category, c.n]))
    return rows.map(r => {
      const cat = r.category ?? ''
      const authors = r.developer?.trim() || 'arXiv'
      const label = cat ? categoryLabel(cat) : 'Uncategorised'
      return {
        href: `https://44b.nysgpt.com/library/${r.slug}`,
        title: r.title,
        accent: PAPER_ACCENT,
        body: `${authors} — ${label}. ${snippet(r.abstract, BODY_CHARS)}`.trim(),
        value: byCat.get(cat) ?? 0,
        unit: cat ? `${cat} · ${CATEGORY_WINDOW_DAYS} days` : 'Papers',
        sameTab: true,
      }
    })
  } catch (err) {
    console.error('[recent-papers] read failed', err)
    return []
  }
}
