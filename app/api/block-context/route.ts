import { NextResponse } from "next/server"

// /api/block-context on NYSgpt (brief 46). pax-trinity reads a dropped block's page for the chat's context; NYSgpt
// does not yet.

export const runtime = "nodejs"

export async function POST() {
  return NextResponse.json({ error: "Block context is not connected on NYSgpt." }, { status: 501 })
}
