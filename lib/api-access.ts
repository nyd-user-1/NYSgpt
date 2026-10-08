import "server-only";

import { APIGatewayClient, CreateApiKeyCommand, CreateUsagePlanKeyCommand, GetApiKeysCommand } from "@aws-sdk/client-api-gateway";

/**
 * Buying API access (2026-10-08): Stripe Checkout takes the subscription, and
 * the return page issues an API Gateway key on the Pro usage plan, named for
 * the checkout session so a reload shows the same key instead of minting
 * another. The key's description carries the datasets it may read; the API's
 * Lambda (aws/api/index.mjs) enforces it.
 */
export const PLANS = {
  one: { amount: 19_900, label: "Pro", per: "month", calls: "100,000 calls a month" },
  all: { amount: 99_900, label: "All APIs", per: "month", calls: "100,000 calls a month across every dataset" },
} as const;

/** The datasets on sale, by slug, as the API names them. */
export const DATASETS: Record<string, string> = {
  ai: "AI", childcare: "Childcare", energy: "Energy", gov: "Gov", health: "Health",
  insurance: "Insurance", science: "Science", solar: "Solar", sports: "Sports", tariffs: "Tariffs",
};

const PRO_PLAN = "ty621f";
const gateway = new APIGatewayClient({ region: "us-east-1" });

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

/** A Checkout Session for one dataset, or every one ("all"). Returns the URL to send the buyer to. */
export async function checkout(dataset: string, origin: string) {
  const all = dataset === "all";
  if (!all && !DATASETS[dataset]) throw new Error("No such dataset.");
  const plan = all ? PLANS.all : PLANS.one;
  const name = all ? "NYSgpt API: every dataset" : `NYSgpt ${DATASETS[dataset]} API`;
  const session = await stripe("checkout/sessions", {
    mode: "subscription",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(plan.amount),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": name,
    "line_items[0][price_data][product_data][description]": plan.calls,
    "metadata[datasets]": all ? "*" : dataset,
    "subscription_data[metadata][datasets]": all ? "*" : dataset,
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
  const datasets: string = session.metadata?.datasets ?? "*";
  const name = `stripe-${session.id}`;
  const found = await gateway.send(new GetApiKeysCommand({ nameQuery: name, includeValues: true }));
  let value = found.items?.find((k) => k.name === name)?.value;
  if (!value) {
    const key = await gateway.send(new CreateApiKeyCommand({
      name, enabled: true,
      description: `datasets:${datasets} · ${session.customer_details?.email ?? ""} · ${session.subscription ?? ""}`,
    }));
    await gateway.send(new CreateUsagePlanKeyCommand({ usagePlanId: PRO_PLAN, keyId: key.id!, keyType: "API_KEY" }));
    value = key.value;
  }
  return { key: value!, datasets: datasets === "*" ? Object.keys(DATASETS) : [datasets], email: session.customer_details?.email as string | undefined };
}
