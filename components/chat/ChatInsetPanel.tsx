"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { listChats, type ChatMeta } from "@/app/chat-actions";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { Database } from "@/components/animate-ui/icons/database";
import { MessagesSquare } from "@/components/animate-ui/icons/messages-square";
import { INSET, InsetBody, InsetLayers, InsetPanel } from "@/components/inset/InsetPanel";
import { useRailsClosedWhileMounted } from "@/components/rail-toggle";

// /chat's inset right rail (brief 60): nsrgpt's right inset panel (components/nsr/graph/RightInsetPanel.tsx) on the same
// frame (components/inset/InsetPanel.tsx, copied unchanged), with the chat's own views in place of the graph's: the saved
// chats, then the tables an answer used. Its rows take the frame's row style (INSET.row) in place of nsrgpt's sidebar rows,
// which carry that app's row menu and panel links.

/** The rail's layers: the menu on top, and the two views a row drills down to. */
export type ChatRailView = "menu" | "saved" | "tables";

const VIEWS: { key: Exclude<ChatRailView, "menu">; label: string; icon: typeof MessagesSquare }[] = [
  { key: "saved", label: "Saved chats", icon: MessagesSquare },
  { key: "tables", label: "Tables in this answer", icon: Database },
];

/** nsrgpt's switchboard back arrow (components/SwitchboardPanel.tsx BackButton), here with NYSgpt's arrow. */
function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

/** A view's header: the back arrow to the menu, then the view's own title. */
function ViewHeader({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <div className={INSET.header}>
      <BackButton onClick={onBack} label="Back to the menu" />
      {children}
    </div>
  );
}

/** /chat's inset right rail: it opens on a menu, one row per view, and a row drills down to its view, which pushes in from
 *  the right (InsetLayers); the view's back arrow returns to the menu. Closed on load, as /graph's panels are. */
export function ChatInsetPanel() {
  useRailsClosedWhileMounted(["right"]);
  const [view, setView] = useState<ChatRailView>("menu");
  const [saved, setSaved] = useState<ChatMeta[] | null>(null);
  useEffect(() => {
    let live = true;
    listChats().then((c) => live && setSaved(c)).catch(() => live && setSaved([]));
    return () => { live = false; };
  }, []);
  const back = () => setView("menu");
  const menu = (
    <>
      <div className={INSET.header}>
        <h2 className={INSET.title}>Chat</h2>
      </div>
      <InsetBody className="thin-scrollbar pt-1.5">
        {VIEWS.map((v) => (
          <button key={v.key} type="button" onClick={() => setView(v.key)} className={INSET.row}>
            <v.icon className={INSET.icon} />
            <span className="min-w-0 truncate">{v.label}</span>
            {v.key === "saved" && saved && saved.length > 0 && <span className={INSET.count}>{saved.length}</span>}
          </button>
        ))}
      </InsetBody>
    </>
  );
  const savedView = (
    <>
      <ViewHeader onBack={back}>
        <h2 className={INSET.title}>Saved chats</h2>
      </ViewHeader>
      <InsetBody className="thin-scrollbar">
        {saved === null ? null : saved.length === 0 ? (
          <p className={INSET.note}>No saved chats yet.</p>
        ) : (
          saved.map((c) => (
            <Link key={c.id} href={`/chat?c=${encodeURIComponent(c.id)}`} className={INSET.row}>
              <MessagesSquare className={INSET.icon} />
              <span className="min-w-0 truncate">{c.title || "Untitled chat"}</span>
            </Link>
          ))
        )}
      </InsetBody>
    </>
  );
  const tablesView = (
    <>
      <ViewHeader onBack={back}>
        <h2 className={INSET.title}>Tables in this answer</h2>
      </ViewHeader>
      <InsetBody className="thin-scrollbar">
        <p className={INSET.note}>The tables an answer uses are listed here when the chat is on.</p>
      </InsetBody>
    </>
  );
  return (
    <InsetPanel side="right" storageKey="chat:inset-right-w">
      <InsetLayers layerKey={view} depth={view === "menu" ? 0 : 1}>
        {{ menu, saved: savedView, tables: tablesView }[view]}
      </InsetLayers>
    </InsetPanel>
  );
}
