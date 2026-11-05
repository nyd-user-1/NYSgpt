"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

const FIELD = "w-full rounded-xl border bg-background px-4 py-3 text-[15px] outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

/** Email and a new password; on success the reader is signed in and on to the welcome screen. */
export function InviteForm({ id }: { id: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/invite/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (j.ok) window.location.assign("/welcome");
      else setError(j.error ?? "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Password
        <input type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} />
        <span className="text-xs font-normal text-muted-foreground">At least 10 characters, with a lowercase letter and a number.</span>
      </label>
      {error && <p className="m-0 text-sm font-medium text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60">
        {busy ? "One moment…" : "Create account"} <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  );
}
