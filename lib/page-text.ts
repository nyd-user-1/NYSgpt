// The pages the reader has open, as text (Brendan, 2026-10-31): the main page and the second panel beside it,
// read off the screen each time a note's chat sends, so PAX answers from the numbers on show (a question's Data
// or Crosstab in America Thinks, a Lift table) as it does from the record. What is hidden isn't read: innerText
// keeps only what renders, a table's cells split by tabs and its rows by lines.

const MAIN_MAX = 40_000
const PANE_MAX = 24_000

const textOf = (el: HTMLElement | null | undefined, max: number) =>
  (el?.innerText ?? "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max)

export function pageContext(): string {
  const parts: string[] = []
  const main = textOf(document.querySelector("main"), MAIN_MAX)
  if (main) parts.push(`ACTIVE CONTEXT — the page the user has open, ${window.location.pathname} ("${document.title}"), as it shows right now:\n${main}`)
  const frame = document.querySelector<HTMLIFrameElement>("iframe[data-pane]")
  try {
    const doc = frame?.contentDocument
    const pane = textOf(doc?.querySelector("main") ?? doc?.body, PANE_MAX)
    if (frame && pane) parts.push(`ACTIVE CONTEXT — the page open beside it in the second panel, ${frame.contentWindow?.location.pathname ?? ""} ("${frame.title}"), as it shows right now:\n${pane}`)
  } catch {
    // A frame that can't be read leaves the main page alone.
  }
  return parts.join("\n\n")
}
