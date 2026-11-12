# Brief 02: Elections API, FEC API, Law API (api-worker-2)

## Objective
Find the best version of the Elections API and what belongs beside it, then package Elections, FEC and Law as listings, quickest to publish first. Lobbying is not in scope tonight (Brendan: too incomplete; Senate LD forms and NYS only).

## Read first
- `~/Code/nysgpt-ai-api-closeout-2026-10-27.md` (what is live, how the shared layer works, rollback inventory, open items).
- `~/.claude/projects/-Users-brendanstanton-Code-pax-trinity/memory/nysgpt-api-roadmap.md` (Brendan's rulings on the product line, the Legislative listing's ids and prices, the pricing formula).
- `~/.claude/projects/-Users-brendanstanton-Code-NYSgpt/memory/marketplace-listing-copy.md` (how listing copy is written).
- In `~/Code/NYSgpt`: `aws/api/index.mjs` (the bridge), `aws/api/catalog/*.json`, the spec and copy generator, `lib/api-pricing.ts`, `lib/marketplace.ts`, branch `ci/ai-api`; `~/Code/nysgpt-marketplace` and `~/Code/NYSgpt/aws/marketplace`.

## Rules
- Everything is served from S3: Athena over `s3://govblock-lake-638175140432/lake/v1/` and the other lakes, through the one bridge, one MCP server, one generator. A new API is its tables registered in Glue, a catalog file, a generated spec and a listing. Nothing is rebuilt that exists; nothing reads a database.
- Seller account 638175140432, us-east-1. The existing Legislative API (prod-2sskaqhhle24w) is not touched.
- Gates: no AWS Marketplace submission, no production Lambda deploy, no push to NYSgpt `main`, until the lead says go. Work on a branch; commit there.
- Each submission is written up first as one HTML sketch that Brendan reviews: `~/Code/NYSgpt/docs/sketches/2026-11-12-aws-<product>-submission.html`, self-contained, styled like the other sketches there. It carries every section and field AWS requires for a SaaS/API listing, in AWS's order, each filled with the exact value that will be filed: read the field set from the live Legislative listing with the Marketplace Catalog API (`describe-entity` on the product and its offer) so nothing is missed (title, short and long description, highlights, categories, keywords, logo, support and refund text, EULA, dimensions with display names, prices for 1 and 12 months per dimension, fulfillment URL, registration, usage instructions, resources). Open it in his browser when done.
- Prices: the site's own formula (`lib/api-pricing.ts`, the one the Legislative offer uses), applied to this product's tables, eight dimensions, 1-month and 12-month. Show the inputs and results in the sketch; Brendan approves or changes them there.
- Copy: the Dedicatted card's sections and three highlights, confident and specific, sell do not audit, first person singular ("I", "my"), never "we", plain language, no metaphors. Evidence must be true. LegiScan is never named in copy.
- Source terms: Brendan has ruled on this. Do not raise licensing questions and do not hold work for them. Where AWS has a field for data sources, list them plainly.
- This Mac is an 8 GB Air: no python3, one AWS CLI call at a time, anything heavy on a box.
- Report: message `new-lead-agent` one line when a sketch is open in the browser or when you are blocked. Brendan talks to the lead, not to you; no questions to him.

## Steps, in order
1. Survey, read-only, these codebases for election data, election APIs and adjacent work: `~/Code/hermes`, `~/Code/pax`, `~/Code/pax2`, `~/Code/pax-trinity`, `~/Code/govblock`. Find: every elections dataset held and where it sits in S3 (bucket, prefix, format, rows, years, geography level), where each came from, any existing elections API, schema, catalog, spec or page, and adjacent sets (polls, political ads, districts, candidates, results, turnout, voter registration, ballot measures, redistricting). Do not assume OpenElections is the source: Brendan says little came from it; report what the code and the lake actually show. Verify sizes in S3 itself.
2. Write the finding as `~/Code/NYSgpt/docs/sketches/2026-11-12-elections-api-inventory.html`: one table of datasets (name, source, S3 location, rows, coverage, served today or not), which codebase holds the best version of each piece, and your recommended table list for the Elections API. Same sketch, two short sections: what the lake holds for an FEC API (campaign finance filings) and for a Law API (codes, the 5M USLM documents), with locations and rows. Open it. Message the lead.
3. Rank the three by how fast each can be registered and served (tables already Parquet in S3 and already in Glue come first). State the order and the blocking step for each in the message.
4. On the lead's go, one product at a time in that order: register its tables (Glue, Athena workgroup `nysgpt-api`), write its catalog file, generate its spec and MCP tool set, verify by row counts and live calls on a non-production path, and write its submission sketch. Message the lead as each sketch opens.
