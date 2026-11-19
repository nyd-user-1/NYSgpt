#!/usr/bin/env node
// Dev Comments for the Claude sessions on this Mac (2026-11-19): reads the comments Brendan writes with the dev
// tools on the dev box, and answers them. No packages; it finds the box's current address with the AWS CLI
// (profile nysgpt-new), because the address changes when the box restarts.
//
//   node scripts/dev-comments.mjs --as lead       the comments and replies written since "lead" last read (each
//                                                 session reads under its own name; "default" when none is given)
//   node scripts/dev-comments.mjs --all           every comment and reply
//   node scripts/dev-comments.mjs --json          the same rows as JSON (with --all or without)
//   node scripts/dev-comments.mjs reply <id> "<text>" [--commit <sha>]
//                                                 a reply from Claude on a comment, shown in the panel under it
//
// The rows come from GET /api/housekeeping?feed=1&since=<iso> on the box's dev server; the last time read is
// kept per reader in ~/.nysgpt-dev-comments.json. Set NYSGPT_DEVBOX=http://host:port to skip the lookup.

import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"

const STATE = path.join(homedir(), ".nysgpt-dev-comments.json")
const INSTANCE = "i-0ec4775a5cd68d41b"

function box() {
  if (process.env.NYSGPT_DEVBOX) return process.env.NYSGPT_DEVBOX.replace(/\/$/, "")
  const ip = execFileSync("aws", ["ec2", "describe-instances", "--profile", "nysgpt-new", "--region", "us-east-2", "--instance-ids", INSTANCE, "--query", "Reservations[0].Instances[0].PublicIpAddress", "--output", "text"], { encoding: "utf8" }).trim()
  if (!ip || ip === "None") throw new Error("The dev box is not running (no public address).")
  return `http://${ip}:3001`
}

async function api(base, pathAndQuery, init) {
  const r = await fetch(base + pathAndQuery, { ...init, headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000) })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`${r.status} ${body.error ?? r.statusText}`)
  return body
}

const readState = () => {
  try {
    return JSON.parse(readFileSync(STATE, "utf8"))
  } catch {
    return {}
  }
}

function show(rows, all) {
  const byKey = new Map(rows.map((r) => [`${r.pk}|${r.sk}`, r]))
  if (!rows.length) return console.log(all ? "No comments yet." : "No new comments.")
  for (const r of rows) {
    const parent = r.kind === "reply" ? byKey.get(`${r.pk}|${r.replyTo}`) : null
    console.log(`── ${r.createdAt}  ${r.kind}${r.kind === "reply" ? ` from ${r.authorName}${parent ? ` on "${parent.text.slice(0, 50)}"` : ` on ${r.replyTo}`}` : `  status ${r.status}`}  id ${r.id}`)
    if (r.page) console.log(`   page:    ${r.page}`)
    if (r.target) console.log(`   element: ${r.target}`)
    if (r.source) console.log(`   source:  ${r.source}`)
    if (r.path) console.log(`   path:    ${r.path}`)
    if (r.images?.length) console.log(`   screenshots: ${r.images.map((k) => `/api/housekeeping/image?key=${encodeURIComponent(k)}`).join(" ")}`)
    if (r.commit) console.log(`   commit:  ${r.commit}`)
    console.log(`   text:    ${r.text.replace(/\n/g, "\n            ")}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const base = box()
  if (args[0] === "reply") {
    const [, id, text] = args
    const ci = args.indexOf("--commit")
    const commit = ci > 0 ? args[ci + 1] : undefined
    if (!id || !text) throw new Error('usage: reply <id> "<text>" [--commit <sha>]')
    const { messages } = await api(base, "/api/housekeeping?feed=1")
    const m = messages.find((x) => x.id === id && x.kind !== "reply")
    if (!m) throw new Error(`No comment with id ${id}.`)
    // Claude answers a comment that is with Claude; one Brendan has not sent yet is taken first.
    if (m.status !== "claude" && m.status !== "answered") await api(base, "/api/housekeeping", { method: "PATCH", body: JSON.stringify({ pk: m.pk, sk: m.sk, status: "claude" }) })
    const r = await api(base, "/api/housekeeping", { method: "POST", body: JSON.stringify({ kind: "claude-reply", pk: m.pk, sk: m.sk, text, commit }) })
    return console.log(`Replied on ${id}; the comment's status is now ${r.status}.`)
  }
  const all = args.includes("--all")
  const ai = args.indexOf("--as")
  const reader = ai >= 0 && args[ai + 1] ? args[ai + 1] : "default"
  const state = readState()
  const since = all ? "" : (state[reader] ?? "")
  const { messages } = await api(base, `/api/housekeeping?feed=1&since=${encodeURIComponent(since)}`)
  if (args.includes("--json")) console.log(JSON.stringify(messages, null, 1))
  else show(messages, all)
  const last = messages.at(-1)?.createdAt
  if (!all && last) writeFileSync(STATE, JSON.stringify({ ...state, [reader]: last }, null, 1))
}

main().catch((e) => {
  console.error(`dev-comments: ${e.message}`)
  process.exit(1)
})
