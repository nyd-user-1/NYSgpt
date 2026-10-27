import { ExecuteStatementCommand, RDSDataClient } from "@aws-sdk/client-rds-data";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isProductUrl } from "@/lib/gate";
import { LIMITS, within } from "@/lib/limits";

/**
 * One knock on a product, from components/ProductStatus (2026-10-07). Each
 * product's Aurora cluster pauses when idle; a `select 1` over the Data API
 * is what resumes it, and it fails with DatabaseResumingException until the
 * cluster is up. The product's page is loaded alongside, with the site
 * password, so its server is warm too. The homepage calls this until it
 * answers `ready`, and every few minutes after. Signed-in readers only,
 * product hosts only, and at most LIMITS.wakes knocks per account per day.
 *
 * The role (nysgpt-amplify-compute) may run statements on these clusters
 * and read their secrets, nothing else. 44B's cluster (b44) was deleted
 * 10-15, so its host is checked by its page alone.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ACCOUNT = "arn:aws:rds:us-east-1:638175140432:cluster";
const SECRET = "arn:aws:secretsmanager:us-east-1:638175140432:secret";

/** Product host → its cluster, secret and database. */
const DATABASES: Record<string, { cluster: string; secret: string; database: string }> = {
  "amplify.d30k1ocuoke6r4.amplifyapp.com": { cluster: "childcare", secret: "rds!cluster-bbe4fe60-ee32-4bf8-9994-67985de204c9-HmzZBa", database: "childcare" },
  "amplify.d3ekz2nd1zxars.amplifyapp.com": { cluster: "leuk", secret: "rds!cluster-0765911c-d2fa-4cb6-ab7c-37d894c83b4b-IugwnE", database: "leuk" },
  "main.d2bart0mempmp5.amplifyapp.com": { cluster: "solar", secret: "rds!cluster-be75506a-a452-4fb8-91f3-04bca767adf0-jS457V", database: "solar" },
  "amplify.d1xhvbmv1jbfz9.amplifyapp.com": { cluster: "insurance", secret: "rds!cluster-1ab764bb-5f80-4f41-9770-06fb8b8a12ec-7HJ4Wh", database: "insurance" },
  "policy.nysgpt.com": { cluster: "govblock", secret: "rds!cluster-ee58a523-8533-4ef9-8436-a38afeb469ec-OYP1jc", database: "policy" },
  "amplify.duruug4qfhs29.amplifyapp.com": { cluster: "nsr", secret: "rds!cluster-7939e7b3-a70e-444e-a851-d93a4f14aea1-JNOYBn", database: "nsr" },
  "amplify.d3nv15140uwc0s.amplifyapp.com": { cluster: "sports", secret: "rds!cluster-155ee307-3be6-4ade-b2f3-728024bdaed6-XZJhHP", database: "sports" },
  "amplify.d2yna3j4fmb5io.amplifyapp.com": { cluster: "tariffs", secret: "rds!cluster-8f84eea9-738b-4419-b790-f8896404ddfc-0ehFVQ", database: "tariffs" },
};

const BASIC = process.env.DEMO_BASIC_AUTH;
const rds = new RDSDataClient({ region: "us-east-1" });

/** True once the product's cluster answers; false while it is resuming. */
async function databaseUp(host: string): Promise<boolean> {
  const db = DATABASES[host];
  if (!db) return true;
  try {
    await rds.send(new ExecuteStatementCommand({ resourceArn: `${ACCOUNT}:${db.cluster}`, secretArn: `${SECRET}:${db.secret}`, database: db.database, sql: "select 1" }), { abortSignal: AbortSignal.timeout(25_000) });
    return true;
  } catch (e) {
    console.error("warm:", db.cluster, (e as Error).name, (e as Error).message.slice(0, 200));
    return false;
  }
}

/** True once the page itself answers without a server error. */
async function pageUp(to: string): Promise<boolean> {
  try {
    const res = await fetch(to, {
      headers: BASIC ? { authorization: `Basic ${Buffer.from(BASIC).toString("base64")}` } : {},
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const to = new URL(req.url).searchParams.get("to") ?? "";
  if (!isProductUrl(to)) return NextResponse.json({ error: "not a product" }, { status: 400 });
  if (!(await within(`wake#${user.email}`, LIMITS.wakes))) return NextResponse.json({ limited: true }, { status: 429 });
  const [db, page] = await Promise.all([databaseUp(new URL(to).host), pageUp(to)]);
  return NextResponse.json({ ready: db && page }, { headers: { "cache-control": "no-store" } });
}
