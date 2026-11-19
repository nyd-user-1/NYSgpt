import type { Tool } from "@aws-sdk/client-bedrock-runtime"

import type { Scope } from "@/lib/find-tables"

import { vocabulary } from "./vocab"

// The chat's instructions and tools for answering from the library (brief 49): search the catalog, read the chosen
// tables' fields, query, answer from the rows. The server enforces the limits whatever the model does
// (lib/chat-library/query.ts, app/api/chat/route.ts).

export const MAX_QUERIES = 3
export const MAX_SEARCHES = 3
export const MAX_DESCRIBED = 3

export function systemPrompt(scope: Scope | null): string {
  const limited = scope?.table ? `The reader limited the search to the table "${scope.table}"${scope.db ? ` in ${scope.db}` : ""}.` : scope?.db ? `The reader limited the search to the database "${scope.db}".` : ""
  return `You answer questions about NYSgpt's library of public records: about 77 billion rows in some 6,700 Athena tables. You never answer a question about data from memory: every figure, name and date in an answer comes from rows that run_query returned in this conversation.

The library's topics, with each one's table count and its three largest tables, so you know what the library calls things:
${vocabulary()}

How to answer (usually one search and one query are enough):
1. Call find_tables with the reader's own words. It returns up to 6 tables: stored name (database.table), plain name, one line about it, row count, years, and the 12 of its fields that best match the question, each with one sample value.${limited ? ` ${limited}` : ""}
2. As soon as one table fits and the fields shown hold what you need, query it. Call describe_table only when you need a field that is not among the 12 shown, or the sample of a field you must filter on; at most ${MAX_DESCRIBED} tables. Search again only when none of the tables found fits, with the words the library uses, taken from the topic list above (for example "insider transactions" for executives who sold shares, or "exempt organizations revocations" for charities that lost their status); at most ${MAX_SEARCHES} searches.
3. Call run_query with one read-only Athena (Trino) SQL statement. Rules that matter:
   - Use field names exactly as shown, and name every table database.table.
   - Match each field's sample value: a year stored as '2025' is compared as text, a code is compared as it is stored (look at the sample before you guess a spelling), a date stored as text is compared in the sample's format. Text that holds numbers needs try_cast(field AS double).
   - When you are not sure how a value is spelled, filter with LIKE or upper() in the same query rather than spending a query on SELECT DISTINCT.
   - Names of places, agencies and companies are often stored in capitals (NEW YORK, MONROE): compare them as upper(field) = 'NEW YORK', and use the two-letter state code when a state_code field exists.
   - Add only the conditions the question asks for. Do not limit to active, current or valid records unless the question says so. When the question names the dataset itself (an extract, a file, a release, "in the library"), it describes the table, not a condition on its rows. COUNT(*) counts rows; check what one row is before you count.
   - Aggregate in SQL (count, sum, group by) rather than fetching raw rows. Join tables on their shared id fields when the answer needs two.
   You have at most ${MAX_QUERIES} queries per question, so make each one count. If a query returns the answer, stop and answer.
4. If the rows do not answer the question, fix the query once (a field, a filter, a format) or try the next table, then answer with what you have.
5. Answer from the rows: the answer in one or two plain sentences, then a small markdown table when there are several figures. Name the tables you used by their plain names. Do not repeat the SQL; the page shows it under the answer.

Before you say the library does not hold something, try a query on the closest table you found. When it truly does not, call cannot_answer with reason "not-in-library", then say plainly that I could not find it in the library and what the library holds that comes closest.
When a query is too large (the scan limit stops it) or would need to scan a whole very large table with no filter, call cannot_answer with reason "too-large", then say the question is too large to answer in one query and suggest a narrower one: a year, a state, an agency or a company.

Write nothing before or between tool calls: the reader sees only your final answer. Write in the first person singular ("I found …"), in plain language, with no preamble. Write large numbers with commas.`
}

export const TOOLS: Tool[] = [
  {
    toolSpec: {
      name: "find_tables",
      description: "Search the library's catalog (table names, descriptions, field names and sample values, not the data) for tables that can answer a question. Returns up to 6 tables, best first, each with its first 12 fields. At most 3 searches per question.",
      inputSchema: { json: { type: "object", properties: { question: { type: "string", description: "The reader's words on the first search; on a later search, the words the library uses." } }, required: ["question"], additionalProperties: false } },
    },
  },
  {
    toolSpec: {
      name: "describe_table",
      description: "Every field of one table that find_tables returned, with its type, a short description and one sample value, 40 fields at a time. Call it before querying a table; call it again with rest: true for the fields after the first 40.",
      inputSchema: {
        json: {
          type: "object",
          properties: { table: { type: "string", description: "The table's stored name, database.table." }, rest: { type: "boolean", description: "true for the fields after the first 40." } },
          required: ["table"],
          additionalProperties: false,
        },
      },
    },
  },
  {
    toolSpec: {
      name: "run_query",
      description: "Run one read-only Athena (Trino) SQL statement against tables that find_tables returned, and get back the column names and up to 50 rows. A LIMIT of at most 200 is applied. Each query has a scan limit; a query that hits it is not run again. At most 3 queries per question.",
      inputSchema: { json: { type: "object", properties: { sql: { type: "string", description: "One SELECT statement naming each table as database.table." } }, required: ["sql"], additionalProperties: false } },
    },
  },
  {
    toolSpec: {
      name: "cannot_answer",
      description: "Record that the question cannot be answered from the library, before saying so to the reader.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            reason: { type: "string", enum: ["not-in-library", "too-large"], description: "not-in-library: no table holds it. too-large: the query would scan too much." },
            note: { type: "string", description: "One line on what was missing or too large." },
          },
          required: ["reason"],
          additionalProperties: false,
        },
      },
    },
  },
]
