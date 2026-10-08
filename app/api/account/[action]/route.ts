import { AdminDeleteUserCommand, AdminSetUserPasswordCommand, AdminUpdateUserAttributesCommand, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cognito, currentUser, POOL_ID, SESSION_COOKIE } from "@/lib/auth";

/**
 * The signed-in reader's own account (2026-10-07): the display name, the
 * password (the current one is checked first), and deletion. Always the
 * account in the session cookie; nothing here takes an email from the body.
 */

export const dynamic = "force-dynamic";

const CLIENT = process.env.NYSGPT_COGNITO_CLIENT_ID;

const FRIENDLY: Record<string, string> = {
  NotAuthorizedException: "The current password is wrong.",
  InvalidPasswordException: "Use at least 10 characters, with a lowercase letter and a number.",
  TooManyRequestsException: "Too many tries. Wait a minute and try again.",
  LimitExceededException: "Too many tries. Wait a minute and try again.",
};

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!POOL_ID || !CLIENT) return NextResponse.json({ error: "Accounts aren't configured here." }, { status: 503 });
  const { action } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; current?: string; next?: string; confirm?: string };
  try {
    if (action === "name") {
      const name = (body.name ?? "").trim().slice(0, 80);
      await cognito.send(new AdminUpdateUserAttributesCommand({ UserPoolId: POOL_ID, Username: user.email, UserAttributes: [{ Name: "name", Value: name }] }));
      return NextResponse.json({ ok: true });
    }
    if (action === "password") {
      const next = body.next ?? "";
      if (next.length < 10 || !/[a-z]/.test(next) || !/\d/.test(next)) return NextResponse.json({ error: FRIENDLY.InvalidPasswordException }, { status: 400 });
      // The current password, checked by signing in with it (the session is left as it is).
      await cognito.send(new InitiateAuthCommand({ ClientId: CLIENT, AuthFlow: "USER_PASSWORD_AUTH", AuthParameters: { USERNAME: user.email, PASSWORD: body.current ?? "" } }));
      await cognito.send(new AdminSetUserPasswordCommand({ UserPoolId: POOL_ID, Username: user.email, Password: next, Permanent: true }));
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      if (body.confirm !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
      await cognito.send(new AdminDeleteUserCommand({ UserPoolId: POOL_ID, Username: user.email }));
      (await cookies()).delete(SESSION_COOKIE);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  } catch (e) {
    const name = (e as { name?: string }).name ?? "";
    console.error("account:", action, name);
    return NextResponse.json({ error: FRIENDLY[name] ?? "Something went wrong. Try again." }, { status: 400 });
  }
}
