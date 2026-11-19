"use client"

import type { ReactElement } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/nova/tooltip"

// A row's tooltip (Brendan, 2026-11-08): the row's name, set clear of the rail's open-and-close tab. Portalled (nova's tooltip), so no panel edge clips it. The inset panels' InsetTip is this component.

export type RowTipSide = "left" | "right"

export function RowTip({ name, side, children }: { name: string; side: RowTipSide; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger delay={0} closeDelay={0} render={children} />
      <TooltipContent
        side={side === "left" ? "right" : "left"}
        align="start"
        sideOffset={36}
        className="nysgpt-app pointer-events-none flex w-auto max-w-56 flex-col items-start gap-0.5 rounded-lg border border-[var(--paper-rule)] bg-[var(--paper)] p-2.5 text-left shadow-md [&>[data-side]]:hidden"
      >
        <span className="block text-sm font-semibold leading-snug text-[var(--paper-text)]">{name}</span>
      </TooltipContent>
    </Tooltip>
  )
}
