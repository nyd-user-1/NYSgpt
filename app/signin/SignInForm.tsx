"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";

type Mode = "signin" | "signup";

const FIELD = "w-full rounded-xl border bg-background px-4 py-3 text-[15px] outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";
const BUTTON = "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60";

const post = async (action: string, body: object) => {
  const r = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; confirm?: boolean };
  return { status: r.status, ...j };
};

/**
 * Sign in, or make an account (ported from Hermes, 2026-10-07): email and
 * password, then the six-digit code Cognito emails, then signed in and on to
 * `next`. An account that never confirmed lands on the code step at sign-in.
 * Forgot password (2026-10-24): the email, then the emailed code and a new
 * password, then signed in with it.
 */
export function SignInForm({ mode, next }: { mode: Mode; next: string }) {
  const [step, setStep] = useState<"form" | "code" | "forgot" | "reset">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const other = (to: Mode) => `/${to}${next !== "/welcome" ? `?next=${encodeURIComponent(next)}` : ""}`;

  const signin = async () => {
    const r = await post("signin", { email, password });
    if (r.status === 409) {
      await post("resend", { email });
      setNotice(`Confirm the email first. A new code is on its way to ${email}.`);
      setStep("code");
    } else if (r.ok) window.location.assign(next);
    else setError(r.error ?? "Something went wrong. Try again.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (step === "forgot") {
        const r = await post("forgot", { email });
        if (r.ok) {
          setCode("");
          setPassword("");
          setStep("reset");
        } else setError(r.error ?? "Something went wrong. Try again.");
      } else if (step === "reset") {
        const r = await post("reset", { email, code, password });
        if (r.ok) await signin();
        else setError(r.error ?? "Something went wrong. Try again.");
      } else if (step === "code") {
        const r = await post("confirm", { email, code });
        if (r.ok) await signin();
        else setError(r.error ?? "Something went wrong. Try again.");
      } else if (mode === "signup") {
        const r = await post("signup", { email, password });
        if (r.ok) setStep("code");
        else setError(r.error ?? "Something went wrong. Try again.");
      } else {
        await signin();
      }
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setStep("form");
        setError(null);
        setNotice(null);
      }}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      Back to sign in
    </button>
  );

  if (step === "forgot")
    return (
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
        </label>
        {error && <p className="m-0 text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className={BUTTON}>
          {busy ? "One moment…" : "Send a reset code"} <ArrowRight className="size-4" aria-hidden />
        </button>
        {back}
      </form>
    );

  if (step === "reset")
    return (
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="m-0 flex items-start gap-2.5 rounded-xl bg-muted/60 px-4 py-3 text-sm leading-relaxed">
          <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {notice ?? `If ${email} has an account, a six-digit code is on its way to it.`}
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Code
          <input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className={`${FIELD} tabular-nums tracking-[0.3em]`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          New password
          <input type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} />
          <span className="text-xs font-normal text-muted-foreground">At least 10 characters, with a lowercase letter and a number.</span>
        </label>
        {error && <p className="m-0 text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={busy || code.trim().length < 6} className={BUTTON}>
          {busy ? "One moment…" : "Set password and sign in"} <ArrowRight className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            await post("forgot", { email });
            setNotice(`A new code is on its way to ${email}.`);
          }}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Send a new code
        </button>
        {back}
      </form>
    );

  if (step === "code")
    return (
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="m-0 flex items-start gap-2.5 rounded-xl bg-muted/60 px-4 py-3 text-sm leading-relaxed">
          <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {notice ?? `A six-digit code is on its way to ${email}.`}
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Code
          <input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className={`${FIELD} tabular-nums tracking-[0.3em]`} />
        </label>
        {error && <p className="m-0 text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={busy || code.trim().length < 6} className={BUTTON}>
          {busy ? "One moment…" : "Confirm"} <ArrowRight className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            await post("resend", { email });
            setNotice(`A new code is on its way to ${email}.`);
          }}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Send a new code
        </button>
      </form>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Password
        <input type="password" required minLength={mode === "signup" ? 10 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} />
        {mode === "signup" && <span className="text-xs font-normal text-muted-foreground">At least 10 characters, with a lowercase letter and a number.</span>}
      </label>
      {/* Outside the label: a button inside one would become the label's control. */}
      {mode === "signin" && (
        <button
          type="button"
          onClick={() => {
            setStep("forgot");
            setError(null);
            setNotice(null);
          }}
          className="-mt-2 self-end text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Forgot password?
        </button>
      )}
      {error && <p className="m-0 text-sm font-medium text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={BUTTON}>
        {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"} <ArrowRight className="size-4" aria-hidden />
      </button>
      <p className="m-0 text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>Already have an account? <Link href={other("signin")} className="font-medium text-foreground hover:underline">Sign in</Link></>
        ) : (
          <>No account yet? <Link href={other("signup")} className="font-medium text-foreground hover:underline">Create one</Link></>
        )}
      </p>
    </form>
  );
}
