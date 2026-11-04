# Port pax-trinity's header shadow onto the app shell container, everywhere — MAIN ONLY, NO BUILD

Repo `/Users/brendanstanton/Code/NYSgpt`, `main`. No deploy pushes — Brendan deploys after his reboot.

## Task

pax-trinity's app shell header carries a slight shadow — the `shadow-header` utility (see trinity `src/components/shell.tsx:565` and wherever `shadow-header` is defined: tailwind config or globals; `/Users/brendanstanton/Code/pax-trinity`, read-only). Brendan wants that exact shadow on NYSgpt's app shell CONTAINER — the rounded app frame — everywhere it renders: /, /viz, the chart pages, /chat, the pane's frame if it shares the dress.

1. Find trinity's `shadow-header` value and bring it over as a token in NYSgpt (globals or tailwind theme), same name.
2. Apply it to the app shell container wherever the frame renders. Both themes — check the value reads correctly on dark paper; trinity's dress has the precedent if it defines a dark variant.
3. Nothing else: no other restyling.

## Ship

Commit `main` (narrative voice), push `main` only; no local builds (hook) — conservative syntax, CI checks after reboot. opus 5.5 is concurrently stripping the chart pages' VizShell chrome — it owns VizShell internals; you own the shell/AppLayout dress. Rebase before push. Message lead-agent one line when pushed.
