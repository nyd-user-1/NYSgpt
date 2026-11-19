import "server-only"

import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"

import { ADMIN, CLAUDE, CLAUDE_NAME, claudeMayReply, repliesWith, statusAfterReply, type Status } from "@/lib/housekeeping-thread"
import { MEMBERS, memberByEmail } from "@/lib/housekeeping-people"

// Dev Comments' store on NYSgpt (2026-11-19): pax-trinity's lib/housekeeping.ts with its functions and rows
// unchanged, kept in one JSON file on the dev server instead of DynamoDB, and screenshots as files beside it
// instead of S3. One dev server writes it, so a promise chain is the only lock it needs.
//
//   <dir>/messages.json         every row, as pax-trinity's table holds them: { pk, sk, id, author, … }
//   <dir>/images/<id>-<i>.<ext> the screenshots, up to four a message
//
// <dir> is NYSGPT_DEVTOOLS_DIR, or ~/.nysgpt-devtools (on the dev box, /root/.nysgpt-devtools): outside the
// repository, so the box's pull loop and git never touch it.
//
//   pk          sk              item
//   STREAM      <iso>#<id>      a message to everyone
//   ADMIN       <iso>#<id>      the Admin channel: the super admin's messages and pointed comments
//   (either)    <iso>#<id>      a reply (kind "reply"), replyTo its parent's sk
//
// pax-trinity also writes, with Claude on Bedrock, a prompt beside each comment. NYSgpt does not: it is a
// model charge per comment, and the Claude sessions read the comment and its locator bundle themselves.

export const DIR = process.env.NYSGPT_DEVTOOLS_DIR || path.join(homedir(), ".nysgpt-devtools")
const FILE = path.join(DIR, "messages.json")
const IMAGES = path.join(DIR, "images")

export type Message = {
  pk: string
  sk: string
  id: string
  author: string
  authorName: string
  /** The other person in a direct message; absent on the stream. */
  to?: string
  text: string
  /** "comment": pointed at an element; "message": typed in the panel; "reply": on another row's thread. */
  kind: "comment" | "message" | "reply"
  /** A reply's parent: its sort key, in the same partition. */
  replyTo?: string
  /** On a reply of Claude's: the commit it made and its unified diff (the super admin's alone). */
  commit?: string
  diff?: string
  /** On a reply of Claude's: the super admin's feedback, and his bookmark (the Bookmarks thread's view). */
  feedback?: "up" | "down"
  bookmarked?: boolean
  page?: string
  route?: string
  target?: string
  path?: string
  /** The component that draws the element and its file and line, from /api/dev-locate (NYSgpt). */
  source?: string
  /** The overlay's full locator bundle, for whoever fixes it. */
  bundle?: string
  point?: { xf: number; yf: number }
  /** Keys of the screenshots (images/<file>). */
  images?: string[]
  status: Status
  /** When it went to Claude, and when Claude last answered. */
  claudeAt?: string
  answeredAt?: string
  resolvedBy?: string
  resolvedAt?: string
  editedAt?: string
  createdAt: string
  prompt?: string
  promptAt?: string
}

export const PROMPT_UNAVAILABLE = "Prompt unavailable"

/** Who can be in Dev Comments: the super admin and the admins (lib/housekeeping-people.ts). */
export const PEOPLE = MEMBERS.filter((m) => m.email && (m.role === "superadmin" || m.role === "admin")).map((m) => ({ email: m.email.toLowerCase(), name: m.name, role: m.role, photo: m.photo }))

export const nameOf = (email: string) => memberByEmail(email)?.name ?? email
export const canonical = (email: string) => memberByEmail(email)?.email?.toLowerCase() ?? email.toLowerCase()

export const dmKey = (a: string, b: string) => `DM#${[canonical(a), canonical(b)].sort().join("|")}`

// ── the file ────────────────────────────────────────────────────────────────

const g = globalThis as typeof globalThis & { __housekeepingLock?: Promise<unknown> }

async function readAll(): Promise<Message[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Message[]
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return []
    throw e
  }
}

/** Reads every row, lets `change` edit the list, and writes it back whole (a temp file, then a rename). */
function edit<T>(change: (rows: Message[]) => T | Promise<T>): Promise<T> {
  const run = (g.__housekeepingLock ?? Promise.resolve()).catch(() => {}).then(async () => {
    const rows = await readAll()
    const out = await change(rows)
    await mkdir(DIR, { recursive: true })
    const tmp = `${FILE}.${process.pid}.tmp`
    await writeFile(tmp, JSON.stringify(rows, null, 1))
    await rename(tmp, FILE)
    return out
  })
  g.__housekeepingLock = run
  return run
}

const find = (rows: Message[], key: { pk: string; sk: string }) => rows.find((r) => r.pk === key.pk && r.sk === key.sk)

/** Every row, oldest first: the reader's script and GET ?feed=1 read this. */
export async function allRows(): Promise<Message[]> {
  return (await readAll()).sort((a, b) => a.sk.localeCompare(b.sk))
}

export async function listThread(pk: string): Promise<Message[]> {
  return (await readAll())
    .filter((r) => r.pk === pk)
    .sort((a, b) => a.sk.localeCompare(b.sk))
    .slice(-300)
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }

/** Up to four screenshots, from data URLs, each at most 4 MB. */
async function putImages(id: string, images: { mime: string; data: string }[]): Promise<string[]> {
  const keys: string[] = []
  await mkdir(IMAGES, { recursive: true })
  for (const [i, img] of images.slice(0, 4).entries()) {
    const ext = EXT[img.mime]
    const comma = img.data.indexOf(",")
    if (!ext || comma < 0) continue
    const body = Buffer.from(img.data.slice(comma + 1), "base64")
    if (body.length > 4 * 1024 * 1024) throw new Error("A screenshot is over 4 MB.")
    const key = `housekeeping/${id}-${i}.${ext}`
    await writeFile(path.join(IMAGES, path.basename(key)), body)
    keys.push(key)
  }
  return keys
}

export async function post(input: {
  author: string
  to?: string | null
  text: string
  kind: "comment" | "message"
  /** "admin": the Admin channel, the super admin's to Claude (the route holds it to him). */
  channel?: "admin"
  page?: string
  route?: string
  target?: string
  path?: string
  source?: string
  bundle?: string
  point?: { xf: number; yf: number }
  images?: { mime: string; data: string }[]
}): Promise<Message> {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const author = canonical(input.author)
  const to = input.to ? canonical(input.to) : undefined
  const item: Message = {
    pk: input.channel === "admin" ? ADMIN : to ? dmKey(author, to) : "STREAM",
    sk: `${createdAt}#${id}`,
    id,
    author,
    authorName: nameOf(author),
    to,
    text: input.text.trim().slice(0, 4000),
    kind: input.kind,
    page: input.page?.slice(0, 600),
    route: input.route?.slice(0, 300),
    target: input.target?.slice(0, 300),
    path: input.path?.slice(0, 1000),
    source: input.source?.slice(0, 400),
    bundle: input.bundle?.slice(0, 6000),
    point: input.point,
    images: input.images?.length ? await putImages(id, input.images) : undefined,
    // A message written in the Admin channel is Claude's to answer from the start; a pointed comment there
    // waits, as any comment does, for Send to Claude.
    status: input.channel === "admin" && input.kind === "message" ? "claude" : "open",
    claudeAt: input.channel === "admin" && input.kind === "message" ? createdAt : undefined,
    createdAt,
  }
  if (item.pk === ADMIN) delete item.to
  for (const k of Object.keys(item) as (keyof Message)[]) if (item[k] === undefined) delete item[k]
  await edit((rows) => void rows.push(item))
  return item
}

export async function getMessage(key: { pk: string; sk: string }): Promise<Message | null> {
  return find(await readAll(), key) ?? null
}

/** The open pointed comments on one page that this person can read. The page marks each one's element
 *  (components/housekeeping/tool.tsx). */
export async function openOnRoute(route: string, viewer: string): Promise<Message[]> {
  const me = canonical(viewer)
  const superAdmin = PEOPLE.find((p) => p.email === me)?.role === "superadmin"
  const keys = new Set(["STREAM", ...(superAdmin ? [ADMIN] : []), ...PEOPLE.filter((p) => p.email !== me).map((p) => dmKey(me, p.email))])
  // A comment with Claude, or answered, is still unresolved, so its element stays marked.
  return (await readAll()).filter((m) => keys.has(m.pk) && m.kind === "comment" && m.status !== "resolved" && m.route === route && m.path)
}

/** Appends a reply to a message's thread: a person's, or Claude's (author CLAUDE). Claude's answers a
 *  comment that is with Claude; a person's on an answered comment sends it back. Returns the reply and
 *  the comment's status after it. */
export async function reply(parent: { pk: string; sk: string }, input: { author: string; text: string; commit?: string; diff?: string; images?: { mime: string; data: string }[] }): Promise<{ reply: Message; status: Status }> {
  const p = await getMessage(parent)
  if (!p || p.kind === "reply") throw new Error("No such message to reply to.")
  const byClaude = input.author === CLAUDE
  if (byClaude && !claudeMayReply(p.status)) throw new Error("That comment is not with Claude.")
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const author = byClaude ? CLAUDE : canonical(input.author)
  const item: Message = {
    pk: p.pk,
    sk: `${createdAt}#${id}`,
    id,
    author,
    authorName: byClaude ? CLAUDE_NAME : nameOf(author),
    to: p.to,
    text: input.text.trim().slice(0, byClaude ? 12000 : 4000),
    kind: "reply",
    replyTo: p.sk,
    commit: byClaude ? input.commit?.trim().slice(0, 64) || undefined : undefined,
    diff: byClaude ? input.diff?.slice(0, 300_000) || undefined : undefined,
    images: input.images?.length ? await putImages(id, input.images) : undefined,
    status: "open",
    createdAt,
  }
  for (const k of Object.keys(item) as (keyof Message)[]) if (item[k] === undefined) delete item[k]
  const next = statusAfterReply(p.status, byClaude)
  await edit((rows) => {
    rows.push(item)
    const row = find(rows, parent)
    if (next && row) applyStatus(row, next, author)
  })
  return { reply: item, status: next ?? p.status }
}

/** Every row the super admin reads: the stream, the Admin channel and each of his direct-message threads. */
async function superRows(): Promise<Message[]> {
  const sa = PEOPLE.find((p) => p.role === "superadmin")?.email
  const keys = new Set(["STREAM", ADMIN, ...(sa ? PEOPLE.filter((p) => p.email !== sa).map((p) => dmKey(sa, p.email)) : [])])
  return (await readAll()).filter((r) => keys.has(r.pk)).sort((a, b) => a.sk.localeCompare(b.sk))
}

/** A screenshot's link: the image route, which serves the file. */
export const imageUrl = (key: string) => `/api/housekeeping/image?key=${encodeURIComponent(key)}`

/** The loop's read: every comment with Claude (a pointed comment sent to it, or a message of the Admin
 *  channel), each with its replies so far, and every reply of Claude's the super admin has given feedback on. */
export async function forClaude(): Promise<{
  comments: { comment: Message; replies: (Message & { imageUrls: string[] })[]; imageUrls: string[] }[]
  feedback: { reply: Message; parent: Message }[]
}> {
  const rows = await superRows()
  const links = (m: Message) => (m.images ?? []).map(imageUrl)
  const waiting = rows.filter((m) => (m.kind === "comment" || (m.pk === ADMIN && m.kind === "message")) && m.status === "claude")
  const comments = waiting.map((comment) => ({
    comment,
    replies: rows
      .filter((r) => r.kind === "reply" && r.pk === comment.pk && r.replyTo === comment.sk)
      .map((r) => ({ ...r, imageUrls: links(r) })),
    imageUrls: links(comment),
  }))
  return { comments, feedback: repliesWith(rows, (r) => !!r.feedback) }
}

/** The Bookmarks thread: every reply of Claude's the super admin bookmarked, with the message it answers. */
export async function bookmarks(): Promise<{ reply: Message; parent: Message }[]> {
  return repliesWith(await superRows(), (r) => !!r.bookmarked)
}

/** A store error with the name DynamoDB gives a failed condition, so the routes answer as they do in pax-trinity. */
const conditional = (message: string) => Object.assign(new Error(message), { name: "ConditionalCheckFailedException" })

/** The super admin's feedback (up, down, or none) and bookmark on a reply of Claude's, set in place. */
export async function react(key: { pk: string; sk: string }, change: { feedback?: "up" | "down" | null; bookmarked?: boolean }): Promise<void> {
  if (change.feedback === undefined && change.bookmarked === undefined) return
  await edit((rows) => {
    const r = find(rows, key)
    if (!r || r.author !== CLAUDE || r.kind !== "reply") throw conditional("Only a reply of Claude's takes feedback or a bookmark.")
    if (change.feedback === null) delete r.feedback
    else if (change.feedback) r.feedback = change.feedback
    if (change.bookmarked === true) r.bookmarked = true
    else if (change.bookmarked === false) delete r.bookmarked
  })
}

/** A message's status, set in place: resolved records who and when; "claude" and "answered" record when;
 *  every status but resolved clears the resolution. */
function applyStatus(r: Message, status: Status, by: string) {
  const now = new Date().toISOString()
  r.status = status
  if (status === "resolved") {
    r.resolvedBy = canonical(by)
    r.resolvedAt = now
    return
  }
  delete r.resolvedBy
  delete r.resolvedAt
  if (status === "claude") r.claudeAt = now
  if (status === "answered") r.answeredAt = now
}

/** The super admin's levers: resolve or reopen, send to Claude, edit the text, and edit the prompt. */
export async function update(key: { pk: string; sk: string }, change: { status?: "open" | "resolved" | "claude"; text?: string; prompt?: string }, by: string): Promise<void> {
  await edit((rows) => {
    const r = find(rows, key)
    if (!r) throw conditional("No such message.")
    if (change.status) applyStatus(r, change.status, by)
    if (change.text != null) {
      r.text = change.text.trim().slice(0, 4000)
      r.editedAt = new Date().toISOString()
    }
    if (change.prompt != null) {
      r.prompt = change.prompt.trim().slice(0, 8000) || PROMPT_UNAVAILABLE
      r.promptAt = new Date().toISOString()
    }
  })
}

/** A screenshot's file on disk, for the image route; only keys this store wrote. */
export async function imageFile(key: string): Promise<{ body: Buffer; type: string }> {
  const name = path.basename(key)
  if (!key.startsWith("housekeeping/") || name !== key.slice("housekeeping/".length) || !/^[\w-]+\.(png|jpg|webp|gif)$/.test(name)) throw new Error("Not a Dev Comments screenshot.")
  const ext = name.split(".").pop()!
  const type = Object.entries(EXT).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream"
  return { body: await readFile(path.join(IMAGES, name)), type }
}
