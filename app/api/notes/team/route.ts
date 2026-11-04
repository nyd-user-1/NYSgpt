import { NextResponse } from "next/server"

import { currentUser } from "@/lib/auth"

// A note posted to the team (2026-11-04), ported from pax-trinity's app/api/notes/team: the note's text
// and the page it was written on, fanned out to Slack and Discord. Each place is wired to env and stays
// quiet until its variable is set:
//
//   SLACK_BOT_TOKEN          the Slack bot token (chat:write); Slack is off without it
//   NOTES_SLACK_CHANNEL      the Slack channel id the note posts to
//   NOTES_DISCORD_WEBHOOK    the Discord channel's webhook URL; Discord is off without it
//
//   GET  → { slack, discord }: which places can take a post now (nothing is posted to find out)
//   POST { text, url } → { results: [{ place, ok, error? }] }, one post a place

export const dynamic = "force-dynamic"

const MAX = 3500

const wired = () => ({
  slack: !!(process.env.SLACK_BOT_TOKEN && process.env.NOTES_SLACK_CHANNEL),
  discord: !!process.env.NOTES_DISCORD_WEBHOOK,
})

export async function GET() {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  return NextResponse.json(wired())
}

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { text?: unknown; url?: unknown } | null
  const text = typeof body?.text === "string" ? body.text.trim() : ""
  if (!text) return NextResponse.json({ error: "The note is empty." }, { status: 400 })
  if (text.length > MAX) return NextResponse.json({ error: `A note to the team runs to ${MAX} characters.` }, { status: 400 })
  const url = typeof body?.url === "string" && /^https?:\/\//.test(body.url) ? body.url.slice(0, 600) : ""
  const out = `${text}${url ? `\n\n${url}` : ""}\n— ${user.email}`

  const on = wired()
  const post = async (place: "slack" | "discord"): Promise<{ place: string; ok: boolean; error?: string }> => {
    if (!on[place]) return { place, ok: false, error: `${place === "slack" ? "Slack" : "Discord"} isn't connected.` }
    try {
      const res =
        place === "slack"
          ? await fetch("https://slack.com/api/chat.postMessage", {
              method: "POST",
              headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
              body: JSON.stringify({ channel: process.env.NOTES_SLACK_CHANNEL, text: out }),
            })
          : await fetch(process.env.NOTES_DISCORD_WEBHOOK!, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: out, allowed_mentions: { parse: [] } }),
            })
      if (!res.ok) return { place, ok: false, error: `It answered ${res.status}.` }
      if (place === "slack") {
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
        if (!j.ok) return { place, ok: false, error: j.error ?? "Slack refused it." }
      }
      return { place, ok: true }
    } catch (e) {
      console.error("notes/team:", place, (e as Error).name)
      return { place, ok: false, error: "Not posted." }
    }
  }
  return NextResponse.json({ results: await Promise.all([post("slack"), post("discord")]) })
}
