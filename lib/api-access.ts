import "server-only";

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APIGatewayClient, CreateApiKeyCommand, CreateUsagePlanKeyCommand, GetApiKeyCommand, GetApiKeysCommand } from "@aws-sdk/client-api-gateway";
import { CALLS, LICENSES, TERMS, hasFreeTier, price, type Choice } from "./api-pricing";
import { LIMITS, within } from "./limits";

/**
 * Buying API access (2026-10-08). The reader builds a plan in an API box's
 * control panel; a free plan gets its key at once (freeKey), a paid one goes
 * through Stripe Checkout and gets its key on the page Stripe returns to
 * (keyFor). Either way the key sits on its calls tier's usage plan and its
 * description carries its scope, "scope:<dataset>:<tables|*>", which the
 * API's Lambda (aws/api/index.mjs) enforces.
 */

/** The datasets on sale, by slug, as the API names them. */
export const DATASETS: Record<string, string> = {
  ai: "AI", childcare: "Childcare", energy: "Energy", gov: "Gov", health: "Health",
  insurance: "Insurance", science: "Science", solar: "Solar", sports: "Sports", tariffs: "Tariffs",
};

const gateway = new APIGatewayClient({ region: "us-east-1" });

/** A dataset's tables and their rows, from the catalog the homepage serves. */
function rowsOf(dataset: string): Record<string, number> {
  const c = JSON.parse(readFileSync(join(process.cwd(), "public", "catalog", `${dataset}.json`), "utf8"));
  return Object.fromEntries(c.tables.map((t: { path: string; rows: number }) => [t.path, t.rows]));
}

/** The reader's choices from a posted control panel, checked against what is on sale. */
export function choiceFrom(form: FormData): Choice & { all: boolean } {
  const dataset = String(form.get("dataset") ?? "");
  if (!DATASETS[dataset]) throw new Error("No such dataset.");
  const rows = rowsOf(dataset);
  const raw = String(form.get("tables") ?? "*");
  const all = raw === "*";
  const tables = all ? Object.keys(rows) : raw.split(",").filter((t) => t in rows);
  if (!tables.length) throw new Error("Choose at least one table.");
  const pick = <T extends { id: string }>(list: readonly T[], v: unknown) => (list.find((x) => x.id === v) ?? list[0]).id;
  return { dataset, tables, all, calls: pick(CALLS, form.get("calls")), term: pick(TERMS, form.get("term")), license: pick(LICENSES, form.get("license")) };
}

const scopeOf = (c: Choice & { all: boolean }) => `scope:${c.dataset}:${c.all ? "*" : c.tables.join(",")}`;

/** The key named `name`, or a new one; `beforeCreate` runs (and may throw) only when a key is about to be made. */
async function issue(name: string, plan: string, description: string, beforeCreate?: () => Promise<void>) {
  const found = await gateway.send(new GetApiKeysCommand({ nameQuery: name, includeValues: true }));
  const existing = found.items?.find((k) => k.name === name);
  if (existing?.value) return existing.value;
  await beforeCreate?.();
  const key = await gateway.send(new CreateApiKeyCommand({ name, enabled: true, description }));
  await gateway.send(new CreateUsagePlanKeyCommand({ usagePlanId: plan, keyId: key.id!, keyType: "API_KEY" }));
  return key.value!;
}

/** The link that shows a free key once more: its id, signed so ids cannot be guessed into values. */
const sign = (id: string) => createHmac("sha256", process.env.STRIPE_SECRET_KEY ?? "nysgpt").update(id).digest("hex").slice(0, 32);

/** Thrown when a day's free keys are spent; the route answers 429. */
export class FreeKeyLimit extends Error {
  name = "FreeKeyLimit";
}

/**
 * A free key (1,000 calls a month) for the chosen tables, issued now. Returns
 * the page that shows it. New keys are capped per address and site-wide each
 * day (security report F2): the address can be forged, so the site-wide cap is
 * the one that keeps the account's 10,000-key quota for paying buyers.
 */
export async function freeKey(c: Choice & { all: boolean }, email: string, address: string) {
  if (!hasFreeTier(c.dataset)) throw new Error(`The ${DATASETS[c.dataset]} API has no free tier.`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter an email address.");
  const name = `free-${c.dataset}-${email.toLowerCase()}`;
  await issue(name, CALLS[0].plan, `${scopeOf(c)} · free · ${email}`, async () => {
    if (!(await within(`free-key#${address}`, LIMITS.freeKeysPerAddress)) || !(await within("free-key", LIMITS.freeKeys)))
      throw new FreeKeyLimit("Free keys are paused for today. Try again tomorrow.");
  });
  const found = await gateway.send(new GetApiKeysCommand({ nameQuery: name }));
  const id = found.items!.find((k) => k.name === name)!.id!;
  return `/api-access?key=${id}&sig=${sign(id)}`;
}

/** A free key's value, from its signed link. */
export async function freeKeyFrom(id: string, sig: string) {
  if (sign(id) !== sig) return null;
  const k = await gateway.send(new GetApiKeyCommand({ apiKey: id, includeValue: true }));
  const scope = /scope:([^:]+):(\S+)/.exec(k.description ?? "");
  return k.value && scope ? { key: k.value, dataset: scope[1], tables: scope[2], calls: CALLS[0].label } : null;
}

async function stripe(path: string, body?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body ? new URLSearchParams(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
  return json;
}

/** A Checkout Session for the plan, priced here from the choices (never from the browser). Returns its URL. */
export async function checkout(c: Choice & { all: boolean }, origin: string) {
  const amount = price(c, rowsOf(c.dataset));
  if (!amount) throw new Error("That plan is free: no checkout needed.");
  const term = TERMS.find((t) => t.id === c.term)!;
  const calls = CALLS.find((x) => x.id === c.calls)!;
  const license = LICENSES.find((x) => x.id === c.license)!;
  const scope = scopeOf(c);
  const session = await stripe("checkout/sessions", {
    mode: "subscription",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(amount * 100),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][recurring][interval_count]": String(term.months),
    "line_items[0][price_data][product_data][name]": `NYSgpt ${DATASETS[c.dataset]} API`,
    "line_items[0][price_data][product_data][description]": `${c.all ? "Every table" : `${c.tables.length} tables`} · ${calls.label} a month · ${license.label}`,
    // Stripe holds 500 characters a value; a long table list is kept on the key, not here.
    "metadata[scope]": scope.length <= 500 ? scope : `scope:${c.dataset}:*`,
    "metadata[plan]": calls.plan,
    success_url: `${origin}/api-access?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/`,
    allow_promotion_codes: "true",
  });
  return session.url as string;
}

/** The key for a paid checkout session: the one already issued, or a new one. Null until Stripe marks it paid. */
export async function keyFor(sessionId: string) {
  const session = await stripe(`checkout/sessions/${encodeURIComponent(sessionId)}`);
  if (session.status !== "complete" || session.payment_status === "unpaid") return null;
  const scope: string = session.metadata?.scope ?? "";
  const plan: string = session.metadata?.plan || CALLS[2].plan;
  const email: string | undefined = session.customer_details?.email;
  const key = await issue(`stripe-${session.id}`, plan, `${scope} · ${email ?? ""} · ${session.subscription ?? ""}`);
  const m = /scope:([^:]+):(\S+)/.exec(scope);
  return { key, dataset: m?.[1] ?? "", tables: m?.[2] ?? "*", calls: CALLS.find((x) => x.plan === plan)?.label ?? "", email };
}
