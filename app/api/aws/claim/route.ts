import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { claim, clearPending, pending } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/** Issues the signed-in reader's key for the AWS Marketplace subscription in their registration cookie. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = await pending().catch(() => null);
  if (!p) return NextResponse.json({ error: "Open this page from your AWS Marketplace subscription again." }, { status: 400 });
  const { company = "" } = (await req.json().catch(() => ({}))) as { company?: string };

  try {
    const r = await claim(p, user.email, company);
    if (r === "unconfirmed") return NextResponse.json({ error: "AWS has not confirmed the payment yet. Try again in a minute." }, { status: 409 });
    if (r === "taken") return NextResponse.json({ error: "This subscription is registered to another account. Sign in with that account." }, { status: 409 });
    await clearPending();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("aws claim", e);
    return NextResponse.json({ error: "The key could not be issued. Try again, or email Brendan@nysgpt.com." }, { status: 500 });
  }
}
