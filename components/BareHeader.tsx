"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { revealTheme } from "@/lib/theme-reveal";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;

/**
 * The top of the pages that have no sidebar (sign-in, sign-up, invite,
 * welcome): the wordmark home at the left, the light/dark switch at the right.
 */
export function BareHeader() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  return (
    <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5">
      <Link href="/" className="text-[28px] leading-none text-foreground" style={{ ...SERIF, letterSpacing: "-0.03em" }}>
        NYSgpt
      </Link>
      <button
        type="button"
        onClick={(e) => revealTheme(e, setDark)}
        aria-label={dark ? "Light mode" : "Dark mode"}
        className="flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-md transition-colors hover:bg-muted"
      >
        {dark ? <Sun className="h-4 w-4" style={{ color: "#e0a13c", fill: "#e0a13c" }} /> : <Moon className="h-4 w-4" style={{ color: "#033882", fill: "#fdf0c9" }} />}
      </button>
    </header>
  );
}
