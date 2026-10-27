import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { rotate } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/** Replaces the signed-in reader's AWS Marketplace key; the old one stops working at once. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { keyId = "" } = (await req.json().catch(() => ({}))) as { keyId?: string };

  try {
    const r = await rotate(user.email, keyId);
    if (r === "missing") return NextResponse.json({ error: "That key is not on this account." }, { status: 404 });
    if (r === "ended") return NextResponse.json({ error: "This subscription has ended. Subscribe again in AWS Marketplace for a new key." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("aws rotate", e);
    return NextResponse.json({ error: "The key could not be rotated. Try again, or email Brendan@nysgpt.com." }, { status: 500 });
  }
}
