"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { BUTTON, FIELD } from "@/components/AccountShell";

const post = async (action: string, body: object) => {
  const r = await fetch(`/api/account/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
};

/** A form's outcome line: what went wrong, or that it saved. */
function Outcome({ error, done }: { error: string | null; done: string | null }) {
  if (error) return <p className="m-0 text-sm font-medium text-red-600">{error}</p>;
  if (done) return <p className="m-0 text-sm text-emerald-700 dark:text-emerald-400">{done}</p>;
  return null;
}

export function NameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setDone(null);
        const r = await post("name", { name });
        setBusy(false);
        if (r.ok) setDone("Saved.");
        else setError(r.error ?? "Something went wrong. Try again.");
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Display name
        <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" className={FIELD} />
      </label>
      <Outcome error={error} done={done} />
      <div>
        <button type="submit" disabled={busy} className={BUTTON}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setDone(null);
        const r = await post("password", { current, next });
        setBusy(false);
        if (r.ok) {
          setDone("Password changed.");
          setCurrent("");
          setNext("");
        } else setError(r.error ?? "Something went wrong. Try again.");
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Current password
        <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={FIELD} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        New password
        <input type="password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className={FIELD} />
        <span className="text-xs font-normal text-[var(--paper-faint)]">At least 10 characters, with a lowercase letter and a number.</span>
      </label>
      <Outcome error={error} done={done} />
      <div>
        <button type="submit" disabled={busy} className={BUTTON}>{busy ? "Changing…" : "Change password"}</button>
      </div>
    </form>
  );
}

export function DeleteForm() {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const r = await post("delete", { confirm });
        if (r.ok) window.location.assign("/");
        else {
          setBusy(false);
          setError(r.error ?? "Something went wrong. Try again.");
        }
      }}
    >
      <p className="m-0 text-sm leading-relaxed text-[var(--paper-muted)]">The account and its sign-in are removed for good. Type DELETE to confirm.</p>
      <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" className={FIELD} />
      <Outcome error={error} done={null} />
      <div>
        <button type="submit" disabled={busy || confirm !== "DELETE"} className={`${BUTTON} !bg-red-600 !text-white`}>{busy ? "Deleting…" : "Delete account"}</button>
      </div>
    </form>
  );
}

/** Light, dark, or whatever the device prefers. */
export function AppearanceForm() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const options: [string, string][] = [
    ["light", "Light"],
    ["dark", "Dark"],
    ["system", "Match the system"],
  ];
  return (
    <div role="radiogroup" aria-label="Appearance" className="flex flex-col gap-2">
      {options.map(([value, label]) => {
        const on = mounted && (theme ?? "system") === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors ${on ? "border-[var(--paper-text)]" : "border-[var(--paper-rule)]/25 hover:bg-[var(--paper-quiet)]"}`}
          >
            <span className={`flex size-4 items-center justify-center rounded-full border ${on ? "border-[var(--paper-text)]" : "border-[var(--paper-faint)]"}`}>
              {on && <span className="size-2 rounded-full bg-[var(--paper-text)]" />}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
