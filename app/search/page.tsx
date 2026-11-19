import { AppLayout } from "@/components/AppLayout"
import { SearchApp } from "@/components/search/search-app"
import "@/app/home.css"
import "@/components/search/search.css"

// /search (brief 53): find any table, field, database or box the site holds, and try it. ?pick=<box key, or
// table:<stored name>, or db:<database>>&view=api opens on that thing (the home page's Try API, shared links, the
// palette's commands). The working parts live in components/search, so the chat page can host them later.

export const metadata = { title: "Search" }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ pick?: string; view?: string }> }) {
  const { pick, view } = await searchParams
  const v = view === "api" || view === "fields" || view === "data" || view === "chart" ? view : null
  return (
    <AppLayout paperMode>
      <SearchApp pick={pick ?? null} view={v} />
    </AppLayout>
  )
}
