# Brief 01: AI API submission, then the AI family (api-worker-1)

## Objective
The AI API is the first new listing filed tonight: it is already live at https://api.nysgpt.com/v1/ai (81 tables, 61.8M rows) with a listing draft. Then propose and package the smaller AI APIs that can be cut from the same tables.

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
1. AI API submission sketch: find the listing draft from 2026-10-27, bring it to the rules above, compute the 16 prices, fill every AWS field. Open it. Message the lead.
2. While Brendan reviews: list what must happen for the listing to work the moment AWS issues the product code (merge `ci/ai-api` without fa8a6cc, the PRODUCTS line in `lib/marketplace.ts`, the Amplify build, `/aws/subscribe`), as a short checklist at the foot of the sketch. Do none of it without the lead's go.
3. AI family: from `aws/api/catalog/ai.json` (85 tables), propose the stand-alone AI APIs that each make a coherent product from tables already served. AI Patents API (1.41M AI patents) is decided; propose the others (for example models and benchmarks, incidents and safety, papers and research, policy and legislation on AI, companies and funding: whatever the tables really support). One table in the sketch `2026-11-12-aws-ai-family.html`: product name, its tables, rows, who buys it, price relative to the AI API (each is cheaper; the AI API includes them all). Open it. Message the lead.
4. On the lead's go for each approved product: its catalog file, spec, MCP tool set and submission sketch, one product at a time, quickest first.
