import { Button as ButtonPrimitive } from "@base-ui/react/button"

import { cn } from "@/lib/utils"

/** The site's white button, taken from section two's Try it: white, a slate-400 hairline, pax blue text,
 *  shadow-md; on hover the border turns pax blue over a slate-50 wash. The circle below wears it, and so
 *  do the labelled sizes in components/white-button.ts. */
export const WHITE_BUTTON =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-slate-400 bg-pax2-surface font-medium text-pax2-blue shadow-md outline-none transition-colors hover:border-pax2-blue hover:bg-slate-50 aria-pressed:border-pax2-blue data-[popup-open]:border-pax2-blue disabled:cursor-not-allowed disabled:opacity-60"

/** The circle the headers' icon buttons wear: the white button at 40px, an icon its only content.
 *  One look and no variants; what differs from one to the next (the icon, the handler, its aria, where it
 *  sits) is props, and `className` is for placement alone. Base UI's button, as nova's Button is, so a
 *  link wears it the same way: `render={<Link href="…" />} nativeButton={false}`. */
function CircleButton({ className, ...props }: Omit<ButtonPrimitive.Props, "className"> & { className?: string }) {
  return <ButtonPrimitive data-slot="circle-button" className={cn(WHITE_BUTTON, "size-10", className)} {...props} />
}

export { CircleButton }
