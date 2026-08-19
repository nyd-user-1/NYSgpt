import { sql } from '@/lib/db'
import { categoryName } from '@/lib/arxiv-categories'
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
 * ten at a time on the same ordering. published_date still matters — it is
 * what the card's footer prints.
 *
 * ── The card shape (2026-08-18 ruling)
 * Resting: index, title, and a "Published January 10, 2026" footer — no body
 * under the title, so a paper cell never outgrows the 210px product cell and
 * the plate holds ~425px. Hover/tap: the description (authors — category.
 * abstract…) wipes in (RevealFx) where the products count their figure up. Category
 * codes render as proper names ("Machine Learning", not "cs.LG"); duplicate
 * names across codes were ruled acceptable here.
 *
 * Every read is wrapped: a failure yields [] and the client keeps the plate it
 * had. Never a 500 from a marketing surface.
 */

export const PAPERS_PER_PAGE = 10

/** The 44B accent — every paper card links into 44b, so they carry its colour. */
const PAPER_ACCENT = '#033882'
const BODY_CHARS = 150

type Row = {
  slug: string
  title: string
  developer: string | null
  category: string | null
  abstract: string | null
  published: string // 'YYYY-MM-DD', via to_char — never null (COALESCEd)
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** '2026-01-10' → 'January 10, 2026'. String math, not Date — a bare ISO date
 *  fed to `new Date` parses as UTC midnight and prints a day early in NY. */
function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

function snippet(text: string | null, max: number): string {
  if (!text) return ''
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.]$/, '') + '…'
}

export async function getRecentPapers(page = 0): Promise<HomeCardData[]> {
  const offset = Math.max(0, Math.floor(page)) * PAPERS_PER_PAGE
  try {
    // Ids first, bodies second: sorting the whole row would drag every
    // paper's jsonb through the sort. Backed by idx_documents_paper_created
    // (created_at DESC, id DESC) WHERE doc_type='paper' — added 2026-08-18.
    const rows = (await sql`WITH recent AS (
           SELECT id, created_at FROM documents
            WHERE doc_type = 'paper'
            ORDER BY created_at DESC, id DESC
            LIMIT ${PAPERS_PER_PAGE} OFFSET ${offset})
         SELECT d.slug, d.title, d.developer, d.topics[1] AS category,
                d.body_json->0->'paragraphs'->>0 AS abstract,
                to_char(COALESCE(d.published_date, d.created_at), 'YYYY-MM-DD') AS published
           FROM documents d JOIN recent r USING (id)
          ORDER BY r.created_at DESC, d.id DESC`) as unknown as Row[]
    return rows.map(r => {
      const authors = r.developer?.trim() || 'arXiv'
      const label = r.category ? categoryName(r.category) : ''
      return {
        href: `https://44b.nysgpt.com/library/${r.slug}`,
        title: r.title,
        accent: PAPER_ACCENT,
        body: `${authors}${label ? ` — ${label}.` : ' —'} ${snippet(r.abstract, BODY_CHARS)}`.trim(),
        value: 0, // papers don't count anything; HomeCard's paper variant never renders the figure
        unit: '',
        footer: `Published ${longDate(r.published)}`,
        sameTab: true,
      }
    })
  } catch (err) {
    console.error('[recent-papers] read failed', err)
    return []
  }
}
