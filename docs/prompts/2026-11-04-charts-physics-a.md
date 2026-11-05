# Chart batch A — masses and decay (approved 4.2 rewrites; start AFTER /viz/decay ships)

Repo `/Users/brendanstanton/Code/NYSgpt`, main only, no deploy pushes, no local builds; dev server may be on :3000 (curl only). These are ECharts pages (echarts 5.6 + echarts-gl, the existing /viz pattern — useEChart, committed JSON in public/viz-data, data table via VIZ_TABLES), NOT R3F.

Physics sources: `/Users/brendanstanton/Code/nsr/public/data/ame2020.json` (masses — derive binding energy per nucleon, Sₙ, Sₚ; copy the derivation into a snapshot script, commit only the compact output), your own `decay.json`, Opus-2's `levels.json`. Extend `scripts/` with snapshot scripts as needed.

Rewrite in place (same route; update the /viz CHARTS entry, lib/header-titles.ts, tab metadata, and the page's VIZ_TABLES data table to match the new data):
1. `/viz/nebula` (Scatter field) → binding energy per nucleon vs A, every AME2020 nuclide. The curve peaks at ⁵⁶Fe.
2. `/viz/surface` (3D surface) → binding energy per nucleon as terrain over (N, Z) — the measured mass surface.
3. `/viz/heatmap` → log T½ heat over (N, Z) from decay.json — the NNDC wall chart.
4. `/viz/rainfall` (Stacked area) → nuclide count per mass number A, stacked by primary decay mode.
5. `/viz/bar-large` (Bar run) → every nuclide's half-life, sorted, log axis.
6. `/viz/graph` (Force graph) → the decay network: nuclides as nodes, decay modes as directed edges (decay.json has ΔZ/ΔN per mode).
7. `/viz/reactions` (Flow lines) → the uranium, thorium, actinium decay series as routes over (N, Z); moving-light speed scaled by half-life.

New pages (add a /viz index box each, literal titles):
8. `/viz/separation` — candlestick-sh pattern: Sₙ along each isotope chain as candles (even-odd pairing stagger); volume row = known level count from levels.json.
9. `/viz/nuclide-card` — radar-custom pattern: per-nuclide polygon of T½, Qα, Qβ−, Sₙ, Sₚ, E(2⁺); selector to overlay two isotopes.

Each page: one committed snapshot, prerendered, paper tokens, crosshair behavior as the other charts. Message Fable 5 as each lands; batch commits are fine.
