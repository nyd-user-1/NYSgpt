import { NextResponse } from "next/server";
import { PENDING_COOKIE, PRODUCTS, resolve, seal } from "@/lib/marketplace";

/**
 * The fulfillment URL of every NYSgpt listing on AWS Marketplace. When a buyer
 * subscribes, AWS posts here with `x-amzn-marketplace-token`; the token
 * resolves to their account, license and product. A data API listing
 * (lib/marketplace.ts PRODUCTS) goes on to /aws/register with the license in a
 * signed cookie. Any other product code answers 404: the retired 44B MCP flow
 * that used to catch it issued keys with no entitlement check (security report
 * F9), so a listing must be in PRODUCTS before it points here.
 */

const page = (body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NYSgpt · AWS Marketplace</title>
<body style="margin:0;font:16px/1.6 ui-sans-serif,system-ui;background:#fafafa;color:#111"><main style="max-width:640px;margin:0 auto;padding:72px 24px">${body}</main></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("x-amzn-marketplace-token") ?? "");
  if (!token) return page("<h1>No subscription token</h1><p>Open this page from your AWS Marketplace subscription.</p>", 400);

  let r: Awaited<ReturnType<typeof resolve>>;
  try {
    r = await resolve(token);
  } catch {
    return page("<h1>That subscription could not be confirmed</h1><p>The token from AWS has expired or is not valid. Return to your AWS Marketplace subscription and choose <b>Set up your account</b> again.</p>", 400);
  }

  if (!PRODUCTS[r.product]) {
    console.error("aws/subscribe: unknown product code", r.product);
    return page("<h1>This product isn't set up yet</h1><p>Write to Brendan@nysgpt.com with your AWS account ID and I'll finish your setup.</p>", 404);
  }

  const res = new NextResponse(null, { status: 303, headers: { Location: "/aws/register" } });
  const value = await seal({ license: r.license, account: r.account, product: r.product, at: Date.now() });
  res.cookies.set(PENDING_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 86_400, path: "/" });
  return res;
}

/** A visit without AWS's post: say where the page is reached from. */
export function GET() {
  return page("<h1>NYSgpt on AWS Marketplace</h1><p>This page is where AWS sends you after you subscribe. Open it from your AWS Marketplace subscription.</p>");
}
