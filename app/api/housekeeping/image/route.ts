import { NextResponse } from "next/server"

import { imageFile } from "@/lib/housekeeping"
import { devUser } from "@/lib/housekeeping-people"

// A Dev Comments screenshot, from the store's folder on the dev server. A production build answers 404.
export const runtime = "nodejs"

export async function GET(req: Request) {
  if (!devUser()) return new NextResponse("Not found", { status: 404 })
  const key = new URL(req.url).searchParams.get("key") ?? ""
  try {
    const { body, type } = await imageFile(key)
    return new NextResponse(new Uint8Array(body), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=600" } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
