import { AppLayout } from "@/components/AppLayout"
import { BoxView } from "@/components/BoxView"
import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge"
import { SWITCHBOARD } from "@/lib/home-data"
import { boxSlug } from "@/lib/pane"

// A box's page (2026-11-04): the boxes open in the second panel, and the panel shows this app's own pages,
// so each box has one — the switchboard's view of it, headed by its name.

export function generateStaticParams() {
  return [...new Set(SWITCHBOARD.map((c) => boxSlug(c.title)))].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: SWITCHBOARD.find((c) => boxSlug(c.title) === slug)?.title ?? "Box" }
}

export default async function BoxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <AppLayout paperMode>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}>
        <BoxView slug={slug} />
      </div>
    </AppLayout>
  )
}
