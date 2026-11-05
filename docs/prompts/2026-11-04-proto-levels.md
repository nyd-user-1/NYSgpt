# Prototype B — level energies in 3D at /viz/levels (end-to-end: parser, snapshot, page)

Repo `/Users/brendanstanton/Code/NYSgpt`, `main`, pull first. The repo was restructured today (route groups under app/(site), header titles in lib/header-titles.ts, chart JSON served from public/viz-data) — read the current tree and follow its conventions. Commit+push MAIN only; no deploy-branch pushes. No local builds (hook-banned); a dev server may be on :3000 — curl to verify, never start one. Approved by Brendan 2026-11-04.

## Dependency order
Opus-1 is installing the R3F stack (three, @react-three/fiber, drei, postprocessing) and pushing main first. Pull AFTER its lockfile commit lands; do not edit package.json yourself. Start on the parser while you wait.

## Data (you own the schema — shape it from what parsing actually yields)
Build `scripts/viz-levels-snapshot.mjs` → `public/viz-data/levels.json` (committed; watch size — cap levels per nuclide at 10 MeV or ~150 entries, gammas at ~40 per nuclide, round energies; stay under ~4MB).
Per nuclide: Z, N, element, levels [energy keV, Jπ or null], gammas [from-level energy, to-level energy, relative intensity or null].
- Source: Athena db `nysgpt_nsr` (local AWS CLI credentialed) — `ensdf_datasets.raw` where dsid LIKE 'ADOPTED LEVELS%' holds the card deck: L cards = levels (energy, Jπ, T½ in fixed columns), G cards = gammas (energy, RI) attached to the level above them. `nuclide_dict` for Z/N.
- ENSDF is fixed-width — column positions matter. Working parser reference: `/Users/brendanstanton/Code/nsr/scripts/ingest-ensdf*.mjs` (read-only repo).

## Page: /viz/levels
- The (N, Z) plane as the floor; each evaluated nuclide carries a vertical stack of markers at its real level energies (z axis 0–10 MeV). Instanced rendering — this is hundreds of thousands of points.
- Gamma de-excitations animate as particles dropping from level to level within a nuclide, brightness scaled by relative intensity. Render gamma animation only for the focused nuclide and its near neighbors — the field stays calm, the focus is alive.
- Magic-number grid lines at 2, 8, 20, 28, 50, 82, 126 on both axes, drawn on the floor.
- Click a nuclide: camera moves to it; in-page panel lists its levels (energy, Jπ) — the same content the NNDC Dispatcher serves as text.
- Client-only (dynamic import, ssr:false), OrbitControls, restrained bloom, 60fps. Paper design tokens for all chrome, both themes. Add a box on the /viz index (title "Level energies", literal description).

Commit main in the repo's voice; push; message `Fable 5` (the lead session's current name) one line when the snapshot lands and again when the page lands.
