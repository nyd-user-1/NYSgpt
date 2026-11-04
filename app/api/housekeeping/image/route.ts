import { NextResponse } from "next/server"

import { currentUser } from "@/lib/auth"
import { imageUrl } from "@/lib/housekeeping"

// A Housekeeping screenshot: admins only, by way of a ten-minute signed link to the private object.
export const runtime = "nodejs"

export async function GET(req: Request) {
  const user = await currentUser()
  if (!user?.admin) return NextResponse.json({ error: "Admins only." }, { status: 403 })
  const key = new URL(req.url).searchParams.get("key") ?? ""
  try {
    return NextResponse.redirect(await imageUrl(key))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
