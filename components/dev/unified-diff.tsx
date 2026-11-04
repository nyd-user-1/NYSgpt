"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { parseUnifiedDiff } from "@/lib/diff/unified"

import { DiffBar } from "./diff-bar"
import { DiffView } from "./diff-view"

export { DiffBar }

// A unified diff (a commit's, as Claude's replies in Dev Comments carry it) drawn file by file in govblock's
// Changes framing (apps/web/components/create/bill-changes.tsx, ported 2026-11-01): each file a bordered
// section, its header the chevron that folds it, its path in monospace and the DiffBar of what it added and
// deleted, then GitHub's diff table (./diff-view.tsx). Text that is not a unified diff shows as it is.
// `flush` draws it borderless inside a box of the caller's (Dev Comments' rounded, bordered box): a rule
// between files and none around them, and a single file as its bare table, its header being the row that
// opened it.

export function UnifiedDiff({ text, anchor = "diff", flush = false, className }: { text: string; anchor?: string; flush?: boolean; className?: string }) {
  const files = React.useMemo(() => parseUnifiedDiff(text), [text])
  const [shut, setShut] = React.useState<Set<number>>(new Set())
  if (!files.length) return <pre className={cn("overflow-x-auto p-3 font-mono text-xs whitespace-pre", !flush && "rounded-lg border", className)}>{text}</pre>
  if (flush && files.length === 1 && files[0].status !== "binary") return <DiffView diff={files[0].diff} anchor={`${anchor}-0-`} className={className} />
  return (
    <div className={cn("flex flex-col", flush ? "gap-0" : "gap-3", className)}>
      {files.map((f, i) => {
        const open = !shut.has(i)
        return (
          <section key={`${f.path}-${i}`} data-open={open} className={cn("overflow-hidden", flush ? "border-t first:border-t-0" : "rounded-lg border")}>
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
              <button
                type="button"
                aria-expanded={open}
                onClick={() =>
                  setShut((s) => {
                    const n = new Set(s)
                    if (open) n.add(i)
                    else n.delete(i)
                    return n
                  })
                }
                className="flex min-w-0 items-center gap-2 text-sm hover:underline"
              >
                {open ? <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />}
                <span className="truncate font-mono">{f.path}</span>
              </button>
              <span className="ml-auto flex items-center gap-2">
                {f.status !== "modified" && <span className="text-xs text-muted-foreground">{f.status === "renamed" && f.from ? `renamed from ${f.from}` : f.status}</span>}
                <DiffBar added={f.added} deleted={f.deleted} />
              </span>
            </div>
            {open && (
              <div className="border-t">
                {f.status === "binary" ? <p className="px-4 py-3 text-xs text-muted-foreground">A binary file; its change is not shown.</p> : <DiffView diff={f.diff} anchor={`${anchor}-${i}-`} />}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
