# Prototype A — decay simulation at /viz/decay (end-to-end: parser, snapshot, page)

Repo `/Users/brendanstanton/Code/NYSgpt`, `main`, pull first. The repo was restructured today (route groups under app/(site), header titles in lib/header-titles.ts, chart JSON served from public/viz-data) — read the current tree and follow its conventions, not older patterns. Commit+push MAIN only; no deploy-branch pushes. No local builds (hook-banned); a dev server may be on :3000 — verify with curl, never start one. Approved by Brendan 2026-11-04.

## You install the shared deps FIRST
`pnpm add three @react-three/fiber @react-three/drei @react-three/postprocessing`, commit, push main immediately — Opus-2 waits on your lockfile commit before touching package.json. Do this before anything else.

## Data (you own the schema — shape it from what parsing actually yields)
Build `scripts/viz-decay-snapshot.mjs` → `public/viz-data/decay.json` (committed; keep it under ~2MB). Per nuclide: Z, N, element, half-life in seconds (null = stable), decay modes with branching % where the deck states one, and each mode's (ΔZ, ΔN) step.
- Sources, all reachable now: Athena db `nysgpt_nsr` (local AWS CLI is credentialed) — `ensdf_datasets` where dsid LIKE 'ADOPTED LEVELS%' has the raw card deck per nuclide (`raw` column); ground-state T½ sits on the 0.0 L card, decay branchings on its continuation records (%B-=, %A=, …). `decay_processes` maps mode code → ΔZ/ΔN. `nuclide_dict` has Z/N/A.
- ENSDF is a fixed-width format — column positions matter. Working parser reference: `/Users/brendanstanton/Code/nsr/scripts/ingest-ensdf*.mjs` (read-only repo).

## Page: /viz/decay
- The chart of nuclides as R3F points at (N, Z); elevation = log10(T½), stable nuclides on the top plateau; color by primary decay mode in the NNDC chart's palette (β− blue, β+/EC orange, α yellow, SF green, p/n emission violet/red, stable black, unknown grey).
- The simulation: play/pause + a log time-compression slider. Each unstable particle decays stochastically at its real rate (scaled), steps along its mode's (ΔZ, ΔN) to its daughter, leaves a brief fading trail; daughters keep decaying — chains execute on their own. Reset restores the initial population.
- Click a nuclide: in-page panel listing its chain — each step's nuclide, mode, branching, half-life.
- Client-only (dynamic import, ssr:false), instanced points, OrbitControls, restrained bloom, 60fps on a laptop. Page chrome in the paper design tokens, both themes, like the other /viz pages. Add a box for it on the /viz index (title "Decay simulation", literal description).

## If you finish before Opus-2
Take Prototype C, /viz/knowledge: plain Athena aggregates per nuclide (papers from nsr_nuclides, levels = num_cards, EXFOR links, XUNDL sets, ENSDF cutoff year) → knowledge.json; page = particles at (N,Z), size = levels, color = years since evaluation, distinct marker for studied-but-never-evaluated, click → counts panel.

Commit main in the repo's voice; push; message `Fable 5` (the lead session's current name) one line when each piece lands.
