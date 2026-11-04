"use server"

import { currentUser } from "@/lib/auth"
import { USAGE_KINDS, writeUsage, type UsageKind } from "@/lib/usage"

// What a reader does in the chat, from the browser to the ledger (lib/usage.ts). The reader is the
// session's email when signed in; otherwise the anonymous id the browser sends. Where the ledger
// table doesn't exist yet the write fails quietly — the beacon never blocks or throws.

export async function logUsage(kind: UsageKind, subject: string, meta?: Record<string, unknown>, reader?: string) {
  if (!USAGE_KINDS.includes(kind)) return
  const user = await currentUser()
  const who = user?.email ?? (reader && /^r-[a-z0-9]{6,16}$/.test(reader) ? reader : "anonymous")
  const m = meta && JSON.stringify(meta).length <= 1000 ? meta : undefined
  await writeUsage(kind, String(subject).slice(0, 200), who, m).catch(() => {})
}
