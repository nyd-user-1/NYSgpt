# Data Library (paid access to the research tables)

- `query_api.py`: Lambda `nysgpt-query-api` (Old account, us-east-1). Free tier by caller address, buyer keys in DynamoDB `nysgpt-data-keys`, Stripe checkout at `/checkout?plan=day|month|inst`, key shown at `/claim?session_id=`. Secrets in SSM under `/query-api/` (`key`, `stripe-key`, `proxy-secret`, `mcp-registry-key`).
- `proxy/`: Cloudflare Worker `nysgpt-data-api` serving `data.nysgpt.com`; set `PROXY_SECRET` with `wrangler secret put`.
- `server.json`: listing in the official MCP registry as `com.nysgpt/data-library` (proof file `public/.well-known/mcp-registry-auth`).
- `hf-samples.sh`, `hf-samples.tsv`: the ten Hugging Face sample datasets.
- Pages: `scripts/data-pages.mjs` writes `public/data/`; Amplify rewrite rules map `/data/<slug>` to the `.html` files.
- Stripe product `prod_VdsOXWSYA0G68U`; prices are named in `query_api.py`.
