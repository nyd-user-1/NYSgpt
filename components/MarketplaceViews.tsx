'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MailCheck, Check, Copy, Mail, RotateCw } from 'lucide-react'

/**
 * The AWS Marketplace buyer's two views in the switchboard panel (2026-10-24):
 * `AwsRegister` is where AWS sends a buyer after they subscribe (the listing's
 * fulfillment URL, by way of /aws/subscribe), `AwsConsole` is where a buyer
 * sees their plan, key and usage afterwards. AWS requires an email field on
 * the first, and a subscription status, key rotation and a support contact on
 * the second.
 *
 * Marketplace buyers pay AWS, so neither view may show Stripe checkout or a
 * plan that is not on the listing; changes go through AWS_SUBSCRIPTIONS.
 */

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const

const AWS_SUBSCRIPTIONS = 'https://console.aws.amazon.com/marketplace/home#/subscriptions'
const SUPPORT = 'Brendan@nysgpt.com'
const GENERIC = 'Something went wrong. Try again.'
const fmt = (v: number) => v.toLocaleString('en-US')

/** What the buyer bought: one tier of the listing. A tier sells every table. */
export type AwsPlan = {
  product: string
  dataset: string
  calls: string
  /** Calls a month; null is unlimited. */
  quota: number | null
  license: string
  tables: number
}

export type AwsSubscription = AwsPlan & {
  status: 'active' | 'pending' | 'ended'
  /** The renewal date, or null once ended. */
  until: string | null
  keyId: string
  key: string
  used: number
  resets: string
}

const STATUS: Record<AwsSubscription['status'], { label: string; dot: string }> = {
  active: { label: 'Active', dot: 'bg-emerald-500' },
  pending: { label: 'Waiting on AWS to confirm payment', dot: 'bg-amber-500' },
  ended: { label: 'Ended', dot: 'bg-[var(--paper-faint)]' },
}

// AccountShell's FIELD and BUTTON, copied: importing them would close a cycle
// (SwitchboardPanel, here, AccountShell, AppLayout, back to SwitchboardPanel).
const FIELD =
  'w-full rounded-xl border border-[var(--paper-rule)]/25 bg-[var(--paper)] px-4 py-3 text-[15px] text-[var(--paper-text)] outline-none transition-shadow focus:ring-2 focus:ring-ring'
const BUTTON =
  'inline-flex h-11 items-center justify-center rounded-xl bg-[var(--paper-text)] px-5 text-[14px] font-medium text-[var(--paper)] transition-opacity hover:opacity-90 disabled:opacity-60'
const LABEL = 'flex flex-col gap-1.5 text-sm font-medium text-[var(--paper-text)]'
const GHOST =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--paper-rule)]/25 px-4 text-[14px] font-medium text-[var(--paper-text)] transition-colors hover:bg-[var(--paper-quiet)] disabled:opacity-60'
const LINK = 'text-[var(--paper-strong)]'
const QUIET = 'text-[13px] text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-text)]'

async function post(path: string, body: object) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  return { ok: r.ok && j.ok !== false, error: j.error }
}

function Block({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--paper-rule)] px-5 py-6" style={SANS}>
      {label && (
        <h3 className="m-0 mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--paper-faint)]">{label}</h3>
      )}
      {children}
    </section>
  )
}

function Dot({ className }: { className: string }) {
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${className}`} />
}

/** Pinned to the panel's bottom edge, as the switchboard's Visit footer is. */
function SupportFooter() {
  return (
    <div className="sticky bottom-0 z-10 mt-auto border-t border-[var(--paper-rule)] bg-[var(--paper)]/85 backdrop-blur-md">
      <a href={`mailto:${SUPPORT}`} className="group/visit flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--paper-quiet)]">
        <span className="text-[15px] text-[var(--paper-text)] transition-colors group-hover/visit:text-[var(--paper-strong)]" style={SERIF}>
          Support
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--paper-muted)]" style={SANS}>{SUPPORT}</span>
        <span className="flex shrink-0 items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--paper-rule-soft)]">
          <Mail className="h-4 w-4 text-[var(--paper-strong)]" />
        </span>
      </a>
    </div>
  )
}

/**
 * Registration: a new account (email, password, then the code Cognito emails)
 * or the signed-in one, then the key for the subscription (/api/aws/claim),
 * then the console.
 */
export function AwsRegister({ plan, signedIn }: { plan: AwsPlan; signedIn: string | null }) {
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true)
    setError(null)
    try {
      setError(await fn())
    } finally {
      setBusy(false)
    }
  }

  const claim = async () => {
    const r = await post('/api/aws/claim', { company })
    if (!r.ok) return r.error ?? GENERIC
    window.location.assign('/account/api')
    return null
  }

  const signup = (e: React.FormEvent) => {
    e.preventDefault()
    run(async () => {
      const r = await post('/api/auth/signup', { email, password })
      if (!r.ok) return r.error ?? GENERIC
      setStep('code')
      return null
    })
  }

  const confirm = (e: React.FormEvent) => {
    e.preventDefault()
    run(async () => {
      const c = await post('/api/auth/confirm', { email, code })
      if (!c.ok) return c.error ?? GENERIC
      const s = await post('/api/auth/signin', { email, password })
      if (!s.ok) return s.error ?? GENERIC
      return claim()
    })
  }

  return (
    <>
      <Block>
        <p className="m-0 flex items-center gap-2 text-[14px] font-medium text-[var(--paper-text)]">
          <Dot className={STATUS.active.dot} />
          Subscription confirmed
        </p>
        <p className="m-0 mt-1.5 text-[13px] leading-[1.6] text-[var(--paper-muted)]">
          {plan.calls} · {plan.license} · all {fmt(plan.tables)} tables
        </p>
      </Block>

      {signedIn ? (
        <div className="flex flex-col gap-4 border-b border-[var(--paper-rule)] px-5 py-6" style={SANS}>
          <p className="m-0 text-[14px] text-[var(--paper-muted)]">
            Signed in as <span className="text-[var(--paper-text)]">{signedIn}</span>
          </p>
          {error && <p className="m-0 text-sm font-medium text-red-600">{error}</p>}
          <button type="button" disabled={busy} onClick={() => run(claim)} className={`${BUTTON} w-full`}>
            {busy ? 'One moment…' : 'Get my key'}
          </button>
        </div>
      ) : step === 'code' ? (
        <form onSubmit={confirm} className="flex flex-col gap-4 border-b border-[var(--paper-rule)] px-5 py-6" style={SANS}>
          <p className="m-0 flex items-start gap-2.5 rounded-xl bg-[var(--paper-quiet)] px-4 py-3 text-sm leading-relaxed text-[var(--paper-text)]">
            <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            {notice ?? `A six-digit code is on its way to ${email}.`}
          </p>
          <label className={LABEL}>
            Code
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${FIELD} tabular-nums tracking-[0.3em]`}
            />
          </label>
          {error && <p className="m-0 text-sm font-medium text-red-600">{error}</p>}
          <button type="submit" disabled={busy || code.trim().length < 6} className={`${BUTTON} w-full`}>
            {busy ? 'One moment…' : 'Confirm and get my key'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              await post('/api/auth/resend', { email })
              setNotice(`A new code is on its way to ${email}.`)
            }}
            className={QUIET}
          >
            Send a new code
          </button>
        </form>
      ) : (
        <form onSubmit={signup} className="flex flex-col gap-4 border-b border-[var(--paper-rule)] px-5 py-6" style={SANS}>
          <label className={LABEL}>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={FIELD}
            />
          </label>
          <label className={LABEL}>
            Password
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 10 characters"
              className={FIELD}
            />
          </label>
          <label className={LABEL}>
            <span>
              Company <span className="font-normal text-[var(--paper-faint)]">Optional</span>
            </span>
            <input autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} className={FIELD} />
          </label>
          {error && <p className="m-0 text-sm font-medium text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className={`${BUTTON} w-full`}>
            {busy ? 'One moment…' : 'Create account and get my key'}
          </button>
          <p className="m-0 text-center text-[13px] text-[var(--paper-muted)]">
            Have an account?{' '}
            <Link href="/signin?next=/aws/register" className={LINK}>
              <span className="link-wipe">Sign in</span>
            </Link>
          </p>
        </form>
      )}

      <SupportFooter />
    </>
  )
}

function KeyField({ keyId, value }: { keyId: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const rotate = async () => {
    if (!confirming) return setConfirming(true)
    setBusy(true)
    const r = await post('/api/aws/rotate', { keyId })
    if (r.ok) window.location.reload()
    else {
      setError(r.error ?? GENERIC)
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <>
      <code className="block overflow-x-auto whitespace-nowrap rounded-xl bg-zinc-950 px-4 py-3 text-[13px] text-amber-300" style={MONO}>
        {value.slice(0, 4)}
        {'•'.repeat(16)}
        {value.slice(-4)}
      </code>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={copy} className={GHOST}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" onClick={rotate} disabled={busy} className={GHOST}>
          <RotateCw className="h-4 w-4" />
          {busy ? 'One moment…' : confirming ? 'Confirm rotate' : 'Rotate'}
        </button>
      </div>
      {confirming && !busy && <p className="m-0 mt-2 text-[13px] text-[var(--paper-muted)]">The current key stops working at once.</p>}
      {error && <p className="m-0 mt-2 text-sm font-medium text-red-600">{error}</p>}
    </>
  )
}

/** The console view: the subscription as AWS reports it, the key, and the month's calls. */
export function AwsConsole({ sub }: { sub: AwsSubscription }) {
  const status = STATUS[sub.status]
  const share = sub.quota ? Math.min(sub.used / sub.quota, 1) : 0
  const rows: [string, React.ReactNode][] = [
    [
      'Status',
      <span key="s" className="inline-flex items-center gap-2">
        <Dot className={status.dot} />
        {status.label}
      </span>,
    ],
    ['Plan', `${sub.calls} · ${sub.license}`],
    ['Tables', `All ${fmt(sub.tables)}`],
    ...(sub.until ? [['Renews', sub.until] as [string, React.ReactNode]] : []),
    [
      'Billed by',
      <span key="b">
        AWS Marketplace ·{' '}
        <a href={AWS_SUBSCRIPTIONS} target="_blank" rel="noreferrer noopener" className={LINK}>
          <span className="link-wipe">Change or cancel</span>
        </a>
      </span>,
    ],
  ]

  return (
    <>
      <Block label="Subscription">
        <dl className="m-0 grid grid-cols-[88px_1fr] gap-x-4 gap-y-2.5 text-[14px] text-[var(--paper-text)]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[var(--paper-muted)]">{k}</dt>
              <dd className="m-0">{v}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block label="Key">
        <KeyField keyId={sub.keyId} value={sub.key} />
        <pre
          className="m-0 mt-4 overflow-x-auto rounded-xl border border-[var(--paper-rule)]/25 px-4 py-3 text-[12.5px] leading-relaxed text-[var(--paper-text)]"
          style={MONO}
        >
{`curl https://api.nysgpt.com/v1/${sub.dataset} \\
  -H "x-api-key: $NYSGPT_KEY"`}
        </pre>
      </Block>

      <Block label="Usage this month">
        <div className="flex flex-wrap justify-between gap-3 text-[14px] text-[var(--paper-muted)]">
          <span>
            <span className="font-medium tabular-nums text-[var(--paper-text)]">{fmt(sub.used)}</span>
            {sub.quota ? ` of ${fmt(sub.quota)} calls` : ' calls'}
          </span>
          <span>Resets {sub.resets}</span>
        </div>
        {sub.quota !== null && (
          <div className="mt-3 h-2 overflow-hidden rounded-full border border-[var(--paper-rule-soft)] bg-[var(--paper-quiet)]">
            <div className="h-full bg-[var(--paper-strong)]" style={{ width: `${share * 100}%` }} />
          </div>
        )}
      </Block>

      <SupportFooter />
    </>
  )
}
