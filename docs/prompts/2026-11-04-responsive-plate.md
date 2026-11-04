# Masthead + content plate go responsive (container queries) — COMMIT ONLY, NO BUILD

Repo `/Users/brendanstanton/Code/NYSgpt`, `main`. Do NOT push `cloudflare`/`netlify`/`amplify` — Brendan wants no build this round; he's rebooting and will deploy after. Commit and push `main` only.

## The problem (his screenshots, 2026-11-04)

On narrow widths — a phone, or desktop with the pane open halving the main column — the masthead breaks ("Platform"/"Tools" overlap each other) and the plate squeezes into unreadable slivers. Media queries can't see the pane; the components must size to their CONTAINER.

## Approved design (his sign-off, verbatim scope)

Container queries, not media queries: the plate measures itself (so the open pane counts), keeps its fixed aspect relative to its viewport/container, picks an EVEN rows×columns grid that exactly fills its height and width, pages overflow boxes with snap-scroll; masthead type scales via clamp and reflows instead of overlapping.

## Behavior spec

- Files: `app/HomeMasthead.tsx` (173 ln), `app/HomeContents.tsx` (228 ln), shared by `/` (app/page.tsx) and `/viz` (app/viz/page.tsx) — fix the shared components so both pages inherit it.
- Whichever masthead option is selected (all / Data / Models / Platform / Tools), the plate always shows an even number of boxes in a grid that fills the plate exactly — no partial column peeking, no slivers. Today: all = 10 boxes scrolling left-right, Tools = 2 large, Models = 6–8; keep those contents, make each count sit in an even grid (2×5, 1×2→2×1 as fits, 2×3/2×4…) chosen from the measured container.
- Overflow (more boxes than the grid holds) pages horizontally with scroll-snap, whole pages at a time — never a half-visible column.
- The plate's overall size stays fixed relative to its container; boxes resize, the plate doesn't grow.
- Masthead: the wordmark and the option cells reflow/scale (CSS clamp + container query breaks) so nothing overlaps at any width down to ~360px, pane open or closed.
- Both themes, paper dress, no restyling beyond what responsiveness requires. The pane itself (components/pane.tsx, shell) is yours from the last task — don't regress it.

## Ship

Commit `main` (narrative voice), push `main` ONLY. No local builds (hook) — CI will check later; be conservative with syntax. Message lead-agent one line when pushed. Brendan is rebooting soon — land it promptly.
