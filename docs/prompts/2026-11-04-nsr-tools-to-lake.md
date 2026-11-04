# Repoint the chat's three NSR tools off Neon onto the lake parquet

Repo: `/Users/brendanstanton/Code/NYSgpt`. Work on `main` (trunk — builds nothing), then push `cloudflare` to deploy the worker.

## Why

The three tools in `lib/chat-data/tools.ts` — `nsr_sql`, `nsr_search`, `nsr_record`, behind `/api/chat` — are the ONLY live Neon readers left in NYSgpt (Neon project `sparkling-moon-06542876`, 303,568 refs, reached via the worker secret `NSR_DATABASE_URL`). Neon is a legacy stopgap Brendan wants dead. The durable copy is already in the lake and verified: `s3://govblock-lake-638175140432/lake/v1/nsr/nsr-to-lake-2026-11-04/` — 42/42 tables as parquet, with an `_athena/` prefix alongside (check what DDL/setup already exists there before writing your own). AWS account 638175140432; confirm the bucket region before wiring anything.

## Hard constraint

`/api/chat` runs on the Cloudflare worker (workerd). No native modules — DuckDB is out. The Bedrock client (`lib/chat-data/bedrock.ts`) solved AWS auth on workerd with a bearer-token fetch path, but Athena has no bearer road; it needs SigV4. Two viable designs — pick one and say why in your report:

a) **Direct from the worker**: `aws4fetch` (pure JS SigV4, workerd-proven) against the Athena REST API (StartQueryExecution → poll → GetQueryResults). Creds: add scoped access keys to IAM user `nysgpt-chat-worker` (extend its policy with athena:*QueryExecution*/GetQueryResults, glue read on the nsr database, s3 read on the lake prefix + read/write on the Athena results location) and store them as worker secrets via wrangler (token at `~/.secrets/cf-token`). Fewer moving parts — likely the right call.

b) **Via api.nysgpt.com**: a Lambda behind the existing API Gateway fronts Athena; the worker calls it with the existing key machinery. More parts, but keeps AWS creds off the worker.

Athena answers in 1–5s+; the tools already run async inside a streamed chat turn, so that's acceptable — set a sane poll interval and timeout, and keep the LIMIT-200 cap.

## What changes

- `nsr_sql`: currently teaches Postgres in `nsrPrompt()` and wraps one SELECT in a LIMIT-200 subquery. Athena is Trino dialect — rewrite the schema prompt (table names as they exist in Glue, quoting rules, Trino functions) and the wrapper.
- `nsr_search`: currently Postgres `websearch` FTS over `nsr.fts`. Parquet has no FTS — reimplement as an honest Athena scan (lower() LIKE / regexp over the title+abstract columns, or Trino's regexp functions) and update the tool description so the model calls it with realistic expectations.
- `nsr_record`: key_number lookup — straight Athena query.
- Sweep the two other files where `neon` still greps — `lib/db.ts` and `lib/home-data.ts` — confirm those references are dead (comments or unreached code; /viz and home went fully static as of `052e6a3`) and clean them out, so Neon has zero dependents in code, not just at runtime.

## End state and verification

- Test your Athena queries directly first (local AWS CLI), then deploy (push `cloudflare`, watch `gh run list -R nyd-user-1/NYSgpt -b cloudflare` to green) and exercise `/api/chat` on https://nysgpt.brendan-stanton.workers.dev with questions that force each of the three tools (`NYSGPT_CHAT_OPEN=1` is set — no sign-in needed). Judge the output, not the status code.
- `NSR_DATABASE_URL` ends up unused — note that in your report; leave the secret in place.
- Do NOT delete, suspend, or touch the Neon project itself — reaching zero dependents and reporting it is the deliverable; shutting Neon off is Brendan's call.
- Never print secret values into the transcript; `wrangler secret put` reads from stdin.
- Heads-up: another window (sonnet 5.5) is self-hosting the fonts in `app/layout.tsx` on the same trunk. Rebase on latest `main` before any push; don't touch that file.

When done or blocked, message the session `nysgpt-37` with a short report (SendMessage tool).
