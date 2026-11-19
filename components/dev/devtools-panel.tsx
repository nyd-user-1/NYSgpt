"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { ArrowLeft, ChevronRight, MessageSquareText, ScanSearch, SlidersHorizontal, SquareDashedMousePointer, Wrench, X } from "lucide-react"

import "./devtools.css"
import { CircleButton } from "@/components/dev/ui/circle-button"
import { DevInspector } from "@/components/dev/inspector"
import { DEVTOOLS_OPEN, HOUSEKEEPING_OPEN, HousekeepingTool, takeDevTools, takeOpen, usePointer } from "@/components/housekeeping/tool"
import { cn } from "@/lib/utils"

// NYSgpt's Dev Tools (2026-11-19): pax-trinity's kit — the inspector dock, sonar (Point and Click), and Dev
// Comments — in a panel of its own. In pax-trinity the kit lives in the app's shell (the header's crosshair)
// and its right-hand panel (components/discussion-panel.tsx, the Dev Tools view); NYSgpt's header and panel
// belong to the home page, so a button at the bottom left opens this panel, and the crosshair and the comment
// marks sit beside the button. The rows, X-ray and the Settings slot are discussion-panel.tsx's, unchanged.
// The root layout mounts this on the dev server alone (components/dev/devtools-mount.tsx).

const HousekeepingView = dynamic(() => import("@/components/housekeeping/view").then((m) => m.HousekeepingView), {
  ssr: false,
  loading: () => <div className="mx-6 my-6 size-5 animate-spin rounded-full border-2 border-slate-300 border-t-(--pax2-blue)" />,
})

/** Opens the dock's classifier or settings in a slot (inspector.tsx listens). */
const INSPECTOR_EMBED = "inspector:embed"
type InspectorPanel = "classifier" | "settings"

type View = "devtools" | "housekeeping" | "devsettings"
const TITLE: Record<View, string> = { devtools: "Dev Tools", housekeeping: "Dev Comments", devsettings: "Settings" }

export function DevTools() {
  const [open, setOpen] = React.useState(false)
  const [view, setView] = React.useState<View>("devtools")

  // Sonar or a page mark asked for Dev Comments: open on it, now or as the panel mounts.
  React.useEffect(() => {
    const go = () => {
      if (!takeOpen()) return
      setView("housekeeping")
      setOpen(true)
    }
    go()
    window.addEventListener(HOUSEKEEPING_OPEN, go)
    return () => window.removeEventListener(HOUSEKEEPING_OPEN, go)
  }, [])
  React.useEffect(() => {
    const go = () => {
      if (!takeDevTools()) return
      setView("devtools")
      setOpen(true)
    }
    go()
    window.addEventListener(DEVTOOLS_OPEN, go)
    return () => window.removeEventListener(DEVTOOLS_OPEN, go)
  }, [])

  return (
    <>
      <div data-chrome className="contents">
        <DevInspector />
      </div>
      <div data-sonar-exempt data-devinspector className="fixed bottom-4 left-4 z-[60] flex items-center gap-2">
        <CircleButton type="button" onClick={() => setOpen((v) => !v)} aria-pressed={open} aria-label={open ? "Close Dev Tools" : "Open Dev Tools"} title="Dev Tools">
          <Wrench className="size-4" />
        </CircleButton>
        <HousekeepingTool />
      </div>
      {open && (
        <section
          data-sonar-exempt
          data-devinspector
          aria-label="Dev Tools"
          className="fixed top-0 right-0 bottom-0 z-[60] flex w-full flex-col border-l border-slate-300 bg-(--pax2-sidebar) font-sans text-slate-900 shadow-(--shadow-e2) sm:w-[420px]"
        >
          <div className="relative z-10 flex min-h-[73px] shrink-0 items-center justify-between gap-3 bg-(--pax2-sidebar) px-6 py-4 shadow-(--shadow-header)">
            <div className="flex min-w-0 items-center gap-2">
              {view !== "devtools" && (
                <button type="button" onClick={() => setView("devtools")} aria-label="Back" className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-(--pax2-lift) hover:text-(--pax2-blue)">
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <p className="truncate text-xl text-slate-900">{TITLE[view]}</p>
            </div>
            <CircleButton type="button" onClick={() => (setOpen(false), setView("devtools"))} aria-label="Close">
              <X className="size-4" />
            </CircleButton>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {view === "devtools" && <DevToolsRows onSettings={() => setView("devsettings")} onComments={() => setView("housekeeping")} />}
            {view === "housekeeping" && <HousekeepingView />}
            {view === "devsettings" && <EmbedSlot view="settings" />}
          </div>
        </section>
      )}
    </>
  )
}

function Row({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 border-b border-slate-200 px-3 py-3 text-left transition-[color,background-color,box-shadow] hover:z-10 hover:bg-(--pax2-lift)/70 hover:shadow-(--shadow-e1)"
    >
      <span className="icon-pop flex size-[18px] shrink-0 items-center justify-center text-slate-500 transition-colors group-hover:text-(--pax2-blue) [&_img]:size-[18px] [&_svg]:size-[18px] [&_svg]:fill-(--pax2-raised) [&_svg]:stroke-[1.75] [&_svg]:transition-colors group-hover:[&_svg]:fill-(--pax2-lavender)">{icon}</span>
      <span className="flex-1">
        <span className="block text-[15px] font-medium text-slate-600 group-hover:text-(--pax2-blue)">{label}</span>
        {sub && <span className="block text-xs text-slate-400">{sub}</span>}
      </span>
      <ChevronRight className="size-4 text-slate-400 group-hover:text-(--pax2-blue)" />
    </button>
  )
}

/**
 * Dev Tools' rows (pax-trinity, Brendan, 2026-11-01): Dev Comments keeps its layer; Point and Click is a
 * switch; X-ray is the dock's classifier as a switch, the panel unfolding beneath it under a skeleton in its
 * shape; Settings keeps the chevron and goes one layer deeper to the dock's switches.
 */
function DevToolsRows({ onSettings, onComments }: { onSettings: () => void; onComments: () => void }) {
  const [onNow, toggle] = usePointer()
  return (
    // data-sonar-exempt + data-devinspector: the rows stay ordinary ground while a mode runs — the
    // standard cursor, clickable — so either mode can always be turned off here.
    <div data-sonar-exempt data-devinspector className="flex min-h-0 flex-1 flex-col px-3 pt-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Row icon={<MessageSquareText />} label="Dev Comments" sub="Comments on the site, for the Claude sessions" onClick={onComments} />
        <ToggleRow icon={<SquareDashedMousePointer />} label="Point and Click" sub="Point, click, and leave edit notes." on={onNow} onToggle={toggle} />
        <XRay />
      </div>
      <div className="shrink-0 border-t border-slate-200">
        <Row icon={<SlidersHorizontal />} label="Settings" sub="The pointer tools' switches" onClick={onSettings} />
      </div>
    </div>
  )
}

/** Row's dress with a switch where the chevron stood. */
function ToggleRow({ icon, label, sub, on, onToggle }: { icon: React.ReactNode; label: string; sub?: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="group relative flex w-full items-center gap-3 border-b border-slate-200 px-3 py-3 text-left transition-[color,background-color,box-shadow] hover:z-10 hover:bg-(--pax2-lift)/70 hover:shadow-(--shadow-e1)"
    >
      <span className="icon-pop flex size-[18px] shrink-0 items-center justify-center text-slate-500 transition-colors group-hover:text-(--pax2-blue) [&_img]:size-[18px] [&_svg]:size-[18px] [&_svg]:fill-(--pax2-raised) [&_svg]:stroke-[1.75] [&_svg]:transition-colors group-hover:[&_svg]:fill-(--pax2-lavender)">{icon}</span>
      <span className="flex-1">
        <span className="block text-[15px] font-medium text-slate-600 group-hover:text-(--pax2-blue)">{label}</span>
        {sub && <span className="block text-xs text-slate-400">{sub}</span>}
      </span>
      <span aria-hidden className={cn("inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors", on ? "bg-(--pax2-light-blue)" : "bg-slate-300")}>
        <span className={cn("size-3 rounded-full bg-(--pax2-surface) shadow-sm transition-transform", on && "translate-x-3")} />
      </span>
    </button>
  )
}

/** X-ray: the dock's classifier under its own switch, the panel beneath the row, a skeleton in its shape first. */
function XRay() {
  const [on, setOn] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const slot = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!on) return
    setLoading(true)
    window.dispatchEvent(new CustomEvent(INSPECTOR_EMBED, { detail: { slot: slot.current, view: "classifier" } }))
    const t = window.setTimeout(() => setLoading(false), 450)
    return () => {
      window.clearTimeout(t)
      window.dispatchEvent(new CustomEvent(INSPECTOR_EMBED, { detail: null }))
    }
  }, [on])
  return (
    <>
      <ToggleRow icon={<ScanSearch />} label="X-ray" sub="Every element on the page, classified in place" on={on} onToggle={() => setOn((v) => !v)} />
      {on && (
        <div className="relative my-2 flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-(--pax2-surface) shadow-(--shadow-e1)">
          <div ref={slot} className="flex min-h-0 flex-1 flex-col overflow-y-auto" />
          {loading && (
            <div aria-hidden className="absolute inset-0 z-10 flex flex-col gap-3 bg-(--pax2-surface) p-4">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-5 w-14 animate-pulse rounded-full bg-slate-200" />
                ))}
              </div>
              {["w-2/3", "w-1/2", "w-5/6", "w-3/5", "w-3/4", "w-1/2", "w-2/3"].map((w, i) => (
                <span key={i} style={{ marginLeft: (i % 3) * 12 }} className={cn("h-3 animate-pulse rounded bg-slate-200", w)} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

/** A dock panel drawn into this view's slot (the dock portals it in; one slot at a time). */
function EmbedSlot({ view }: { view: InspectorPanel }) {
  const slot = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent(INSPECTOR_EMBED, { detail: { slot: slot.current, view } }))
    return () => void window.dispatchEvent(new CustomEvent(INSPECTOR_EMBED, { detail: null }))
  }, [view])
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3">
      <div ref={slot} className="flex min-h-0 flex-1 flex-col overflow-y-auto" />
    </div>
  )
}
