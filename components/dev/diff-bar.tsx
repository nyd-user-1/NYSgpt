import { cn } from "@/lib/utils"

// govblock's DiffBar (apps/web/components/create/bill-changes.tsx, ported 2026-11-01): GitHub's five squares,
// the share of a change that added (green) and deleted (red), with the counts. Its own file, so a folded diff
// row can wear it without loading the diff view.

export function DiffBar({ added, deleted, className }: { added: number; deleted: number; className?: string }) {
  const total = added + deleted
  const green = total ? Math.round((5 * added) / total) : 0
  const red = total ? Math.min(5 - green, deleted ? Math.max(1, 5 - green) : 0) : 0
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs tabular-nums", className)}>
      {added > 0 && <span className="text-green-600 dark:text-green-500">+{added.toLocaleString("en-US")}</span>}
      {deleted > 0 && <span className="text-red-600 dark:text-red-500">−{deleted.toLocaleString("en-US")}</span>}
      <span aria-hidden className="inline-flex gap-px">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={cn("size-2.5 rounded-[2px]", i < green ? "bg-green-600 dark:bg-green-500" : i < green + red ? "bg-red-600 dark:bg-red-500" : "bg-muted-foreground/25")} />
        ))}
      </span>
    </span>
  )
}
