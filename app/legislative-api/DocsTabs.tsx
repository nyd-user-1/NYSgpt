"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/legislative-api/dictionary", label: "Data dictionary" },
  { href: "/legislative-api/coverage", label: "Coverage" },
];

export function DocsTabs() {
  const path = usePathname();
  return (
    <nav className="mb-8 flex gap-6 border-b border-[var(--paper-rule-soft)]">
      {TABS.map((t) => {
        const on = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 pb-3 text-[14px] transition-colors ${
              on ? "border-[var(--paper-text)] text-[var(--paper-text)]" : "border-transparent text-[var(--paper-muted)] hover:text-[var(--paper-text)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
