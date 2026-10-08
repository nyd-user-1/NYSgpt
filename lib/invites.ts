import { GetParameterCommand, PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

/**
 * Invite links (2026-10-07). An invite is one Parameter Store record,
 * /nysgpt/invites/<id>, whose id is the unguessable part of the link. Opening
 * the link only reads it, so a mail scanner or a forwarder testing the link
 * never spends it; it is spent only when someone creates an account through
 * it and signs in. Records are made by hand (no route creates one).
 */

export type Invite = { status: "open" | "spent"; expires: string; note?: string; email?: string; spentAt?: string };

const ssm = new SSMClient({ region: "us-east-1" });
const name = (id: string) => `/nysgpt/invites/${id}`;
/** Ids are 32 url-safe characters; anything else is not looked up at all. */
const VALID = /^[A-Za-z0-9_-]{32}$/;

export async function readInvite(id: string): Promise<Invite | null> {
  if (!VALID.test(id)) return null;
  try {
    const r = await ssm.send(new GetParameterCommand({ Name: name(id) }));
    return JSON.parse(r.Parameter?.Value ?? "null") as Invite | null;
  } catch {
    return null;
  }
}

/** Open and not past its date. */
export const usable = (invite: Invite | null): invite is Invite => !!invite && invite.status === "open" && Date.parse(invite.expires) > Date.now();

export async function spendInvite(id: string, invite: Invite, email: string): Promise<void> {
  const spent: Invite = { ...invite, status: "spent", email, spentAt: new Date().toISOString() };
  await ssm.send(new PutParameterCommand({ Name: name(id), Value: JSON.stringify(spent), Type: "String", Overwrite: true }));
}
