import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { cookies } from "next/headers";

/**
 * The signed-in reader, from the Cognito ID token in the nysgpt_session
 * cookie, verified against the pool's signing keys (2026-10-07, ported from
 * Hermes). The pool is invite-only: accounts are created by hand, so a bot
 * can never sign itself up and wake a product's database.
 */

const POOL = process.env.NYSGPT_COGNITO_POOL_ID;
const CLIENT = process.env.NYSGPT_COGNITO_CLIENT_ID;
const verifier = POOL && CLIENT ? CognitoJwtVerifier.create({ userPoolId: POOL, tokenUse: "id", clientId: CLIENT }) : null;

export const SESSION_COOKIE = "nysgpt_session";

/** admin / superAdmin / demo are what trinity's housekeeping routes read (ported 2026-11-04). nysgpt.com has no
 *  roles yet, so every reader is none of them — the same falsy value those routes already saw at runtime. */
export type SessionUser = { email: string; admin: boolean; superAdmin: boolean; demo: boolean };

/** Demo accounts don't exist here; the housekeeping routes (ported from pax-trinity) call this guard. */
export function forbidDemo(_user: unknown) {}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !verifier) return null;
  try {
    const claims = await verifier.verify(token);
    return { email: String(claims.email ?? "").toLowerCase(), admin: false, superAdmin: false, demo: false };
  } catch {
    return null;
  }
}

export const cognito = new CognitoIdentityProviderClient({ region: "us-east-1" });
export const POOL_ID = POOL;

/**
 * Signs in with email and password and sets the session cookie. Throws
 * Cognito's own error (its `name` says why) when the pair is refused.
 */
export async function signIn(email: string, password: string): Promise<void> {
  if (!CLIENT) throw Object.assign(new Error("Sign-in isn't configured here."), { name: "NotConfigured" });
  const r = await cognito.send(new InitiateAuthCommand({ ClientId: CLIENT, AuthFlow: "USER_PASSWORD_AUTH", AuthParameters: { USERNAME: email.trim().toLowerCase(), PASSWORD: password } }));
  const t = r.AuthenticationResult;
  if (!t?.IdToken) throw Object.assign(new Error("This account needs a step the form doesn't support."), { name: "ChallengeRequired" });
  (await cookies()).set(SESSION_COOKIE, t.IdToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: t.ExpiresIn ?? 3600, path: "/" });
}
