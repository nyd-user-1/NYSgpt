import { neon } from "@neondatabase/serverless"

// The chart of nuclides, as the literature drew it (2026-11-04): every (Z, N) the NSR corpus
// mentions, with how many of its 303,568 references touch it — one GROUP BY over the 1.21M-row
// paper–nuclide layer. Feeds the /charts page's Science popover. ~3,400 rows, cached for an hour
// at the edge; the corpus changes monthly. Where the corpus isn't wired, answers 503 and the
// popover falls back to the card's own stats.

export const dynamic = "force-dynamic"

export async function GET() {
  const url = process.env.NSR_DATABASE_URL
  if (!url) return Response.json({ error: "The NSR corpus is not wired to this deployment." }, { status: 503 })
  try {
    const sql = neon(url)
    const rows = (await sql.query(
      `select n, z, count(*)::int c
       from nsr_nuclides
       where z between 0 and 118 and n between 0 and 200
       group by n, z`,
    )) as { n: number; z: number; c: number }[]
    return Response.json(
      { points: rows.map((r) => [r.n, r.z, r.c]) },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    )
  } catch (e) {
    return Response.json({ error: (e as Error).message.slice(0, 200) }, { status: 503 })
  }
}
