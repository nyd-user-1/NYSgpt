import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google"

import { AppLayout } from "@/components/AppLayout"
import { Chat } from "@/components/chat/chat"
import { ChatInsetPanel } from "@/components/chat/ChatInsetPanel"
import type { ScriptChip } from "@/components/chat/plus-menu"
import { openChat } from "@/app/chat-actions"
import { RandomUUID } from "./random-uuid"
import "@/components/chat/pax2-chat.css"

// /chat, from pax-trinity's src/app/chat/page.tsx (brief 46): the same Chat, inside NYSgpt's frame (AppLayout)
// and pax-trinity's look, scoped to the .pax-chat wrapper (components/chat/pax2-chat.css): its PAX Light theme,
// and its type, Plus Jakarta Sans and Geist Mono, under the variable names pax-trinity's layout gives them.
// pax-trinity fills the + menu from its own scripts and videos; here the lists are placeholders.

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const dynamic = "force-dynamic"
export const metadata = { title: "Chat" }

/** Placeholder: NYSgpt's scripts for the + menu go here. */
const SCRIPTS: ScriptChip[] = [{ id: "placeholder-script", title: "Placeholder script", short: "Placeholder: an NYSgpt script goes here." }]

// ?c=<id> reopens a saved chat; without it the page is a new chat with a fresh id. ?record=1 opens in record mode.
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ c?: string; record?: string }> }) {
  const { c, record } = await searchParams
  const saved = c ? await openChat(c) : null
  const chatId = saved ? saved.meta.id : crypto.randomUUID()
  return (
    <AppLayout paperMode>
      {/* The conversation and the inset right rail (brief 60, as nsrgpt's /graph frames its canvas): the rail narrows the conversation. */}
      <div className="flex min-h-0 flex-1">
        <div className={`pax-chat ${sans.variable} ${mono.variable} flex min-h-0 min-w-0 flex-1 flex-col font-sans text-foreground antialiased`}>
          <RandomUUID />
          <Chat key={chatId} chatId={chatId} initialMessages={saved?.messages} record={record === "1"} explore={false} scripts={SCRIPTS} videos={[]} shorts={[]} />
        </div>
        <ChatInsetPanel />
      </div>
    </AppLayout>
  )
}
