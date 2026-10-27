// The OpenAPI spec of a catalog dataset (the one AgentCore Gateway and the
// Marketplace listing read), in the shape of public/openapi/gov.json: listTables
// and queryTable over the tables in aws/api/catalog/<dataset>.json. Gov's spec
// also carries its joins, written by hand; a dataset without joins is all
// catalog, so this writes it whole.
//
//   node scripts/openapi.mjs ai      → public/openapi/ai.json

import { readFileSync, writeFileSync } from "node:fs"

const DATASETS = {
  ai: {
    title: "NYSgpt AI API",
    description: (size) =>
      `Records of AI research, patents, models and policy in ${size}: 1.32 million AI patents from the USPTO's AI Patent Dataset plus 87,047 newer grants awaiting classification, with 11.2 million patent citations, their assignments, assignees and maintenance events; 3.57 million research papers with 21.2 million citation links, their funders and institutions; Hugging Face models and repositories and the papers they cite; benchmark and leaderboard scores; Epoch AI's records of models, chips and data centers; and AI incidents and governance documents. Every response is JSON in the form {data, meta}.`,
  },
}

const dataset = process.argv[2]
const about = DATASETS[dataset]
if (!about) throw new Error(`Usage: node scripts/openapi.mjs <${Object.keys(DATASETS).join("|")}>`)
const catalog = JSON.parse(readFileSync(new URL(`../aws/api/catalog/${dataset}.json`, import.meta.url), "utf8"))
const size = `${catalog.tables.length} tables and ${(catalog.tables.reduce((s, t) => s + t.rows, 0) / 1e6).toFixed(1)} million rows`

const error = (description) => ({
  description,
  content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } },
})
const errors = {
  400: { $ref: "#/components/responses/BadRequest" },
  403: { $ref: "#/components/responses/Forbidden" },
  404: { $ref: "#/components/responses/NotFound" },
  429: { $ref: "#/components/responses/TooMany" },
  503: { $ref: "#/components/responses/Busy" },
  504: { $ref: "#/components/responses/TooSlow" },
}
const rows = (items) => ({
  type: "object",
  properties: { data: { type: "array", items }, meta: { $ref: "#/components/schemas/Meta" } },
})

const spec = {
  openapi: "3.0.3",
  info: { title: about.title, version: "1.0.0", description: about.description(size) },
  servers: [{ url: "https://api.nysgpt.com/v1" }],
  security: [{ apiKey: [] }],
  paths: {
    [`/${dataset}`]: {
      get: {
        operationId: "listTables",
        summary: "List the dataset's tables",
        description: "Every table with its row count, columns and the columns it can be filtered and ordered on. Read this before queryTable.",
        responses: {
          200: { description: "The tables.", content: { "application/json": { schema: rows({ $ref: "#/components/schemas/Table" }) } } },
          ...errors,
        },
      },
    },
    [`/${dataset}/{table}`]: {
      get: {
        operationId: "queryTable",
        summary: "Query any table",
        description:
          "Rows from one table, filtered on its filter columns (see listTables): col=value for equality, col.gte, col.lte, col.gt, col.lt for ranges. A date takes YYYY-MM-DD, a time YYYY-MM-DD HH:MM:SS in UTC, and a list column matches whole, as col={a,b}. order=col ascending or order=-col descending. limit 1 to 100 (default 25) and offset for paging.",
        parameters: [
          {
            name: "table",
            in: "path",
            required: true,
            description: "The table's path, from listTables.",
            schema: { type: "string", enum: catalog.tables.map((t) => t.path).sort() },
          },
          {
            name: "filters",
            in: "query",
            required: false,
            style: "form",
            explode: true,
            description: "Filters as column=value pairs, e.g. doc_type=paper or published_date.gte=2025-01-01.",
            schema: { type: "object", additionalProperties: { type: "string" } },
          },
          { name: "order", in: "query", required: false, description: "A filter column to sort on; prefix with - for descending.", schema: { type: "string" } },
          { name: "limit", in: "query", required: false, description: "Rows to return, 1 to 100. Default 25.", schema: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
          { name: "offset", in: "query", required: false, description: "Rows to skip, for paging.", schema: { type: "integer", minimum: 0, default: 0 } },
        ],
        responses: {
          200: { description: "The rows.", content: { "application/json": { schema: rows({ type: "object", additionalProperties: true }) } } },
          ...errors,
        },
      },
    },
  },
  components: {
    securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "x-api-key" } },
    responses: {
      BadRequest: error("A missing or invalid parameter, or a response over 5 MB (ask for fewer rows)."),
      Forbidden: error("A missing or invalid key, or a key whose plan does not include this table."),
      NotFound: error("No such table or record."),
      TooMany: error("The plan's monthly calls or rate limit is reached."),
      Busy: error("The API is busy; try again in a few seconds."),
      TooSlow: error("The query ran past 24 seconds and was stopped; narrow it with a filter."),
    },
    schemas: {
      Meta: { type: "object", properties: { dataset: { type: "string" }, source: { type: "string" }, count: { type: "integer" }, ms: { type: "integer" } } },
      Table: {
        type: "object",
        properties: {
          path: { type: "string" },
          rows: { type: "integer" },
          columns: { type: "array", items: { type: "array", items: { type: "string" } } },
          filters: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
}

writeFileSync(new URL(`../public/openapi/${dataset}.json`, import.meta.url), JSON.stringify(spec, null, 2))
console.log(`public/openapi/${dataset}.json: ${catalog.tables.length} tables`)
