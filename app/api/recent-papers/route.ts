import { NextResponse } from 'next/server'
import { getRecentPapers } from '@/lib/recent-papers'

/**
 * GET /api/recent-papers?page=N → { page, cards: HomeCardData[] }
 *
 * Read by the homepage Refresh (app/HomeContents.tsx). Edge-cached for five
 * minutes — the harvest is nightly, so a page is identical for hours; the
 * cache is what keeps a click from being a corpus query.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const page = Math.max(0, Number(new URL(req.url).searchParams.get('page')) || 0)
  const cards = await getRecentPapers(page)
  return NextResponse.json(
    { page, cards },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
  )
}
