import type { Address } from "./address-book"
import { cn } from "@/lib/utils"

// A recipient's face, apart from the composer, so the template list draws faces without loading the editor.
// compose.tsx re-exports it. An agent wears its orb's still twin (components/agents/agent-orb.tsx): these
// faces stand in chips, picker rows and lists, where a live canvas each would be too many.

/** A recipient's face: a staff photo, a partner's channel art, a channel's logo, an agent's orb, or a monogram. */
export function Face({ address, className = "size-8" }: { address: Address; className?: string }) {
  if (address.image)
    return <img src={address.image} alt="" className={cn("shrink-0 rounded-full bg-pax2-surface", address.kind === "channel" ? "object-contain p-1 ring-1 ring-border" : "object-cover", className)} />
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full text-[10px] font-medium", address.kind === "group" ? "bg-pax2-lavender text-pax2-blue" : "bg-muted text-foreground", className)}>
      {address.monogram}
    </span>
  )
}
