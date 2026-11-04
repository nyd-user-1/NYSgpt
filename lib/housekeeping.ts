import "server-only"

import { randomUUID } from "node:crypto"

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime"
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { ADMIN, CLAUDE, CLAUDE_NAME, claudeMayReply, repliesWith, statusAfterReply, type Status } from "@/lib/housekeeping-thread"
import { MEMBERS, memberByEmail } from "@/lib/roles"

// Housekeeping (Brendan, 2026-10-30): the admins' comments on the app for the super admin, as a
// chat stream, with one-to-one direct messages beside it. A comment pointed at an element (the
// sonar overlay, components/housekeeping) carries its page, the element and a CSS path back to it;
// screenshots ride along in S3. Only the super admin edits or resolves.
//
//   pk                    sk               item
//   STREAM                <iso>#<id>       a message to everyone
//   DM#<email>|<email>    <iso>#<id>       a direct message (the two emails sorted)
//   ADMIN                 <iso>#<id>       the Admin channel: the super admin's messages to Claude, each
//                                          with Claude from the moment it is posted (status "claude")
//   (any of these)        <iso>#<id>       a reply (kind "reply"), replyTo its parent's sk, appended
//
// A pointed comment can go to Claude (Brendan, 2026-11-01; lib/housekeeping-thread.ts): status "claude",
// then "answered" when Claude's reply lands, and back to "claude" when a person replies to the answer.
//
// The new account's us-east-2: table nysgpt-housekeeping, screenshots under housekeeping/ in
// the clips bucket; Amplify's compute role holds the nysgpt-housekeeping policy for both.

const REGION = process.env.NYSGPT_TABLES_REGION ?? "us-east-1"
const TABLE = process.env.NYSGPT_HOUSEKEEPING_TABLE ?? "nysgpt-housekeeping"
const BUCKET = process.env.NYSGPT_HOUSEKEEPING_BUCKET ?? "nysgpt-housekeeping-638175140432"

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), { marshallOptions: { removeUndefinedValues: true } })
const s3 = new S3Client({ region: REGION })

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
  /** The overlay's full locator bundle, for whoever fixes it. */
  bundle?: string
  point?: { xf: number; yf: number }
  /** S3 keys of the screenshots. */
  images?: string[]
  status: Status
  /** When it went to Claude, and when Claude last answered. */
  claudeAt?: string
  answeredAt?: string
  resolvedBy?: string
  resolvedAt?: string
  editedAt?: string
  createdAt: string
  /** A prompt that would address the comment, for the super admin to use as he sees fit, or
   *  PROMPT_UNAVAILABLE when no change could be read from it (Brendan, 2026-10-30). */
  prompt?: string
  promptAt?: string
}

export const PROMPT_UNAVAILABLE = "Prompt unavailable"

/** Who can be in Housekeeping: the super admin and the admins, by lib/roles.ts. */
export const PEOPLE = MEMBERS.filter((m) => m.email && (m.role === "superadmin" || m.role === "admin")).map((m) => ({ email: m.email!.toLowerCase(), name: m.name, role: m.role, photo: m.photo }))

export const nameOf = (email: string) => memberByEmail(email)?.name ?? email
/** A member's main address, so either of Brendan's addresses lands in the same thread. */
export const canonical = (email: string) => memberByEmail(email)?.email?.toLowerCase() ?? email.toLowerCase()

export const dmKey = (a: string, b: string) => `DM#${[canonical(a), canonical(b)].sort().join("|")}`

export async function listThread(pk: string): Promise<Message[]> {
  const out = await db.send(new QueryCommand({ TableName: TABLE, KeyConditionExpression: "pk = :pk", ExpressionAttributeValues: { ":pk": pk }, ScanIndexForward: false, Limit: 300 }))
  return ((out.Items ?? []) as Message[]).reverse()
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }

/** Up to four screenshots, from data URLs, each at most 4 MB. */
async function putImages(id: string, images: { mime: string; data: string }[]): Promise<string[]> {
  const keys: string[] = []
  for (const [i, img] of images.slice(0, 4).entries()) {
    const ext = EXT[img.mime]
    const comma = img.data.indexOf(",")
    if (!ext || comma < 0) continue
    const body = Buffer.from(img.data.slice(comma + 1), "base64")
    if (body.length > 4 * 1024 * 1024) throw new Error("A screenshot is over 4 MB.")
    const key = `housekeeping/${id}-${i}.${ext}`
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: img.mime }))
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
    bundle: input.bundle?.slice(0, 6000),
    images: input.images?.length ? await putImages(id, input.images) : undefined,
    // A message written in the Admin channel is Claude's to answer from the start; a pointed comment there
    // waits, as any comment does, for Send to Claude.
    status: input.channel === "admin" && input.kind === "message" ? "claude" : "open",
    claudeAt: input.channel === "admin" && input.kind === "message" ? createdAt : undefined,
    createdAt,
  }
  if (item.pk === ADMIN) delete item.to
  await db.send(new PutCommand({ TableName: TABLE, Item: item }))
  return item
}

export async function getMessage(key: { pk: string; sk: string }): Promise<Message | null> {
  const out = await db.send(new GetCommand({ TableName: TABLE, Key: key }))
  return (out.Item as Message | undefined) ?? null
}

/** The open pointed comments on one page that this person can read: the stream's and their own
 *  direct messages'. The page marks each one's element (components/housekeeping/tool.tsx). */
export async function openOnRoute(route: string, viewer: string): Promise<Message[]> {
  const me = canonical(viewer)
  const superAdmin = PEOPLE.find((p) => p.email === me)?.role === "superadmin"
  const keys = ["STREAM", ...(superAdmin ? [ADMIN] : []), ...PEOPLE.filter((p) => p.email !== me).map((p) => dmKey(me, p.email))]
  const threads = await Promise.all(keys.map((pk) => listThread(pk)))
  // A comment with Claude, or answered, is still unresolved, so its element stays marked.
  return threads.flat().filter((m) => m.kind === "comment" && m.status !== "resolved" && m.route === route && m.path)
}

/** Appends a reply to a message's thread: a person's, or Claude's (author CLAUDE). Claude's answers a
 *  comment that is with Claude; a person's on an answered comment sends it back. Returns the reply and
 *  the comment's status after it. */
export async function reply(parent: { pk: string; sk: string }, input: { author: string; text: string; commit?: string; diff?: string; images?: { mime: string; data: string }[] }): Promise<{ reply: Message; status: Status }> {
  const p = await getMessage(parent)
  if (!p || p.kind === "reply") throw new Error("No such message to reply to.")
  const byClaude = input.author === CLAUDE
  // Claude answers a comment that is with Claude, and may follow up while it stands answered.
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
    // A commit's hash and its diff ride on Claude's replies alone. The diff is held under 300,000 characters,
    // inside DynamoDB's 400 KB item.
    commit: byClaude ? input.commit?.trim().slice(0, 64) || undefined : undefined,
    diff: byClaude ? input.diff?.slice(0, 300_000) || undefined : undefined,
    // Screenshots, a person's or Claude's, as a message's: up to four, into S3 beside the rest.
    images: input.images?.length ? await putImages(id, input.images) : undefined,
    status: "open",
    createdAt,
  }
  await db.send(new PutCommand({ TableName: TABLE, Item: item, ConditionExpression: "attribute_not_exists(pk)" }))
  const next = statusAfterReply(p.status, byClaude)
  if (next) await setStatus(parent, next, author)
  return { reply: item, status: next ?? p.status }
}

/** Every row the super admin reads: the stream, the Admin channel and each of his direct-message threads. */
async function superRows(): Promise<Message[]> {
  const sa = PEOPLE.find((p) => p.role === "superadmin")?.email
  const keys = ["STREAM", ADMIN, ...(sa ? PEOPLE.filter((p) => p.email !== sa).map((p) => dmKey(sa, p.email)) : [])]
  return (await Promise.all(keys.map((pk) => listThread(pk)))).flat()
}

/** The loop's read: every comment with Claude (a pointed comment sent to it, or a message of the Admin
 *  channel), each with its replies so far (with their screenshots' links), and every reply of Claude's the
 *  super admin has given feedback on, whatever its comment's status. */
export async function forClaude(): Promise<{
  comments: { comment: Message; replies: (Message & { imageUrls: string[] })[]; imageUrls: string[] }[]
  feedback: { reply: Message; parent: Message }[]
}> {
  const rows = await superRows()
  const links = (m: Message) => Promise.all((m.images ?? []).map((k) => imageUrl(k)))
  // A pointed comment sent to Claude, and every message of the Admin channel (a plain message, no target).
  const waiting = rows.filter((m) => (m.kind === "comment" || (m.pk === ADMIN && m.kind === "message")) && m.status === "claude")
  const comments = await Promise.all(
    waiting.map(async (comment) => ({
      comment,
      replies: await Promise.all(
        rows
          .filter((r) => r.kind === "reply" && r.pk === comment.pk && r.replyTo === comment.sk)
          .sort((a, b) => a.sk.localeCompare(b.sk))
          .map(async (r) => ({ ...r, imageUrls: await links(r) })),
      ),
      imageUrls: await links(comment),
    })),
  )
  return { comments, feedback: repliesWith(rows, (r) => !!r.feedback) }
}

/** The Bookmarks thread: every reply of Claude's the super admin bookmarked, with the message it answers. */
export async function bookmarks(): Promise<{ reply: Message; parent: Message }[]> {
  return repliesWith(await superRows(), (r) => !!r.bookmarked)
}

/** The super admin's feedback (up, down, or none) and bookmark on a reply of Claude's, set in place. */
export async function react(key: { pk: string; sk: string }, change: { feedback?: "up" | "down" | null; bookmarked?: boolean }): Promise<void> {
  const set: string[] = []
  const remove: string[] = []
  const values: Record<string, unknown> = { ":claude": CLAUDE, ":reply": "reply" }
  if (change.feedback === null) remove.push("feedback")
  else if (change.feedback) (set.push("feedback = :f"), (values[":f"] = change.feedback))
  if (change.bookmarked === true) (set.push("bookmarked = :b"), (values[":b"] = true))
  else if (change.bookmarked === false) remove.push("bookmarked")
  if (!set.length && !remove.length) return
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: key,
      ConditionExpression: "attribute_exists(pk) AND #a = :claude AND #k = :reply",
      UpdateExpression: [set.length ? `SET ${set.join(", ")}` : "", remove.length ? `REMOVE ${remove.join(", ")}` : ""].filter(Boolean).join(" "),
      ExpressionAttributeNames: { "#a": "author", "#k": "kind" },
      ExpressionAttributeValues: values,
    }),
  )
}

/** A message's status, set in place as resolve and reopen always have: resolved records who and when;
 *  "claude" and "answered" record when; every status but resolved clears the resolution. */
async function setStatus(key: { pk: string; sk: string }, status: Status, by: string): Promise<void> {
  const now = new Date().toISOString()
  const set =
    status === "resolved"
      ? { expr: "SET #s = :s, resolvedBy = :by, resolvedAt = :at", values: { ":s": status, ":by": canonical(by), ":at": now } }
      : status === "claude"
        ? { expr: "SET #s = :s, claudeAt = :at REMOVE resolvedBy, resolvedAt", values: { ":s": status, ":at": now } }
        : status === "answered"
          ? { expr: "SET #s = :s, answeredAt = :at REMOVE resolvedBy, resolvedAt", values: { ":s": status, ":at": now } }
          : { expr: "SET #s = :s REMOVE resolvedBy, resolvedAt", values: { ":s": status } }
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: key,
      ConditionExpression: "attribute_exists(pk)",
      UpdateExpression: set.expr,
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: set.values,
    }),
  )
}

/** The super admin's levers: resolve or reopen, send to Claude, edit the text, and edit the prompt. */
export async function update(key: { pk: string; sk: string }, change: { status?: "open" | "resolved" | "claude"; text?: string; prompt?: string }, by: string): Promise<void> {
  const now = new Date().toISOString()
  if (change.status) await setStatus(key, change.status, by)
  if (change.text != null) {
    await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: key,
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression: "SET #t = :t, editedAt = :at",
        ExpressionAttributeNames: { "#t": "text" },
        ExpressionAttributeValues: { ":t": change.text.trim().slice(0, 4000), ":at": now },
      }),
    )
  }
  if (change.prompt != null) await savePrompt(key, change.prompt)
}

async function savePrompt(key: { pk: string; sk: string }, prompt: string): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: key,
      ConditionExpression: "attribute_exists(pk)",
      UpdateExpression: "SET #p = :p, promptAt = :at",
      ExpressionAttributeNames: { "#p": "prompt" },
      ExpressionAttributeValues: { ":p": prompt.trim().slice(0, 8000) || PROMPT_UNAVAILABLE, ":at": new Date().toISOString() },
    }),
  )
}

// The prompt (Brendan, 2026-10-30): Housekeeping does not send comments to a coding session; it keeps,
// beside each comment, a prompt that would address it, which the super admin reads, edits or ignores.
// Claude on Bedrock writes it from the comment and its locator bundle, in us-east-2.
const bedrock = new BedrockRuntimeClient({ region: REGION })
const PROMPT_MODEL = process.env.NYSGPT_HOUSEKEEPING_MODEL ?? "us.anthropic.claude-sonnet-4-6"

const PROMPT_SYSTEM = `You turn a reviewer's comment on the PAX web app (a Next.js App Router codebase, pax-trinity: pages in src/app/<route>/page.tsx, components in src/components, copy and data in src/lib) into one prompt for a coding agent working in that repository.

The prompt you write:
- names the page (its route, and the likely page file), and the element: its visible text, its kind, its classes and its neighbours, as given, so the agent can grep for it;
- says exactly what to change, in the reviewer's terms; when the reviewer supplies replacement wording, quote it exactly;
- keeps the app's voice where it writes copy: first person singular ("I", "me", "my"), never "we" or "our";
- ends by asking the agent to check the change on the page.

A loose request is still a request: "shorten this", "make it bigger", "this reads wrong" each get a prompt that names the element and the direction, leaving the exact wording to the agent's judgment within it. Only when the comment asks for no change at all (a greeting, a note, a question with no request in it), write exactly: ${PROMPT_UNAVAILABLE}

Write only the prompt, in plain text, no preamble and no heading.`

/** Writes and stores the prompt for one message; returns it. */
export async function writePrompt(key: { pk: string; sk: string }): Promise<string> {
  const m = await getMessage(key)
  if (!m) throw new Error("No such message.")
  const file = m.route ? `src/app${m.route === "/" ? "" : m.route}/page.tsx` : null
  const facts = [
    m.page && `Page: ${m.page}`,
    m.route && `Route: ${m.route}${file ? ` (likely ${file})` : ""}`,
    m.target && `Element: ${m.target}`,
    m.path && `CSS path: ${m.path}`,
    m.bundle && `Locator bundle:\n${m.bundle}`,
    m.images?.length ? `The reviewer attached ${m.images.length} screenshot${m.images.length === 1 ? "" : "s"} (not shown here).` : null,
    `Comment from ${m.authorName}: ${m.text || "(no text)"}`,
  ].filter(Boolean)
  const out = await bedrock.send(
    new ConverseCommand({
      modelId: PROMPT_MODEL,
      system: [{ text: PROMPT_SYSTEM }],
      messages: [{ role: "user", content: [{ text: facts.join("\n\n") }] }],
      inferenceConfig: { maxTokens: 900, temperature: 0 },
    }),
  )
  const text = (out.output?.message?.content ?? []).map((c) => ("text" in c ? c.text : "")).join("").trim()
  const prompt = text || PROMPT_UNAVAILABLE
  await savePrompt(key, prompt)
  return prompt
}

/** A screenshot's short-lived link. */
export async function imageUrl(key: string): Promise<string> {
  if (!key.startsWith("housekeeping/")) throw new Error("Not a Housekeeping screenshot.")
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 600 })
}
