import Link from "next/link"

import { Chat } from "@/components/chat/chat"
import { openChat } from "@/app/chat-actions"
import { DiscussionHeaderButton } from "@/components/DiscussionHeaderButton"
import { onboardGuide } from "@/lib/chat-onboard"

export const dynamic = "force-dynamic"
export const metadata = { title: "Chat" }

/** NSR mode (2026-11-04): the Science box's chat corner and ?nsr=1 open the chat wired to the
 *  corpus — the ribbon behind the input names it, and this context rides every message. */
const NSR_MODE = {
  title: "NSR mode",
  note: "Answers draw on the Nuclear Science References corpus — 303,568 references.",
  context:
    "NSR MODE — the user opened this chat wired to the Nuclear Science References corpus. Answer every question from the corpus through the data tools (nsr_search, nsr_sql, nsr_record) before anything else: reach for a lookup rather than memory, lead with the numbers the tools return, and cite papers by key_number. A question outside nuclear science gets a plain answer and one light note that NSR mode is on.",
  off: "/chat",
}

// Ported from trinity's /chat (2026-11-03), content stripped to placeholders: trinity fills
// scripts/videos/shorts from its catalog and feed; NYSgpt passes none until it has its own.
// ?c=<id> reopens a saved chat; without it the page is a new chat with a fresh id, so following
// a saved one starts clean. ?record=1 opens in record mode; ?onboard=1 runs the (placeholder)
// tour; ?nsr=1 opens in NSR mode.
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ c?: string; record?: string; onboard?: string; nsr?: string }> }) {
  const { c, record, onboard, nsr } = await searchParams
  const saved = c ? await openChat(c) : null
  const chatId = saved ? saved.meta.id : crypto.randomUUID()
  const guide = onboard === "1" && !saved ? onboardGuide() : undefined
  // explore={false}: the Explore strip stayed behind in trinity too. The h-dvh frame stands in
  // for trinity's shell, which gave the chat its full-height column.
  return (
    <div className="relative h-dvh">
      {/* The chrome over the chat: the sign-up pages' wordmark at the left (BareHeader's dress),
          the switchboard's discussion button at the right. `nysgpt-app` on the header alone, so
          the button's paper variables resolve without redressing the chat. */}
      <header className="nysgpt-app pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5">
        <Link href="/" className="pointer-events-auto text-[28px] leading-none text-foreground" style={{ fontFamily: "var(--font-display), Georgia, serif", letterSpacing: "-0.03em" }}>
          NYSgpt
        </Link>
        <span className="pointer-events-auto">
          <DiscussionHeaderButton />
        </span>
      </header>
      <Chat key={chatId} chatId={chatId} initialMessages={saved?.messages} record={record === "1"} onboard={guide} mode={nsr === "1" ? NSR_MODE : undefined} explore={false} scripts={[]} videos={[]} shorts={[]} />
    </div>
  )
}
