import { Chat } from "@/components/chat/chat"
import { openChat } from "@/app/chat-actions"
import { onboardGuide } from "@/lib/chat-onboard"

export const dynamic = "force-dynamic"
export const metadata = { title: "Chat" }

// Ported from trinity's /chat (2026-11-03), content stripped to placeholders: trinity fills
// scripts/videos/shorts from its catalog and feed; NYSgpt passes none until it has its own.
// ?c=<id> reopens a saved chat; without it the page is a new chat with a fresh id, so following
// a saved one starts clean. ?record=1 opens in record mode; ?onboard=1 runs the (placeholder) tour.
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ c?: string; record?: string; onboard?: string }> }) {
  const { c, record, onboard } = await searchParams
  const saved = c ? await openChat(c) : null
  const chatId = saved ? saved.meta.id : crypto.randomUUID()
  const guide = onboard === "1" && !saved ? onboardGuide() : undefined
  // explore={false}: the Explore strip stayed behind in trinity too. The h-dvh frame stands in
  // for trinity's shell, which gave the chat its full-height column.
  return (
    <div className="h-dvh">
      <Chat key={chatId} chatId={chatId} initialMessages={saved?.messages} record={record === "1"} onboard={guide} explore={false} scripts={[]} videos={[]} shorts={[]} />
    </div>
  )
}
