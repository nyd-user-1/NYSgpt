# Self-host the three Google fonts so builds stop dying on the fetch

Repo: `/Users/brendanstanton/Code/NYSgpt`. Work on `main` (trunk — builds nothing), then push `cloudflare` to deploy.

## Problem

`app/layout.tsx:4` imports `DM_Sans`, `Fraunces`, `JetBrains_Mono` from `next/font/google`. Every CI build fetches them from Google at build time, and that fetch intermittently fails with `Cannot read properties of null (reading '1')` — it killed run 41859632886 (repo nyd-user-1/NYSgpt) and has recurred before. Brendan wants this class of failure gone permanently, not retried.

## Task

Switch all three to `next/font/local` with committed font files.

1. Read the current config in `app/layout.tsx` first: note exact weights, subsets, axes, and the CSS variable names each font declares.
2. Download the variable woff2 for each family (DM Sans, Fraunces, JetBrains Mono — all have variable versions; Fraunces also carries opsz/SOFT/WONK axes). Put them in `app/fonts/` and commit them.
3. Replace the `next/font/google` imports with `next/font/local`, preserving the exact same CSS variable names and fallback stacks. `lib/footage.ts:64` documents why the variable + fallback matters — do not rename anything.
4. Goal is visually identical output. No restyling, no new deps, nothing else touched.

## Verify, then ship

- `pnpm build` locally — must succeed with zero requests to fonts.googleapis.com (`next/font/local` makes none by construction).
- Run the dev server and eyeball `/` and one `/viz/*` page — same faces, same weights.
- Commit to `main` in the repo's commit voice (read `git log` — narrative sentences, not conventional-commit).
- Fast-forward `cloudflare` to main and push it; watch `gh run list -R nyd-user-1/NYSgpt -b cloudflare` until green; then confirm https://nysgpt.brendan-stanton.workers.dev/viz still renders with correct fonts.
- Heads-up: another window (opus 5.5) is working `lib/chat-data/tools.ts` on the same trunk. Rebase on latest `main` before any push; don't touch that file.

When done or blocked, message the session `nysgpt-37` with a short report (SendMessage tool).
