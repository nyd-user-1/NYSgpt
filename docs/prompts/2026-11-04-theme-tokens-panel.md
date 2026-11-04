# Bring trinity's theme + tokens over, and add a Theme view to the right side panel — MAIN ONLY

Repo `/Users/brendanstanton/Code/NYSgpt`, work on `main`, commit AND push main, NO deploy-branch pushes. Brendan is waiting — speed over polish. A dev server is ALREADY running on localhost:3000 (do not start your own; local builds are hook-banned): verify compiles by `curl -s localhost:3000/` and reading errors if non-200.

## Part 1 — the tokens come over

Source: `/Users/brendanstanton/Code/pax-trinity` (read-only). Its ui-kit tokens live in `src/ui/styles/globals.css` (~247 var lines) and its app globals. NYSgpt's `app/globals.css` already carries the `--pax2-*` set (appended 2026-11-03) and its own `--paper-*` family scoped to `.nysgpt-app`, plus `--shadow-header` (ported today). Diff trinity's token families against NYSgpt's globals and bring over what's MISSING — semantic colors, radii, elevations, type vars — with their `.dark` variants, scoped the way NYSgpt scopes (the `.nysgpt-app` paper pattern where applicable). No duplicates, no renames of existing tokens.

## Part 2 — the Theme view in the right side panel

Add a **Theme** row to the switchboard's menu, directly after the Dev tools row, opening a deep view — mirror EXACTLY the `'devtools'` wiring added today in `components/SwitchboardPanel.tsx` (View union + openDevtools callback + provider value + Escape list + `deep` + title + render branch + menu row; copy that pattern for `'theme'`).

The view itself (`components/ThemePanel.tsx` or similar, client): a live token sheet read from computed styles — not hardcoded values — so it always matches reality and follows the light/dark toggle:

- **Color**: every `--paper-*` and `--pax2-*` (and any family you ported) as swatch + var name + resolved value, grouped by family.
- **Type**: `--font-display` / `--font-sans` / `--font-mono` with a short specimen in each face.
- **Elevation**: `--shadow-header` and any other shadows, each on a small card showing the shadow live.
- **Radii / spacing** if tokenized.
- Click any row to copy the var name. Paper dress, both themes.

Read vars by iterating document.styleSheets or a known-name list assembled in Part 1 — a curated list constant is fine and more legible than sheet-walking.

## Ship

Commit `main` (narrative voice, read git log for register), push main. Message `lead-agent` one line when pushed. Nothing else: no deploys, no extra features.
