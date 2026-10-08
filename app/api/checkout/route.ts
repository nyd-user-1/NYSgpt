import { NextResponse, type NextRequest } from "next/server";
import { checkout } from "@/lib/api-access";

/** POST dataset=<slug|all> → Stripe Checkout for that API's monthly plan. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  try {
    const url = await checkout(String(form.get("dataset") ?? ""), req.nextUrl.origin);
    return NextResponse.redirect(url, 303);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
