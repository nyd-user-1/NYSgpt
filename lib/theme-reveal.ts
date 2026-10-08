import { flushSync } from "react-dom";

/**
 * Light ⇄ dark with a circular reveal from the clicked control (ported from
 * 44b; moved out of AppLayout 2026-10-07 when the switch joined the user panel).
 *
 * The class is flipped synchronously, so the view-transition snapshot captures
 * the new theme and the reveal grows from the click, and the choice is saved
 * to the localStorage key next-themes reads on load. No setTheme: next-themes'
 * disableTransitionOnChange fires during the transition and hijacks it into
 * the default centre cross-fade.
 */
export function revealTheme(e: React.MouseEvent, onApplied?: (dark: boolean) => void) {
  // The control's centre, robust to edge clicks and keyboard activation (clientX/Y 0).
  const rect = e.currentTarget.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const nextIsDark = !document.documentElement.classList.contains("dark");

  const apply = () => {
    document.documentElement.classList.toggle("dark", nextIsDark);
    localStorage.setItem("theme", nextIsDark ? "dark" : "light");
    onApplied?.(nextIsDark);
  };

  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition) return apply();

  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  doc
    .startViewTransition(() => flushSync(apply))
    .ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: "cubic-bezier(.76,.32,.29,.99)", pseudoElement: "::view-transition-new(root)" }
      );
    })
    .catch(() => {});
}
