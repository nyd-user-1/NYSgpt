import { NextResponse } from "next/server"

// /api/chat/follow-ups on NYSgpt (brief 46). pax-trinity's route asks Bedrock (Claude Haiku 4.5, 300 tokens) for
// three follow-up questions. Until a model is approved this returns three placeholders.

export const runtime = "nodejs"

export async function POST() {
  return NextResponse.json({ suggestions: ["Placeholder follow-up one", "Placeholder follow-up two", "Placeholder follow-up three"] })
}
