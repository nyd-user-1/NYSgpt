import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

/**
 * Daily caps (2026-10-07), so an account that signs itself up can never cost
 * much: one counter per thing per UTC day in the nysgpt-limits table, bumped
 * atomically, dropped by TTL after two days. On-demand billing, nothing idle.
 */

export const LIMITS = {
  /** Self-serve accounts created per day, site-wide. Invites don't count. */
  signups: 20,
  /** Database knocks per account per day: waking all nine takes about 200, keeping them awake about 135 an hour. */
  wakes: 1000,
};

const ddb = new DynamoDBClient({ region: "us-east-1" });

/** Counts one more against `key` for today and says whether it is still within `limit`. */
export async function within(key: string, limit: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  try {
    const r = await ddb.send(
      new UpdateItemCommand({
        TableName: "nysgpt-limits",
        Key: { pk: { S: `${key}#${day}` } },
        UpdateExpression: "ADD n :one SET #ttl = if_not_exists(#ttl, :ttl)",
        ExpressionAttributeNames: { "#ttl": "ttl" },
        ExpressionAttributeValues: { ":one": { N: "1" }, ":ttl": { N: String(Math.floor(Date.now() / 1000) + 2 * 86_400) } },
        ReturnValues: "UPDATED_NEW",
      })
    );
    return Number(r.Attributes?.n?.N ?? 0) <= limit;
  } catch (e) {
    // A counter that can't be reached refuses rather than waves through.
    console.error("limits:", (e as Error).name);
    return false;
  }
}
