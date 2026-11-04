# Chart pages into the standard app shell, theme-correct — deploy owner, ~8 min budget

Repo `/Users/brendanstanton/Code/NYSgpt`, work on `main`, deploy via `cloudflare` branch. Brendan's words: the /viz chart pages are "some white some black...neither appears to respect light mode function and i want all of them dropped in the standard appshell design now."

## Task

The twelve `app/viz/<slug>/page.tsx` pages wrap in `components/viz/VizShell` with a per-page `dark` prop — that's why some render white and some black regardless of the app's light/dark mode. Replace that frame:

1. Rework `VizShell` (or swap it out) so every chart page sits in the SAME frame the rest of the app uses — study how `/` (app/page.tsx, app/layout.tsx) and `/chat` dress a page: background, text tokens, header treatment. Drop the per-page `dark` flag entirely.
2. Page chrome (title, note, surrounds) must follow the app's light/dark mode exactly like any other page.
3. Chart canvases: make backgrounds transparent and take text/axis/label colors from the active theme so each chart is readable in both modes. The shared echarts-gl mount hook is the central place if that's fastest. If a given GL scene genuinely can't flip to light cleanly in this time budget, keep that one canvas dark inside the correctly themed shell and note it in your report — don't burn the clock on it.
4. Don't touch `app/viz/page.tsx` (the index) — another window (nysgpt-83) is fixing its box names/descriptions right now and pushing to `main`.

## Ship — you own the build

Brendan is back in ~10 minutes and wants a NEW BUILD LIVE waiting. So:
- Commit your work to `main` (narrative commit voice), pull/rebase to pick up nysgpt-83's index commit, merge `main` into `cloudflare` the way today's "rides to" merges did, push.
- If nysgpt-83's commit hasn't landed by ~6 minutes in, push `cloudflare` with your work alone — a live build beats a complete one; a second push can follow.
- Watch `gh run list -R nyd-user-1/NYSgpt -b cloudflare` to green, spot-check https://nysgpt.brendan-stanton.workers.dev/viz plus two chart pages (one formerly-white, one formerly-black), then message `lead-agent` the result (SendMessage tool).

No scope additions, no restyling beyond the shell/theme ask.
