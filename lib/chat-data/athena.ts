import "server-only"

import { AwsClient } from "aws4fetch"

// Athena for the chat's NSR tools (2026-11-04). The corpus lives in the lake as parquet
// (s3://govblock-lake-638175140432/lake/v1/nsr/nsr-to-lake-2026-11-04/), catalogued in Glue as
// nysgpt_nsr. The worker can't load the AWS SDK's node paths and Athena has no bearer-token road,
// so this signs the Athena JSON API with aws4fetch (pure-JS SigV4): StartQueryExecution → poll
// GetQueryExecution → GetQueryResults, first page only.
//
// Credentials: NSR_ATHENA_KEY_ID / NSR_ATHENA_SECRET — an access key on IAM user
// nysgpt-chat-worker, whose nsr-athena-read policy allows the nysgpt-chat workgroup, Glue reads on
// nysgpt_nsr, the NSR prefix of the lake, and the workgroup's results prefix. Nothing else.

const REGION = "us-east-1"
const WORKGROUP = "nysgpt-chat"
const DATABASE = "nysgpt_nsr"

let client: AwsClient | null = null
const aws = () => {
  const accessKeyId = process.env.NSR_ATHENA_KEY_ID
  const secretAccessKey = process.env.NSR_ATHENA_SECRET
  if (!accessKeyId || !secretAccessKey) return null
  client ??= new AwsClient({ accessKeyId, secretAccessKey, region: REGION, service: "athena", retries: 2 })
  return client
}

export const athenaWired = () => !!(process.env.NSR_ATHENA_KEY_ID && process.env.NSR_ATHENA_SECRET)

async function call<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const c = aws()
  if (!c) throw new Error("Athena credentials are not set on this deployment.")
  const res = await c.fetch(`https://athena.${REGION}.amazonaws.com/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": `AmazonAthena.${action}` },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as (T & { message?: string; Message?: string; __type?: string }) | null
  if (!res.ok) throw new Error(`Athena ${action} ${res.status}: ${json?.message ?? json?.Message ?? json?.__type ?? "no detail"}`)
  return json as T
}

type Execution = {
  QueryExecution: {
    Status: { State: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED"; StateChangeReason?: string }
    Statistics?: { DataScannedInBytes?: number; TotalExecutionTimeInMillis?: number }
  }
}
type Results = {
  ResultSet: { Rows: { Data: { VarCharValue?: string }[] }[]; ResultSetMetadata: { ColumnInfo: { Name: string; Type: string }[] } }
  NextToken?: string
}

const NUMERIC = new Set(["tinyint", "smallint", "integer", "int", "bigint", "real", "float", "double", "decimal"])

/** One cell as JSON wants it: numbers and booleans typed, everything else (arrays included) as Athena's text. */
function cell(raw: string | undefined, type: string): unknown {
  if (raw === undefined) return null
  if (NUMERIC.has(type)) {
    const n = Number(raw)
    return Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER ? n : raw
  }
  if (type === "boolean") return raw === "true"
  return raw
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type AthenaRows = { rows: Record<string, unknown>[]; more: boolean; scannedBytes: number; ms: number }

/**
 * Run one SELECT and return its first `maxRows` rows as objects, typed by Athena's column info.
 * `more` is true when Athena holds rows past the page. Stops the query on timeout.
 */
export async function athenaQuery(sql: string, { maxRows = 200, timeoutMs = 45_000 } = {}): Promise<AthenaRows> {
  const { QueryExecutionId: id } = await call<{ QueryExecutionId: string }>("StartQueryExecution", {
    QueryString: sql,
    QueryExecutionContext: { Catalog: "AwsDataCatalog", Database: DATABASE },
    WorkGroup: WORKGROUP,
    ClientRequestToken: crypto.randomUUID(),
  })
  const started = Date.now()
  let wait = 250
  let exec: Execution["QueryExecution"] | undefined
  while (true) {
    await sleep(wait)
    wait = Math.min(1000, Math.round(wait * 1.5))
    exec = (await call<Execution>("GetQueryExecution", { QueryExecutionId: id })).QueryExecution
    const state = exec.Status.State
    if (state === "SUCCEEDED") break
    if (state === "FAILED" || state === "CANCELLED") throw new Error(exec.Status.StateChangeReason ?? `Query ${state.toLowerCase()}.`)
    if (Date.now() - started > timeoutMs) {
      await call("StopQueryExecution", { QueryExecutionId: id }).catch(() => {})
      throw new Error(`The query ran past ${Math.round(timeoutMs / 1000)}s and was stopped — narrow it or aggregate.`)
    }
  }
  // A SELECT's first page leads with the header row, so ask for one more than the cap.
  const page = await call<Results>("GetQueryResults", { QueryExecutionId: id, MaxResults: Math.min(1000, maxRows + 1) })
  const cols = page.ResultSet.ResultSetMetadata.ColumnInfo
  const rows = page.ResultSet.Rows.slice(1).map((r) => Object.fromEntries(cols.map((c, i) => [c.Name, cell(r.Data[i]?.VarCharValue, c.Type)])))
  return {
    rows,
    more: !!page.NextToken,
    scannedBytes: exec?.Statistics?.DataScannedInBytes ?? 0,
    ms: exec?.Statistics?.TotalExecutionTimeInMillis ?? Date.now() - started,
  }
}

/** A string as a Trino literal. */
export const lit = (s: string) => `'${s.replace(/'/g, "''")}'`
