"use client";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;

/**
 * The NYSgpt nameplate on the home masthead — a clickable cell that will open
 * the Commons panel (wired in a later step). Kept as a client island so the
 * home page itself stays a server component.
 */
export function HomeNameplate() {
  return (
    <button
      aria-label="Open the Commons"
      className="group/name self-stretch flex items-center justify-center border-l border-[var(--paper-rule)] px-6 py-8 transition-colors hover:bg-[var(--paper-quiet)] cursor-pointer sm:px-10 lg:w-[360px]"
    >
      <span
        className="text-[var(--paper-text)] leading-[0.82] transition-colors group-hover/name:text-[var(--paper-strong)]"
        style={{
          ...SERIF,
          fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
          fontWeight: 400,
          letterSpacing: "-0.03em",
        }}
      >
        NYSgpt
      </span>
    </button>
  );
}
