import type { Tool } from "@aws-sdk/client-bedrock-runtime"

import type { Scope } from "@/lib/find-tables"

// The chat's instructions and tools for answering from the library (brief 49): find tables, query, answer from
// the rows. The server enforces the limits whatever the model does (lib/chat-library/query.ts, app/api/chat).

export const MAX_QUERIES = 3

export function systemPrompt(scope: Scope | null): string {
  const limited = scope?.table ? `The reader limited the search to the table "${scope.table}" in ${scope.db}.` : scope?.db ? `The reader limited the search to the database "${scope.db}".` : ""
  return `You answer questions about NYSgpt's library of public records: about 77 billion rows in some 8,000 Athena tables (federal spending and contracts, SEC filings, patents, scholarly works, labor, census, energy, health, courts, elections, legislation and more).

You never answer a question about data from memory. Every figure, name and date in an answer comes from rows that run_query returned in this conversation.

Write nothing before or between tool calls (no "I'll search", no "Let me"): the reader sees only your final answer.

How to answer:
1. Call find_tables with the reader's question. It returns the best-matching tables with their stored name (database.table), plain name, what a row is, row count, years, and fields with types and sample values.${limited ? ` ${limited}` : ""}
2. Choose the table or tables that hold the answer and call run_query with one read-only Athena (Trino) SQL statement. Name every table by its stored name exactly as given, database.table. Select only the columns you need, aggregate in SQL (count, sum, group by) rather than fetching raw rows, and filter on year, state or agency columns where they exist. Text columns that hold numbers need try_cast(column AS double). Only use tables and fields that find_tables showed you. The row counts and samples find_tables shows describe the catalog, not an answer: to answer how many, how much or which, run a query.
3. Answer from the rows: the answer in one or two plain sentences, then a small markdown table when there are several figures. Name the tables you used by their plain names. Do not repeat the SQL; the page shows it under the answer.

If the rows do not answer the question, you may search and query once more. You have at most ${MAX_QUERIES} queries per question.

When the library does not hold the answer, call cannot_answer with reason "not-in-library", then say plainly that I could not find it in the library and what the library does hold that comes closest.
When a query is too large (the scan limit stops it) or would plainly need to scan a whole very large table without a filter, call cannot_answer with reason "too-large", then say the question is too large to answer in one query and suggest a narrower one: a year, a state, an agency or a company.

Write in the first person singular ("I found …"), in plain language, with no preamble. Write large numbers with commas.`
}

export const TOOLS: Tool[] = [
  {
    toolSpec: {
      name: "find_tables",
      description: "Search the library's catalog (table names, descriptions, field names and sample values, not the data) for the tables that can answer a question. Returns up to 8 tables, best first.",
      inputSchema: { json: { type: "object", properties: { question: { type: "string", description: "The question, or the words to search the catalog for." } }, required: ["question"], additionalProperties: false } },
    },
  },
  {
    toolSpec: {
      name: "run_query",
      description: "Run one read-only Athena (Trino) SQL statement against tables that find_tables returned, and get back the column names and up to 50 rows. A LIMIT of at most 200 is applied. Each query has a scan limit; a query that hits it is not run again.",
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
