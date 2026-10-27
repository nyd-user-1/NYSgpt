import { AdminCreateUserCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { NextResponse } from "next/server";
import { cognito, POOL_ID, signIn } from "@/lib/auth";
import { within } from "@/lib/limits";
import { entitlementOf, pending } from "@/lib/marketplace";

/**
 * A nysgpt.com account for an AWS Marketplace buyer (2026-10-27, security
 * report F3). The pool takes no self-service sign-ups, so the account is made
 * here, the way an invite makes one (app/api/invite/[id]/route.ts): only for a
 * buyer whose registration cookie AWS issued and whose subscription AWS still
 * reports. An email that already has an account signs in with its own
 * password; this route never sets a password on an existing account.
 */

export const dynamic = "force-dynamic";

/** Accounts one subscription may make in a day; retries after a typo count. */
const PER_LICENSE = 5;

const FRIENDLY: Record<string, string> = {
  InvalidPasswordException: "Use at least 10 characters, with a lowercase letter and a number.",
  InvalidParameterException: "That doesn't look like a valid email.",
  NotAuthorizedException: "That email already has an account. Sign in with its password instead.",
  UserNotConfirmedException: "That email already has an account. Sign in with its password instead.",
  TooManyRequestsException: "Too many tries. Wait a minute and try again.",
  LimitExceededException: "Too many tries. Wait a minute and try again.",
};

export async function POST(req: Request) {
  const p = await pending().catch(() => null);
  if (!p) return NextResponse.json({ error: "Open this page from your AWS Marketplace subscription again." }, { status: 400 });
  if (!(await entitlementOf(p.product, p.license).catch(() => null)))
    return NextResponse.json({ error: "AWS has not confirmed the payment yet. Try again in a minute." }, { status: 409 });
  if (!POOL_ID) return NextResponse.json({ error: "Sign-in isn't configured here." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  // The pool's policy, checked before anything is created or counted.
  if (password.length < 10 || !/[a-z]/.test(password) || !/\d/.test(password)) return NextResponse.json({ error: FRIENDLY.InvalidPasswordException }, { status: 400 });
  if (!(await within(`aws-account#${p.license}`, PER_LICENSE))) return NextResponse.json({ error: "Too many tries today. Email Brendan@nysgpt.com and I'll set it up." }, { status: 429 });

  try {
    try {
      await cognito.send(new AdminCreateUserCommand({ UserPoolId: POOL_ID, Username: email, MessageAction: "SUPPRESS", UserAttributes: [{ Name: "email", Value: email }, { Name: "email_verified", Value: "true" }] }));
      await cognito.send(new AdminSetUserPasswordCommand({ UserPoolId: POOL_ID, Username: email, Password: password, Permanent: true }));
    } catch (e) {
      if ((e as { name?: string }).name !== "UsernameExistsException") throw e;
    }
    await signIn(email, password);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const name = (e as { name?: string }).name ?? "";
    console.error("aws account:", name);
    return NextResponse.json({ error: FRIENDLY[name] ?? "Something went wrong. Try again." }, { status: 400 });
  }
}
