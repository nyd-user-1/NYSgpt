# Chart pages go bare: chart only, centered, crosshair, click → data table in the pane — MAIN ONLY, NO BUILD

Repo `/Users/brendanstanton/Code/NYSgpt`, `main`. No deploy pushes — Brendan deploys after his reboot.

His reference screenshot is /viz/nebula: the app shell's rounded container with only the sidebar and pane buttons — no wordmark, no title, no note — and the chart alone in the space.

## Task

1. **Strip the chrome from all twelve chart pages**: VizShell drops the NYSgpt wordmark row, the chart title, and the description note. Keep each page's `metadata.title` for the browser tab. The pages become: app shell + chart, nothing else.
2. **Center the chart** horizontally and vertically in its container.
3. **Cursor**: on every chart surface, `cursor: crosshair` (the granular plus) — not pointer, not hand. Put it in ONE place (VizShell's chart container or the shared hook) so swapping to a scope/custom cursor later is a one-line change; he plans to try the plus first.
4. **Click anything in a chart → the second panel opens with a table of that chart's data.**
   - Wire the ECharts click event in the shared hook; call the shell's `openPane` to a new route, e.g. `/viz/<slug>/data`.
   - The data route reads the SAME committed snapshot (`data/viz/*.json`) — no DB, no recompute, prerender/static like the chart pages.
   - Snappy is a requirement: the table page lazy-loads, renders paginated or virtualized rows (some sets are 8–10k rows; the graph's larger — cap sensibly with a "showing N of M" line). The charts themselves must not get heavier — a click handler and nothing else.
   - If the clicked datum is identifiable, scroll/highlight its row; otherwise plain table from the top. Don't gold-plate.

## Ship

Commit `main` (narrative voice), push `main` only. No local builds (hook-banned) — be conservative with syntax; CI checks after the reboot. sonnet 5.5 is separately porting trinity's header shadow onto the app shell container — it touches the shell/AppLayout dress only; keep clear of each other, rebase before push. Message lead-agent one line when pushed.
