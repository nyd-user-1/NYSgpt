import "server-only"

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { BatchGetCommand, DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"

// The ledger: one DynamoDB table, append-only. Nothing is updated in place;
// a decision that changes status is a new item, so the history is the table.
//
//   pk                      sk                              item
//   LOAD#<dataset>          <file hash>                     a load event (a second load of the same file is refused)
//   SNAP#<flight>           <as-of>#<window end>            a results snapshot
//   REF#<reference>         META                            a frozen reference scale
//   TAKE#<take>             FINDING#<iso>                   a PAX2 finding with its score version and evidence
//   TAKE#<take>             STEP#<step>#<iso>               a next-step decision event
//   TAKE#<take>             CALL#<iso>                      a forecast, locked before the results it predicts
//   PICK#<claim>            <iso>                           a script choice and the reason for it
//   VOTE#<conversation>     <voter>#<statement>             a consensus vote
//   BOOSTED#<reader>        <video id>                      the reader's current Boost state (on, at)
//   BOOSTCOUNT#<video id>   META                            the running Boost count (n), a total of the usage log's boost events
//   FLOW#<email>            <flowId>                        a marketing-flow enrollment, written once (lib/flows/store.ts)
//   FLOWS                   <email>#<flowId>                the same enrollment in the roster the flows tick reads
//   FLOWSEND#<email>        DAY#<date> | <flowId>#<day>[#outcome]  a flow send: the day's claim, the step's claim, its outcome
//   MAIL#<mailbox>          <iso>#<id>                      a kept message as one mailbox holds it (lib/mail/store.ts)
//   MAIL#<agent slug>       WATERMARK                       an agent's AgentMail high-water mark (inbound)
//   MAIL                    <iso>#<rand>                    lib/mail.ts's outbox (Originals' notices), apart

// NYSgpt's ledger (ported with /chat from trinity, 2026-11-03): the table does not exist yet —
// every caller is written to degrade quietly without it (saved chats simply aren't kept). Create
// nysgpt-ledger (pk + sk, on-demand) in us-east-1 and the same code starts keeping them.
const TABLE = process.env.NYSGPT_LEDGER_TABLE ?? "nysgpt-ledger"
const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.NYSGPT_TABLES_REGION ?? "us-east-1" }), { marshallOptions: { removeUndefinedValues: true } })

export type Item = { pk: string; sk: string; [k: string]: unknown }

/** Write once. Returns false when the key already exists (the double-count guard). */
export async function putOnce(item: Item): Promise<boolean> {
  try {
    await client.send(new PutCommand({ TableName: TABLE, Item: item, ConditionExpression: "attribute_not_exists(pk)" }))
    return true
  } catch (e) {
    if ((e as { name?: string }).name === "ConditionalCheckFailedException") return false
    throw e
  }
}

/** Write the current state of a row that is a view, not a decision: a reader's Boost state. The
 *  history stays in the usage log's events; this row only answers "what is it now". */
export async function put(item: Item) {
  await client.send(new PutCommand({ TableName: TABLE, Item: item }))
}

/** Add to a counter row's `n` atomically and return the new total. A counter is a running total of
 *  append-only events, kept so a page reads one row instead of the whole event log. */
export async function add(pk: string, sk: string, by: number): Promise<number> {
  const r = await client.send(new UpdateCommand({ TableName: TABLE, Key: { pk, sk }, UpdateExpression: "ADD #n :d", ExpressionAttributeNames: { "#n": "n" }, ExpressionAttributeValues: { ":d": by }, ReturnValues: "UPDATED_NEW" }))
  return Number(r.Attributes?.n ?? 0)
}

/** The rows for up to 100 keys per call, missing keys skipped. */
export async function getMany<T extends Item>(keys: { pk: string; sk: string }[]): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < keys.length; i += 100) {
    const r = await client.send(new BatchGetCommand({ RequestItems: { [TABLE]: { Keys: keys.slice(i, i + 100) } } }))
    out.push(...((r.Responses?.[TABLE] as T[]) ?? []))
  }
  return out
}

export async function get<T extends Item>(pk: string, sk: string): Promise<T | null> {
  const r = await client.send(new GetCommand({ TableName: TABLE, Key: { pk, sk } }))
  return (r.Item as T) ?? null
}

export async function query<T extends Item>(pk: string, prefix?: string): Promise<T[]> {
  const out: T[] = []
  let start: Record<string, unknown> | undefined
  do {
    const r = await client.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: prefix ? "pk = :pk and begins_with(sk, :p)" : "pk = :pk",
        ExpressionAttributeValues: prefix ? { ":pk": pk, ":p": prefix } : { ":pk": pk },
        ExclusiveStartKey: start,
      }),
    )
    out.push(...((r.Items as T[]) ?? []))
    start = r.LastEvaluatedKey
  } while (start)
  return out
}

/** The one exception to append-only: a user withdrawing their own data (a private or unlisted video they
 *  un-pick, a video that left the channel's public set). Only the channel-ingest Lambda holds DeleteItem. */
export async function remove(pk: string, sk: string) {
  await client.send(new DeleteCommand({ TableName: TABLE, Key: { pk, sk } }))
}

export const now = () => new Date().toISOString()
