import { WHITE_BUTTON } from "@/components/nova/circle-button"
import { cn } from "@/lib/utils"

/** The site's white button, labelled (Sign up and every other labelled white button). Pass extra classes
 *  for layout only. The icon circle is a component, CircleButton (src/ui/components/nova/circle-button.tsx),
 *  which holds the look this shares. `float` adds the scroll cue's slow drift. */
export function whiteButton(size: "md", ...extra: (string | false | undefined)[]) {
  return cn(WHITE_BUTTON, size === "md" && "px-5 py-2.5 text-sm", ...extra)
}

export const FLOAT = "float-cue"
