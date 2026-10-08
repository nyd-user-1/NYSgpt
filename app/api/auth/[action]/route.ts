import { ConfirmSignUpCommand, ResendConfirmationCodeCommand, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cognito, currentUser, SESSION_COOKIE, signIn } from "@/lib/auth";
import { LIMITS, within } from "@/lib/limits";

// Sign-in, sign-up, sign-out and "who am I" for nysgpt.com (2026-10-07,
// ported from Hermes). Anyone may make an account (at most LIMITS.signups a
// day); getting into a product still takes the site password, given out by
// hand. Invite links (app/invite) make accounts too.

export const dynamic = "force-dynamic";

const CLIENT = process.env.NYSGPT_COGNITO_CLIENT_ID;

const FRIENDLY: Record<string, string> = {
  UsernameExistsException: "That email already has an account. Sign in instead.",
  InvalidPasswordException: "Use at least 10 characters, with a lowercase letter and a number.",
  InvalidParameterException: "That doesn't look like a valid email.",
  CodeMismatchException: "That code doesn't match. Check the email and try again.",
  ExpiredCodeException: "That code expired. Send a new one below.",
  NotAuthorizedException: "Wrong email or password.",
  UserNotFoundException: "Wrong email or password.",
  PasswordResetRequiredException: "This account needs a new password. Ask for a reset.",
  LimitExceededException: "Too many tries. Wait a minute and try again.",
  TooManyRequestsException: "Too many tries. Wait a minute and try again.",
  NotConfigured: "Sign-in isn't configured here.",
};

export async function GET(_req: Request, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== "me") return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  return NextResponse.json({ user: await currentUser() }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action === "signout") {
    (await cookies()).delete(SESSION_COOKIE);
    return NextResponse.json({ ok: true });
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string; code?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  try {
    if (action === "signin") {
      await signIn(email, body.password ?? "");
      return NextResponse.json({ ok: true });
    }
    if (!CLIENT) return NextResponse.json({ error: FRIENDLY.NotConfigured }, { status: 503 });
    if (action === "signup") {
      // The pool's own password rule, checked first so a typo doesn't use up the day's allowance.
      const pw = body.password ?? "";
      if (pw.length < 10 || !/[a-z]/.test(pw) || !/\d/.test(pw)) return NextResponse.json({ error: FRIENDLY.InvalidPasswordException }, { status: 400 });
      if (!(await within("signups", LIMITS.signups))) return NextResponse.json({ error: "New accounts are paused for today. Try again tomorrow." }, { status: 429 });
      await cognito.send(new SignUpCommand({ ClientId: CLIENT, Username: email, Password: body.password ?? "", UserAttributes: [{ Name: "email", Value: email }] }));
      return NextResponse.json({ ok: true });
    }
    if (action === "confirm") {
      await cognito.send(new ConfirmSignUpCommand({ ClientId: CLIENT, Username: email, ConfirmationCode: (body.code ?? "").trim() }));
      return NextResponse.json({ ok: true });
    }
    if (action === "resend") {
      await cognito.send(new ResendConfirmationCodeCommand({ ClientId: CLIENT, Username: email }));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  } catch (e) {
    const name = (e as { name?: string }).name ?? "";
    // An unconfirmed account isn't an error: the next step is its code.
    if (name === "UserNotConfirmedException") return NextResponse.json({ confirm: true }, { status: 409 });
    return NextResponse.json({ error: FRIENDLY[name] ?? "Something went wrong. Try again." }, { status: 400 });
  }
}
