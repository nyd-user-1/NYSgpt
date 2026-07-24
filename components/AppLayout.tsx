"use client";

import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { PanelLeftOpen, PanelLeftClose, Sun, Moon, MessagesSquare } from "lucide-react";

/**
 * The 44b app shell — a floating rounded content panel beside a collapsible
 * sidebar, with a header (sidebar toggle · Commons · theme toggle) and a
 * follow-you panel root on the right. Ported from /Code/44b.
 *
 * Step 1 renders the visible chrome only: the sidebar body and the Commons
 * panel are placeholders, wired in later steps.
 */
export function AppLayout({
  children,
  paperMode,
}: {
  children: React.ReactNode;
  paperMode?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme(e: React.MouseEvent) {
    // Anchor the reveal to the button's center (robust vs. edge clicks / keyboard
    // activation where clientX/Y can be 0).
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const nextIsDark = !dark;

    const apply = () => {
      // Match 44b exactly: flip the class synchronously (so the view-transition
      // snapshot captures the new theme and the reveal emanates from the click)
      // and persist to the localStorage key next-themes reads on load. No
      // setTheme — next-themes' disableTransitionOnChange fires during the
      // transition and hijacks it into the default center cross-fade.
      setDark(nextIsDark);
      document.documentElement.classList.toggle("dark", nextIsDark);
      localStorage.setItem("theme", nextIsDark ? "dark" : "light");
    };

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };

    if (!doc.startViewTransition) {
      apply();
      return;
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const transition = doc.startViewTransition(() => {
      flushSync(apply);
    });
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 600,
            easing: "cubic-bezier(.76,.32,.29,.99)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {});
  }

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
        />
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

          {/* Commons button — panel wired in step 3. */}
          <button
            aria-label="Open the Commons"
            className={`hidden sm:flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-colors mr-2 ${
              paperMode
                ? "border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-faint)] hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--inp-bg)] hover:text-[var(--txt)]"
            }`}
          >
            <MessagesSquare className="h-4 w-4" style={{ color: "#033882" }} />
          </button>

          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className={`hidden sm:flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-colors ${
              paperMode
                ? "border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-faint)] hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--inp-bg)] hover:text-[var(--txt)]"
            }`}
          >
            {dark ? (
              <Sun className="h-4 w-4" style={{ color: "#e0a13c", fill: "#e0a13c" }} />
            ) : (
              <Moon className="h-4 w-4" style={{ color: "#033882", fill: "#fdf0c9" }} />
            )}
          </button>
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
