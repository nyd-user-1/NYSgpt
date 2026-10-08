"use client";

import { useState } from "react";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { DiscussionHeaderButton } from "@/components/DiscussionHeaderButton";
import { UserPanel } from "@/components/UserPanel";
import { VisitorLog } from "@/components/VisitorLog";

/**
 * The 44b app shell — a floating rounded content panel beside a collapsible
 * sidebar, with a header (sidebar toggle · Commons) and a
 * follow-you panel root on the right. Ported from /Code/44b.
 *
 * The sidebar is the visitor log above the user panel, which holds the
 * light/dark switch and sign in or out (2026-10-07).
 */
export function AppLayout({
  children,
  paperMode,
}: {
  children: React.ReactNode;
  paperMode?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="nysgpt-app flex h-dvh overflow-hidden p-0 sm:p-[18px] bg-[var(--surface)] sm:bg-[var(--bg)]">
      {/* Sidebar — wired in step 2; collapsed (w-0) until opened. */}
      <div
        className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? "w-full sm:w-[240px] sm:mr-[18px]" : "w-0"
        }`}
      >
        <div
          className={`w-full sm:w-[240px] h-full rounded-none sm:rounded-2xl overflow-hidden sm:border bg-[var(--paper)] ${
            paperMode ? "sm:border-[var(--paper-rule)]" : "sm:border-[var(--border)]"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <VisitorLog />
            </div>
            <UserPanel />
          </div>
        </div>
      </div>

      <div
        className={`relative flex flex-1 flex-col min-w-0 rounded-none sm:rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.07)] sm:border ${
          paperMode
            ? "bg-[var(--paper)] sm:border-[var(--paper-rule)]"
            : "bg-[var(--surface)] sm:border-[var(--border)]"
        }`}
      >
        <div className="flex items-center px-5 pt-5 pb-5">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
            className={`hidden sm:flex h-10 w-10 items-center justify-center rounded-full shadow-md outline-none transition-colors ${
              paperMode
                ? "border border-[var(--paper-rule)] bg-[var(--paper)] hover:bg-[var(--paper-quiet)]"
                : "border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--inp-bg)]"
            }`}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" style={{ color: "#033882", fill: "#dbe7fa" }} />
            ) : (
              <PanelLeftOpen className="h-4 w-4" style={{ color: "#033882", fill: "#dbe7fa" }} />
            )}
          </button>

          <div className="flex-1" />

          {/* Commons button — toggles the follow-you panel. */}
          <DiscussionHeaderButton paperMode={paperMode} />
        </div>

        {children}
      </div>

      <div id="app-panel-root" className="flex shrink-0 h-full" />

      {/* Mobile sidebar toggle. */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle sidebar"
        className="sm:hidden fixed z-50 bottom-4 right-2 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-lg hover:bg-[var(--inp-bg)]"
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-5 w-5" style={{ color: "#033882", fill: "#dbe7fa" }} />
        ) : (
          <PanelLeftOpen className="h-5 w-5" style={{ color: "#033882", fill: "#dbe7fa" }} />
        )}
      </button>
    </div>
  );
}
