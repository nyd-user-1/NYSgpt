import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cookies } from "next/headers";
import {
  APIGatewayClient,
  CreateApiKeyCommand,
  CreateUsagePlanKeyCommand,
  DeleteApiKeyCommand,
  DeleteUsagePlanKeyCommand,
  GetApiKeyCommand,
  GetApiKeysCommand,
  GetUsageCommand,
  GetUsagePlanKeyCommand,
  UpdateApiKeyCommand,
  type ApiKey,
} from "@aws-sdk/client-api-gateway";
import { GetEntitlementsCommand, MarketplaceEntitlementServiceClient } from "@aws-sdk/client-marketplace-entitlement-service";
import { MarketplaceMeteringClient, ResolveCustomerCommand } from "@aws-sdk/client-marketplace-metering";
import { MarketplaceAgreementClient, SearchAgreementsCommand } from "@aws-sdk/client-marketplace-agreement";
import { MarketplaceDeploymentClient, PutDeploymentParameterCommand } from "@aws-sdk/client-marketplace-deployment";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import type { AwsPlan, AwsSubscription } from "@/components/MarketplaceViews";
import { CALLS, LICENSES } from "./api-pricing";

/**
 * AWS Marketplace for the data APIs (2026-10-24). A buyer subscribes on AWS
 * and is posted to /aws/subscribe with a token; the token resolves to their
 * AWS account and license, which ride in a signed cookie to /aws/register.
 * There they make or sign in to an account, and /api/aws/claim issues an API
 * Gateway key on the usage plan of the tier they bought and stores it in their
 * AWS account (Quick Launch). Listings made after 2026-06-01 identify a buyer
 * by license ARN, never by CustomerIdentifier. A key carries its license,
 * product, account, agreement and dimension as tags, which is how the
 * console and the EventBridge handler (aws/marketplace/index.mjs) find it.
 */

/** Each listing, by the product code AWS sends with a buyer. */
export const PRODUCTS: Record<string, { productId: string; dataset: string; name: string }> = {
  "8ol1aokeqoemqsr6hhjd3vph3": { productId: "prod-2sskaqhhle24w", dataset: "gov", name: "Legislative API" },
};

/** A dimension's API name is `<dataset>_<calls>_<license>`, e.g. gov_100k_commercial. */
const QUOTA: Record<string, number | null> = { "10k": 10_000, "100k": 100_000, "1m": 1_000_000, max: null };

export type Tier = { dimension: string; calls: (typeof CALLS)[number]; license: (typeof LICENSES)[number]; quota: number | null };

export function tierOf(dimension: string): Tier | null {
  const m = /^[a-z]+_(10k|100k|1m|unlimited)_(internal|commercial)$/.exec(dimension);
  if (!m) return null;
  const calls = CALLS.find((c) => c.id === (m[1] === "unlimited" ? "max" : m[1]))!;
  const license = LICENSES.find((l) => l.id === m[2])!;
  return { dimension, calls, license, quota: QUOTA[calls.id] };
}

const tablesOf = (dataset: string): number =>
  JSON.parse(readFileSync(join(process.cwd(), "public", "catalog", `${dataset}.json`), "utf8")).tables.length;

export function planFor(product: string, t: Tier): AwsPlan {
  const p = PRODUCTS[product];
  return {
    product: p.name,
    dataset: p.dataset,
    calls: t.calls.id === "max" ? "Unlimited calls" : `${t.calls.label} a month`,
    quota: t.quota,
    license: t.license.label,
    tables: tablesOf(p.dataset),
  };
}

const region = { region: "us-east-1" };
const metering = new MarketplaceMeteringClient(region);
const entitlements = new MarketplaceEntitlementServiceClient(region);
const agreements = new MarketplaceAgreementClient(region);
const deployment = new MarketplaceDeploymentClient(region);
const gateway = new APIGatewayClient(region);
const ssm = new SSMClient(region);

/* ── The registration cookie ─────────────────────────────────────────────── */

export type Pending = { license: string; account: string; product: string; at: number };
export const PENDING_COOKIE = "nysgpt_aws";
const DAY = 86_400_000;

let secret: Promise<string> | undefined;
const secretKey = () =>
  (secret ??= ssm
    .send(new GetParameterCommand({ Name: "/nysgpt/marketplace/cookie-secret", WithDecryption: true }))
    .then((r) => r.Parameter!.Value!)
    .catch((e) => {
      secret = undefined;
      throw e;
    }));

const mac = async (body: string) => createHmac("sha256", await secretKey()).update(body).digest();

export async function seal(p: Pending) {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${(await mac(body)).toString("base64url")}`;
}

export async function pending(): Promise<Pending | null> {
  const v = (await cookies()).get(PENDING_COOKIE)?.value;
  const [body, sig] = v?.split(".") ?? [];
  if (!body || !sig) return null;
  const want = await mac(body);
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Pending;
  return Date.now() - p.at < DAY ? p : null;
}

export const clearPending = async () => (await cookies()).delete(PENDING_COOKIE);

/* ── AWS Marketplace ─────────────────────────────────────────────────────── */

export async function resolve(token: string) {
  const r = await metering.send(new ResolveCustomerCommand({ RegistrationToken: token }));
  return { product: r.ProductCode ?? "", account: r.CustomerAWSAccountId ?? "", license: r.LicenseArn ?? "", customer: r.CustomerIdentifier ?? "" };
}

/** The tier a license is entitled to now, with its end date; null once it has ended or before AWS confirms it. */
export async function entitlementOf(product: string, license: string) {
  const r = await entitlements.send(new GetEntitlementsCommand({ ProductCode: product, Filter: { LICENSE_ARN: [license] } }));
  for (const e of r.Entitlements ?? []) {
    const t = e.Dimension ? tierOf(e.Dimension) : null;
    if (t) return { ...t, expires: e.ExpirationDate ?? null };
  }
  return null;
}

async function agreementOf(license: string) {
  const r = await agreements.send(
    new SearchAgreementsCommand({
      catalog: "AWSMarketplace",
      filters: [
        { name: "PartyType", values: ["Proposer"] },
        { name: "AgreementType", values: ["PurchaseAgreement"] },
        { name: "LicenseArn", values: [license] },
      ],
    }),
  );
  return r.agreementViewSummaries?.[0]?.agreementId ?? null;
}

/** Quick Launch: the key, stored in the buyer's AWS Secrets Manager. */
async function deliver(productId: string, agreementId: string, value: string) {
  await deployment.send(
    new PutDeploymentParameterCommand({
      catalog: "AWSMarketplace",
      productId,
      agreementId,
      deploymentParameter: { name: "api-key", secretString: value },
      expirationDate: new Date(Date.now() + 365 * DAY),
    }),
  );
}

/* ── Keys ────────────────────────────────────────────────────────────────── */

const nameOf = (license: string) => `mp-${license.split(/[:/]/).pop()}`;
/** API Gateway tag values allow letters, digits, spaces and _ . : / = + - @ only. */
const tagSafe = (s: string) => s.replace(/[^\p{L}\p{N} _.:/=+\-@]/gu, " ").trim().slice(0, 256);

async function marketplaceKeys(): Promise<ApiKey[]> {
  const out: ApiKey[] = [];
  let position: string | undefined;
  do {
    const r = await gateway.send(new GetApiKeysCommand({ nameQuery: "mp-", includeValues: true, limit: 500, position }));
    out.push(...(r.items ?? []));
    position = r.position;
  } while (position);
  return out;
}

async function currentPlan(keyId: string) {
  const plans = await Promise.all(
    CALLS.map((c) => gateway.send(new GetUsagePlanKeyCommand({ usagePlanId: c.plan, keyId })).then(() => c.plan, () => null)),
  );
  return plans.find(Boolean) ?? null;
}

async function placeOn(keyId: string, plan: string) {
  const now = await currentPlan(keyId);
  if (now === plan) return;
  if (now) await gateway.send(new DeleteUsagePlanKeyCommand({ usagePlanId: now, keyId }));
  await gateway.send(new CreateUsagePlanKeyCommand({ usagePlanId: plan, keyId, keyType: "API_KEY" }));
}

async function newKey(name: string, description: string, tags: Record<string, string>) {
  return gateway.send(new CreateApiKeyCommand({ name, enabled: true, description, tags }));
}

/**
 * The buyer's key for this subscription, issued on the plan of the tier they
 * bought and delivered to their AWS account. "unconfirmed" until AWS reports
 * the entitlement; "taken" when another nysgpt.com account registered it.
 */
export async function claim(p: Pending, email: string, company: string): Promise<"ok" | "unconfirmed" | "taken"> {
  const product = PRODUCTS[p.product];
  const tier = product ? await entitlementOf(p.product, p.license) : null;
  if (!product || !tier) return "unconfirmed";
  const agreement = await agreementOf(p.license).catch(() => null);

  let key = (await marketplaceKeys()).find((k) => k.tags?.mpLicense === p.license);
  if (key && key.tags?.email !== email) return "taken";
  if (!key) {
    key = await newKey(nameOf(p.license), `scope:${product.dataset}:* · aws:${p.account} · ${email}`, {
      mpLicense: p.license,
      mpProduct: p.product,
      mpAccount: p.account,
      mpDimension: tier.dimension,
      email,
      ...(agreement ? { mpAgreement: agreement } : {}),
      ...(company.trim() ? { company: tagSafe(company) } : {}),
    });
  } else if (!key.enabled) {
    await gateway.send(new UpdateApiKeyCommand({ apiKey: key.id!, patchOperations: [{ op: "replace", path: "/enabled", value: "true" }] }));
  }
  await placeOn(key.id!, tier.calls.plan);
  if (agreement) await deliver(product.productId, agreement, key.value!).catch((e) => console.error("PutDeploymentParameter", e));
  return "ok";
}

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

async function usedThisMonth(keyId: string, plan: string) {
  const now = new Date();
  const r = await gateway.send(
    new GetUsageCommand({
      usagePlanId: plan,
      keyId,
      startDate: `${now.toISOString().slice(0, 7)}-01`,
      endDate: now.toISOString().slice(0, 10),
    }),
  );
  return Object.values(r.items ?? {}).flat().reduce((s, day) => s + (day?.[0] ?? 0), 0);
}

/** Every AWS Marketplace subscription registered to this nysgpt.com account, as its console shows it. */
export async function subscriptionsOf(email: string): Promise<AwsSubscription[]> {
  const mine = (await marketplaceKeys()).filter((k) => k.tags?.email === email && k.tags.mpProduct && PRODUCTS[k.tags.mpProduct]);
  const subs = await Promise.all(
    mine.map(async (k): Promise<AwsSubscription | null> => {
      const tags = k.tags!;
      const live = await entitlementOf(tags.mpProduct, tags.mpLicense).catch(() => null);
      const tier = live ?? tierOf(tags.mpDimension ?? "");
      if (!tier) return null;
      const plan = (await currentPlan(k.id!)) ?? tier.calls.plan;
      const now = new Date();
      return {
        ...planFor(tags.mpProduct, tier),
        status: live && k.enabled ? "active" : "ended",
        until: live?.expires ? fmtDate(live.expires) : null,
        keyId: k.id!,
        key: k.value!,
        used: await usedThisMonth(k.id!, plan).catch(() => 0),
        resets: fmtDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))).replace(/, \d{4}$/, ""),
      };
    }),
  );
  return subs.filter((s): s is AwsSubscription => s !== null);
}

/** A new key for the subscription; the old one stops working at once. */
export async function rotate(email: string, keyId: string) {
  const old = await gateway.send(new GetApiKeyCommand({ apiKey: keyId, includeValue: false }));
  const tags = old.tags ?? {};
  if (tags.email !== email || !PRODUCTS[tags.mpProduct]) return false;
  const plan = (await currentPlan(keyId)) ?? tierOf(tags.mpDimension ?? "")?.calls.plan;
  if (!plan) return false;
  const fresh = await newKey(old.name!, old.description ?? "", tags);
  await placeOn(fresh.id!, plan);
  await gateway.send(new DeleteApiKeyCommand({ apiKey: keyId }));
  if (tags.mpAgreement) {
    await deliver(PRODUCTS[tags.mpProduct].productId, tags.mpAgreement, fresh.value!).catch((e) => console.error("PutDeploymentParameter", e));
  }
  return true;
}
