import { cn } from "@/lib/utils"

/** The NYSgpt wordmark at the size the palette asks for: the masthead's serif, in the page ink. It
 *  stands where pax-trinity's palette shows its PaxMark (src/components/pax-mark.tsx), with the same props. */
export function NysgptMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      aria-label="NYSgpt"
      className={cn("cmdk-mark inline-flex items-center leading-none", className)}
      style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: size, letterSpacing: "-0.03em" }}
    >
      NYSgpt
    </span>
  )
}
