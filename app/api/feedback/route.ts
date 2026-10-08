import { randomUUID } from "node:crypto";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { NextResponse } from "next/server";
import { within } from "@/lib/limits";

/**
 * The Contact form (2026-10-08). Every message is kept in the
 * nysgpt-feedback table first, so none is lost, then mailed to the inbox
 * with the sender as Reply-To. The mail goes through SES from a verified
 * address; until that address is verified the send fails quietly and the
 * stored copy stands. A hidden field bots fill in and people don't, and a
 * site-wide daily cap, keep it from being a spam pipe.
 */

export const dynamic = "force-dynamic";

const INBOX = "brendan@nysgpt.com";
const DAILY = 100;

const ddb = new DynamoDBClient({ region: "us-east-1" });
const ses = new SESv2Client({ region: "us-east-1" });

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string; message?: string; website?: string };
  // The trap: a field people never see. Anything in it is a bot; it is told it succeeded.
  if (body.website) return NextResponse.json({ ok: true });
  const name = (body.name ?? "").trim().slice(0, 120);
  const email = (body.email ?? "").trim().slice(0, 200);
  const message = (body.message ?? "").trim().slice(0, 5000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "That doesn't look like a valid email." }, { status: 400 });
  if (message.length < 2) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  if (!(await within("feedback", DAILY))) return NextResponse.json({ error: "The form is closed for today. Try again tomorrow." }, { status: 429 });

  const at = new Date().toISOString();
  try {
    await ddb.send(
      new PutItemCommand({
        TableName: "nysgpt-feedback",
        Item: { id: { S: `${at}#${randomUUID().slice(0, 8)}` }, at: { S: at }, name: { S: name || "(none)" }, email: { S: email }, message: { S: message } },
      })
    );
  } catch (e) {
    console.error("feedback store:", (e as Error).name);
    return NextResponse.json({ error: "The message could not be sent. Try again." }, { status: 500 });
  }

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: `NYSgpt Contact <${INBOX}>`,
        Destination: { ToAddresses: [INBOX] },
        ReplyToAddresses: [email],
        Content: { Simple: { Subject: { Data: `Contact from ${name || email}` }, Body: { Text: { Data: `${message}\n\n— ${name || "(no name)"} <${email}>\n${at}` } } } },
      })
    );
  } catch (e) {
    // Stored already; the mail is a convenience on top.
    console.error("feedback mail:", (e as Error).name);
  }
  return NextResponse.json({ ok: true });
}
