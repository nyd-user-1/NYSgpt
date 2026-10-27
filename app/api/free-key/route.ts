import { NextResponse, type NextRequest } from "next/server";
import { FreeKeyLimit, choiceFrom, freeKey } from "@/lib/api-access";

/** The caller's address: CloudFront's own header when it is forwarded, else the first X-Forwarded-For hop. */
function addressOf(req: NextRequest) {
  const viewer = req.headers.get("cloudfront-viewer-address");
  if (viewer) return viewer.slice(0, viewer.lastIndexOf(":"));
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

/** POST an API box's control panel on its free tier → a key at once, shown on /api-access. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const page = await freeKey(choiceFrom(form), String(form.get("email") ?? ""), addressOf(req));
    return NextResponse.redirect(new URL(page, req.nextUrl.origin), 303);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof FreeKeyLimit ? 429 : 400 });
  }
}
