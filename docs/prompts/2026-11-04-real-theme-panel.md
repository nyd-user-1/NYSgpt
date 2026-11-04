# REPLACE the invented Theme view with trinity's REAL one, and port the split-view corner — MAIN ONLY

Repo `/Users/brendanstanton/Code/NYSgpt`, main only, no deploys. Brendan's words: "every time I tell you 'go get this thing we already have' you make it up instead of just getting the thing... look, there it is — just go get it!" So: PORT, don't invent. Copy/paste discipline. Dev server runs on :3000 — curl to verify, never start one.

## 1. The real Theme panel

The view built earlier (a raw var list) is WRONG — delete/replace it. The real thing is pax-trinity's palette:
- `src/components/theme/theme-palette.tsx` (203 ln) — THEMES cards (PAX Light/PAX Dark/Light/Dark/Vercel/VS Code) with RESET and a check on the active one, then SURFACES, TYPE, … swatch rows with hex, and the "Copy Light as CSS" primary button at the foot.
- `src/lib/theme.ts` (189 ln) + `src/lib/theme-client.ts` (181 ln) — its engine.

Port all three VERBATIM into NYSgpt (import fix: `@/ui/lib/utils` → `@/lib/utils`; anything else missing, port it too — no stubs, no reinterpretation). Mount it as the switchboard's Theme view (the `'theme'` branch in components/SwitchboardPanel.tsx) in place of the current ThemePanel. Keep labels, layout, behavior exactly as the source — if a theme card applies CSS vars, it must actually apply them here. If trinity's themes reference vars NYSgpt lacks, port those var definitions too.

## 2. Chrome's split-view corner

Trinity `src/components/shell.tsx` ~line 678: "Chrome's split-view tab: a bite out of the pane's bottom-right corner holding its close." Port that exact construction — the notched bite + the × — onto NYSgpt's pane (`components/pane.tsx` PaneFrame) and the switchboard panel if trinity's design carries it there too. Match the source's geometry; don't redesign it.

## Ship

Commit main (narrative voice), push. curl localhost:3000/ to confirm compile. Message lead-agent one line when pushed.
