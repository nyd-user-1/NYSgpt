"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import "./devtools.css"
import { PANEL_ROW } from "@/components/SwitchboardPanel"
import { usePointer } from "@/components/housekeeping/tool"
import { cn } from "@/lib/utils"
import type { DevToolsSub } from "./devtools-slots"

// The switchboard's Dev Tools entry (2026-11-19): the dev tools' menu and the views it opens, in the right
// panel under the panel's own header, search and footer. The menu rows are the panel's rows (PANEL_ROW in
// components/SwitchboardPanel.tsx). The views are the kit's: Dev Comments (components/housekeeping/view.tsx),
// X-ray (the inspector's classifier, drawn into a slot under its row) and Settings (the inspector's switches).
// The switchboard renders this on the dev server alone (components/dev/devtools-slots.tsx).

const HousekeepingView = dynamic(() => import("@/components/housekeeping/view").then((m) => m.HousekeepingView), {
  ssr: false,
  loading: () => <div className="mx-6 my-6 size-5 animate-spin rounded-full border-2 border-slate-300 border-t-(--pax2-blue)" />,
})

/** Opens the inspector's classifier or settings in a slot (components/dev/inspector.tsx listens). */
const INSPECTOR_EMBED = "inspector:embed"
type InspectorPanel = "classifier" | "settings"

const { Row, ROW, LABEL, SERIF, match } = PANEL_ROW

/** The Dev Tools menu: Dev Comments and Settings drill down, Point and Click and X-ray switch on and off. */
export function DevToolsEntry({ q, onSub }: { q: string; onSub: (sub: DevToolsSub) => void }) {
  const [pointing, togglePointing] = usePointer()
  const [xray, setXray] = React.useState(false)
  return (
    // data-sonar-exempt + data-devinspector: the rows stay clickable while a mode runs, so either mode can be
    // turned off here.
    <div data-sonar-exempt data-devinspector className="flex flex-col">
      {match(q, "Dev Comments") && <Row onClick={() => onSub("housekeeping")}>Dev Comments</Row>}
      {match(q, "Point and Click") && <SwitchRow on={pointing} onToggle={togglePointing}>Point and Click</SwitchRow>}
      {match(q, "X-ray") && (
        <>
          <SwitchRow on={xray} onToggle={() => setXray((v) => !v)}>X-ray</SwitchRow>
          {xray && <XRay />}
        </>
      )}
      {match(q, "Settings") && <Row onClick={() => onSub("devsettings")}>Settings</Row>}
    </div>
  )
}

/** The panel's row with the kit's switch where the chevron stands. */
function SwitchRow({ children, on, onToggle }: { children: React.ReactNode; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} className={ROW}>
      <span className={LABEL} style={SERIF}>{children}</span>
      <span aria-hidden className={cn("inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors", on ? "bg-(--pax2-light-blue)" : "bg-slate-300")}>
        <span className={cn("size-3 rounded-full bg-(--pax2-surface) shadow-sm transition-transform", on && "translate-x-3")} />
      </span>
    </button>
  )
}

/** X-ray: the inspector's classifier under its row, a skeleton in its shape first. */
function XRay() {
  const [loading, setLoading] = React.useState(true)
  const slot = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent(INSPECTOR_EMBED, { detail: { slot: slot.current, view: "classifier" } }))
    const t = window.setTimeout(() => setLoading(false), 450)
    return () => {
      window.clearTimeout(t)
      window.dispatchEvent(new CustomEvent(INSPECTOR_EMBED, { detail: null }))
    }
  }, [])
  return (
    <div className="relative mx-5 my-3 flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-(--pax2-surface) shadow-(--shadow-e1)">
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
  )
}

/** A view the menu opens, filling the panel's body above its footer: Dev Comments, or Settings. */
export function DevToolsSubView({ sub }: { sub: DevToolsSub }) {
  return (
    <div data-sonar-exempt data-devinspector className="flex min-h-0 flex-1 flex-col bg-(--pax2-sidebar) font-sans text-slate-900">
      {sub === "housekeeping" ? <HousekeepingView /> : <EmbedSlot view="settings" />}
    </div>
  )
}

/** An inspector panel drawn into this view's slot (the inspector portals it in; one slot at a time). */
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
