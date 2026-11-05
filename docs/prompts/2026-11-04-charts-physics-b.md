# Chart batch B — levels, gammas, EXFOR (approved 4.2 rewrites; start AFTER /viz/levels ships)

Repo `/Users/brendanstanton/Code/NYSgpt`, main only, no deploy pushes, no local builds; dev server may be on :3000 (curl only). ECharts pages (echarts 5.6 + echarts-gl, the existing /viz pattern — useEChart, committed JSON in public/viz-data, VIZ_TABLES data tables), NOT R3F.

Physics sources: your own `levels.json`; `/Users/brendanstanton/Code/nsr/public/data/be2.json` (first 2⁺ energies and B(E2) for even-even nuclei) and `capgam/` (capture-gamma spectra, 38MB — derive compact snapshots, never commit it wholesale); EXFOR raw JSON via Athena (`exfor_entries.raw` — the data tables inside hold energy/cross-section points; sample sensibly); Opus-1's `decay.json` where needed.

Rewrite in place (same route; update the /viz CHARTS entry, lib/header-titles.ts, tab metadata, and the page's VIZ_TABLES table):
1. `/viz/weight` (Two-series scatter) → E(2⁺) vs B(E2), even-even nuclei; one series near magic numbers, one midshell.
2. `/viz/scatter3d` (3D scatter) → E(2⁺) × B(E2) × Z.
3. `/viz/scatter3d-dataset` → EXFOR measurements: incident energy × cross section × year, one point per data row (sample to ~50k points).
4. `/viz/simplex` (Noise field) → capture-gamma lines per nuclide as vertical strips; AND add `/viz/spectra` — the 2D version with the dataZoom stretch-select and a detail column showing the selected nuclide's full spectrum.
5. `/viz/matrix` (Correlation matrix) → T½, Qα, Qβ, Sₙ, Sₚ, E(2⁺), B(E2), mass excess, level count — Pearson r across nuclides with all quantities present (needs decay.json + levels.json + be2 + AME-derived values from batch A's snapshot; coordinate with Opus-1 on reusing its ame2020 output).

New pages (add a /viz index box each, literal titles):
6. `/viz/first-excited` — scatter-aggregate-bar pattern: every E(2⁺) as a point, aggregating to mean-per-Z bars; shell closures spike.
7. `/viz/level-spans` — custom-ohlc pattern: per nuclide along a selected isotope chain: ground, first excited, median, highest known level.
8. `/viz/level-candles` — candlestick-large pattern: ~3,350 candles, one per nuclide (min/first/median/max level energy).
9. `/viz/gamma-atlas` — heatmap-large pattern: x = Eγ bin, y = nuclide ordered by A, heat = line intensity (capgam).
10. `/viz/gamma-punchcard` — heatmap-cartesian pattern: Eγ bins × element, intensity as heat.

Each page: one committed snapshot, prerendered, paper tokens, crosshair behavior as the other charts. Message Fable 5 as each lands; batch commits are fine.
