import { AdminCreateUserCommand, AdminGetUserCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { NextResponse } from "next/server";
import { cognito, POOL_ID, signIn } from "@/lib/auth";
import { readInvite, spendInvite, usable } from "@/lib/invites";

/**
 * Redeems an invite: creates the account (no email is sent; the address is
 * taken as given), signs it in, and only then spends the invite. If the
 * account already exists and the password matches, that counts too, so a
 * reader whose first try failed after the account was made can finish.
 */

export const dynamic = "force-dynamic";

const FRIENDLY: Record<string, string> = {
  InvalidPasswordException: "Use at least 10 characters, with a lowercase letter and a number.",
  InvalidParameterException: "That doesn't look like a valid email.",
  NotAuthorizedException: "That email already has an account with a different password. Sign in instead.",
  TooManyRequestsException: "Too many tries. Wait a minute and try again.",
  LimitExceededException: "Too many tries. Wait a minute and try again.",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invite = await readInvite(id);
  if (!usable(invite)) return NextResponse.json({ error: "This invite has been used or has expired." }, { status: 410 });
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!POOL_ID) return NextResponse.json({ error: "Sign-in isn't configured here." }, { status: 503 });
  // The pool's policy, checked before anything is created.
  if (password.length < 10 || !/[a-z]/.test(password) || !/\d/.test(password)) return NextResponse.json({ error: FRIENDLY.InvalidPasswordException }, { status: 400 });
  try {
    const setPassword = () => cognito.send(new AdminSetUserPasswordCommand({ UserPoolId: POOL_ID, Username: email, Password: password, Permanent: true }));
    try {
      await cognito.send(new AdminCreateUserCommand({ UserPoolId: POOL_ID, Username: email, MessageAction: "SUPPRESS", UserAttributes: [{ Name: "email", Value: email }, { Name: "email_verified", Value: "true" }] }));
      await setPassword();
    } catch (e) {
      if ((e as { name?: string }).name !== "UsernameExistsException") throw e;
      // An account an earlier try created but never gave a password is finished
      // here; an account with a password of its own must sign in with it.
      const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: POOL_ID, Username: email }));
      if (user.UserStatus === "FORCE_CHANGE_PASSWORD") await setPassword();
    }
    await signIn(email, password);
    await spendInvite(id, invite, email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const name = (e as { name?: string }).name ?? "";
    console.error("invite:", name);
    return NextResponse.json({ error: FRIENDLY[name] ?? "Something went wrong. Try again." }, { status: 400 });
  }
}
