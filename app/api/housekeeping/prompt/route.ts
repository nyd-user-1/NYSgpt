import { NextResponse } from "next/server"

import { currentUser } from "@/lib/auth"
import { canonical, getMessage, writePrompt } from "@/lib/housekeeping"

// POST { pk, sk }: writes and stores the prompt that would address a message (lib/housekeeping.ts).
// The pointer asks for it the moment a comment is sent, so an admin may start it for their own
// message; the super admin, for any. Only the super admin gets the prompt back.

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const user = await currentUser()
  if (!user?.admin || user.demo) return NextResponse.json({ error: "Admins only." }, { status: 403 })
  const body = (await req.json().catch(() => null)) as { pk?: string; sk?: string } | null
  if (!body?.pk || !body.sk) return NextResponse.json({ error: "Which message?" }, { status: 400 })
  const key = { pk: body.pk, sk: body.sk }
  try {
    const m = await getMessage(key)
    if (!m) return NextResponse.json({ error: "No such message." }, { status: 404 })
    if (!user.superAdmin && m.author !== canonical(user.email)) return NextResponse.json({ error: "Only the super admin." }, { status: 403 })
    const prompt = await writePrompt(key)
    return NextResponse.json(user.superAdmin ? { prompt } : { ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
