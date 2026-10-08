import { NextResponse, type NextRequest } from "next/server";
import { checkout, choiceFrom } from "@/lib/api-access";

/** POST an API box's control panel → Stripe Checkout for the plan it built. */
export async function POST(req: NextRequest) {
  try {
    const url = await checkout(choiceFrom(await req.formData()), req.nextUrl.origin);
    return NextResponse.redirect(url, 303);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
