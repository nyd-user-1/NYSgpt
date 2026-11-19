import { NextResponse } from "next/server"

// /api/chat/brief-send on NYSgpt (brief 46). pax-trinity mails a brief through its partner mailboxes; NYSgpt has none.

export const runtime = "nodejs"

export async function POST() {
  return NextResponse.json({ error: "Sending a brief is not connected on NYSgpt." }, { status: 501 })
}
