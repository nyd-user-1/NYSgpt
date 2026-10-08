import { NextResponse, type NextRequest } from "next/server";
import { choiceFrom, freeKey } from "@/lib/api-access";

/** POST an API box's control panel on its free tier → a key at once, shown on /api-access. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const page = await freeKey(choiceFrom(form), String(form.get("email") ?? ""));
    return NextResponse.redirect(new URL(page, req.nextUrl.origin), 303);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
