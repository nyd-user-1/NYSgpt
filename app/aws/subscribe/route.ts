import { createHash, randomBytes } from "node:crypto";
import { ExecuteStatementCommand, RDSDataClient, type SqlParameter } from "@aws-sdk/client-rds-data";
import { MarketplaceMeteringClient, ResolveCustomerCommand } from "@aws-sdk/client-marketplace-metering";

/**
 * AWS Marketplace's registration page for the 44B MCP server (2026-10-08).
 * When a buyer subscribes, AWS posts here with `x-amzn-marketplace-token`; the
 * token resolves to the buyer's customer id, and the page mints them a 44B key
 * (`sk44b_`, the key /api/mcp and /api/v1 accept), shown once. A buyer who comes
 * back gets a fresh key and the old one is revoked, since only the hash is kept.
 *
 * The buyer is a 44B user `aws-<customer id>@marketplace.nysgpt.com` on the Pro
 * plan, written straight to the b44 cluster over the Data API, the same rows
 * 44B's own account page writes (src/lib/accounts.ts in ~/Code/44b).
 */

const db = new RDSDataClient({ region: "us-east-1" });
const metering = new MarketplaceMeteringClient({ region: "us-east-1" });
const B44 = {
  resourceArn: "arn:aws:rds:us-east-1:638175140432:cluster:b44",
  secretArn: "arn:aws:secretsmanager:us-east-1:638175140432:secret:44b/demo/aurora-u1Apjo",
  database: "b44",
};
const MCP = "https://44b.nysgpt.com/api/mcp";

async function sql(statement: string, params: Record<string, string> = {}) {
  const parameters: SqlParameter[] = Object.entries(params).map(([name, v]) => ({ name, value: { stringValue: v } }));
  for (let i = 0; ; i++) {
    try {
      const r = await db.send(new ExecuteStatementCommand({ ...B44, sql: statement, parameters, formatRecordsAs: "JSON" }));
      return JSON.parse(r.formattedRecords || "[]") as Record<string, string>[];
    } catch (e) {
      if ((e as Error).name !== "DatabaseResumingException" || i >= 10) throw e;
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
}

const page = (body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NYSgpt · 44B MCP</title>
<body style="margin:0;font:16px/1.6 ui-sans-serif,system-ui;background:#fafafa;color:#111"><main style="max-width:640px;margin:0 auto;padding:72px 24px">${body}</main></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("x-amzn-marketplace-token") ?? "");
  if (!token) return page("<h1>No subscription token</h1><p>Open this page from your AWS Marketplace subscription.</p>", 400);

  let customer: string, account: string;
  try {
    const r = await metering.send(new ResolveCustomerCommand({ RegistrationToken: token }));
    customer = r.CustomerIdentifier!;
    account = r.CustomerAWSAccountId ?? "";
  } catch {
    return page("<h1>That subscription could not be confirmed</h1><p>The token from AWS has expired or is not valid. Return to your AWS Marketplace subscription and choose <b>Set up your account</b> again.</p>", 400);
  }

  const email = `aws-${customer.toLowerCase()}@marketplace.nysgpt.com`;
  const [user] = await sql(
    `insert into users (email, password_hash, role, display_name) values (:email, '!aws-marketplace', 'developer', :name)
     on conflict (email) do update set email = excluded.email returning id`,
    { email, name: `AWS ${account || customer}` },
  );
  await sql(`insert into profiles (user_id, plan) values (:id, 'pro') on conflict (user_id) do update set plan = 'pro', updated_at = now()`, { id: user.id });
  await sql(`update api_keys set revoked_at = now() where user_id = :id and name = 'aws-marketplace' and revoked_at is null`, { id: user.id });
  const key = "sk44b_" + randomBytes(20).toString("hex");
  await sql(`insert into api_keys (user_id, key_hash, key_prefix, name) values (:id, :hash, :prefix, 'aws-marketplace')`, {
    id: user.id,
    hash: createHash("sha256").update(key).digest("hex"),
    prefix: key.slice(0, 12),
  });

  const config = JSON.stringify({ mcpServers: { "44b": { type: "http", url: MCP, headers: { Authorization: `Bearer ${key}` } } } }, null, 2);
  return page(`<h1 style="font:400 40px/1.1 Georgia,serif;margin:0">Your 44B MCP key</h1>
<p style="color:#666">Shown once. Coming back to this page from AWS issues a new key and retires this one.</p>
<pre style="background:#111;color:#fcd34d;padding:16px 20px;border-radius:12px;overflow-x:auto">${esc(key)}</pre>
<h2 style="font-size:16px;margin-top:40px">Connect it</h2>
<p>Add this to your MCP client (Claude Code, Claude Desktop, Cursor):</p>
<pre style="background:#fff;border:1px solid #ddd;padding:16px 20px;border-radius:12px;overflow-x:auto;font-size:13px">${esc(config)}</pre>
<p style="color:#666;font-size:14px">Server: ${MCP} · Support: Brendan@nysgpt.com</p>`);
}

/** A visit without AWS's post: say where the page is reached from. */
export function GET() {
  return page("<h1>44B MCP on AWS Marketplace</h1><p>This page is where AWS sends you after you subscribe. Open it from your AWS Marketplace subscription.</p>");
}
