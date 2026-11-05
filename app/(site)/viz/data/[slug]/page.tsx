import { notFound } from "next/navigation"

import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge"
import { DataTable } from "@/components/viz/DataTable"
import { VIZ_TABLES } from "@/lib/viz-tables"

// A chart's data, one table per /viz chart (2026-11-04): what a click on the chart opens in the second
// panel. Static — the twelve pages prerender, and the rows load in the browser from the snapshot.

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(VIZ_TABLES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: `${VIZ_TABLES[slug]?.title ?? "Chart"} — data` }
}

export default async function VizDataPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const t = VIZ_TABLES[slug]
  if (!t) notFound()
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar text-[var(--paper-text)]" style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}>
        {/* The second panel's header names the page; standalone, this does. */}
        <h1 data-chrome className="px-6 pt-2 text-[26px] leading-[1.1]" style={{ fontFamily: "var(--font-display), Georgia, serif", letterSpacing: "-0.02em" }}>
          {t.title}
        </h1>
      <DataTable slug={slug} />
    </div>
  )
}
