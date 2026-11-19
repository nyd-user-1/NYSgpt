import { NextResponse } from "next/server"

import { devUser } from "@/lib/housekeeping-people"

// POST { pk, sk }: in pax-trinity, writes and stores (with Claude on Bedrock) the prompt that would address a
// message. NYSgpt writes no prompts (lib/housekeeping.ts says why), so on the dev server this answers 501, and a
// production build answers 404.

export const runtime = "nodejs"

export async function POST() {
  if (!devUser()) return new NextResponse("Not found", { status: 404 })
  return NextResponse.json({ error: "Prompts are not written on NYSgpt." }, { status: 501 })
}
