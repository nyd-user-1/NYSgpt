"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BadgeCheck, ChevronsUpDown, LogIn, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { useProductStatus } from "@/components/ProductStatus";
import { revealTheme } from "@/lib/theme-reveal";

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const;
const NAVY = "#033882";

/** The signed-in reader's own pages. */
const PAGES = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/account", label: "Account", Icon: BadgeCheck },
  { href: "/notifications", label: "Notifications", Icon: Bell },
  { href: "/settings", label: "Settings", Icon: Settings },
];

const ITEM ="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] text-[var(--paper-text)] transition-colors hover:bg-[var(--paper-quiet)]";

/** The reader's avatar: a person in a soft disc (no photos are held). */
function Avatar({ size }: { size: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-[var(--paper-rule-soft)]" style={{ width: size, height: size }}>
      <User className="size-4 text-[var(--paper-faint)]" aria-hidden />
    </span>
  );
}

/**
 * The foot of the sidebar (2026-10-07): who is signed in, and a menu opening
 * upward with the reader's own pages (signed in only), the light/dark switch,
 * and sign in or sign out.
 */
export function UserPanel() {
  const { email } = useProductStatus();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const label = email || "Not signed in";

  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => root.current?.contains(e.target as Node) || setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
    window.location.assign("/");
  };

  return (
    <div ref={root} className="relative shrink-0 border-t border-[var(--paper-rule-soft)] p-3" style={SANS}>
      {open && (
        <div role="menu" className="absolute right-3 bottom-full left-3 mb-2 overflow-hidden rounded-2xl border border-[var(--paper-rule)]/40 bg-[var(--paper)] shadow-lg">
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar size={40} />
            <span className="min-w-0 truncate text-[15px] font-semibold" style={{ color: NAVY }}>{label}</span>
          </div>
          <div className="border-t border-[var(--paper-rule-soft)]" />
          {email !== null && (
            <>
              {PAGES.map(({ href, label: name, Icon }) => (
                <a key={href} role="menuitem" className={ITEM} href={href}>
                  <Icon className="size-4 text-[var(--paper-faint)]" aria-hidden /> {name}
                </a>
              ))}
              <div className="border-t border-[var(--paper-rule-soft)]" />
            </>
          )}
          <button type="button" role="menuitem" className={ITEM} onClick={(e) => revealTheme(e, setDark)}>
            {dark ? <Sun className="size-4" style={{ color: "#e0a13c", fill: "#e0a13c" }} aria-hidden /> : <Moon className="size-4" style={{ color: NAVY, fill: "#fdf0c9" }} aria-hidden />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
          <div className="border-t border-[var(--paper-rule-soft)]" />
          {email !== null ? (
            <button type="button" role="menuitem" className={ITEM} onClick={signOut}>
              <LogOut className="size-4 text-[var(--paper-faint)]" aria-hidden /> Sign out
            </button>
          ) : (
            <a role="menuitem" className={ITEM} href="/signin">
              <LogIn className="size-4 text-[var(--paper-faint)]" aria-hidden /> Sign in
            </a>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-full px-1.5 py-1.5 text-left transition-colors hover:bg-[var(--paper-quiet)]"
      >
        <Avatar size={32} />
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold" style={{ color: NAVY }}>{label}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-[var(--paper-faint)]" aria-hidden />
      </button>
    </div>
  );
}
