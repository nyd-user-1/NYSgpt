"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogPopup, DialogTitle } from "@/components/animate-ui/components/base/dialog";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const FIELD = "w-full rounded-xl border bg-background px-4 py-3 text-[15px] outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

/**
 * "Contact" in the homepage byline, and the contact form it opens
 * (2026-10-08), in the card dialogs' frame. Messages go to /api/feedback.
 */
export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  /** The trap field: hidden from people, filled in by bots. */
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next && sent) {
      setSent(false);
      setName("");
      setEmail("");
      setMessage("");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, message, website }) }).catch(() => null);
    const j = r ? ((await r.json().catch(() => ({}))) as { ok?: boolean; error?: string }) : {};
    setBusy(false);
    if (j.ok) setSent(true);
    else setError(j.error ?? "The message could not be sent. Try again.");
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="uppercase tracking-[inherit] transition-colors hover:text-[var(--paper-text)]">
        Contact
      </button>
      <Dialog open={open} onOpenChange={close}>
        <DialogPopup from="top" showCloseButton={false} className="w-[min(520px,calc(100vw-2rem))] rounded-2xl border-0 bg-sidebar p-2 shadow-lg sm:max-w-none">
          <div className="flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
            <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between gap-3 border-b pr-3 pl-5">
              <DialogTitle className="text-xl font-normal text-foreground" style={SERIF}>Contact</DialogTitle>
              <DialogDescription className="sr-only">Send a message to NYSgpt.</DialogDescription>
              <DialogClose className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="size-4" aria-hidden />
                <span className="sr-only">Close</span>
              </DialogClose>
            </DialogHeader>

            {sent ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <p className="m-0 text-2xl text-foreground" style={SERIF}>Message sent.</p>
                <p className="m-0 text-sm text-muted-foreground">A reply goes to {email}.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4 p-5">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Name
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={FIELD} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Email
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={FIELD} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Message
                  <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className={`${FIELD} resize-none`} />
                </label>
                {/* The trap: off screen and out of the tab order, so only a bot fills it in. */}
                <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                {error && <p className="m-0 text-sm font-medium text-red-600">{error}</p>}
                <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60">
                  {busy ? "Sending…" : "Send"} <ArrowRight className="size-4" aria-hidden />
                </button>
              </form>
            )}
          </div>
        </DialogPopup>
      </Dialog>
    </>
  );
}
