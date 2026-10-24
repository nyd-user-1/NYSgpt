import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The Legislative API's reference pages (2026-10-24): the data dictionary and
 * the coverage matrix AWS Marketplace asked a URL for. Both read files the API
 * already ships: public/catalog/gov.json (every table, its columns, filters and
 * a sample row) and public/catalog/gov-coverage.json (per-jurisdiction counts,
 * taken from the govblock cluster on the date it carries).
 */

export type Column = { name: string; type: string; filter: boolean; example: string };
export type Table = { path: string; rows: number; columns: Column[] };
export type Group = { name: string; slug: string; tables: Table[]; rows: number };

type CatalogTable = { path: string; rows: number; columns: [string, string][]; filters: string[]; sample?: Record<string, unknown> };

const read = <T,>(file: string): T => JSON.parse(readFileSync(join(process.cwd(), "public", "catalog", file), "utf8"));

const GROUPS: [string, RegExp][] = [
  ["Laws", /^(laws|bill-laws|xml-library)$/],
  ["Congress", /^congress-/],
  ["Open States", /^openstates-/],
  ["Lobbying", /lobby/],
  ["Campaign finance", /^(fec-|finance)/],
  ["Elections", /^(election|member-elections|top-two|chamber-results|rcv-)/],
  ["Budgets and spending", /^(budget-|ny-budget|discretionary|revenue|school-funding|contracts)/],
];
const DEFAULT_GROUP = "Bills, votes and members";
const ORDER = [DEFAULT_GROUP, ...GROUPS.map(([g]) => g)];

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const example = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 48 ? `${s.slice(0, 47)}…` : s;
};

export function dictionary(): { groups: Group[]; tables: number; rows: number } {
  const catalog = read<{ tables: CatalogTable[] }>("gov.json");
  const byGroup = new Map<string, Table[]>();
  for (const t of catalog.tables) {
    const group = GROUPS.find(([, re]) => re.test(t.path))?.[0] ?? DEFAULT_GROUP;
    const table: Table = {
      path: t.path,
      rows: t.rows,
      columns: t.columns.map(([name, type]) => ({ name, type, filter: t.filters.includes(name), example: example(t.sample?.[name]) })),
    };
    byGroup.set(group, [...(byGroup.get(group) ?? []), table]);
  }
  const groups = ORDER.filter((g) => byGroup.has(g)).map((name) => {
    const tables = byGroup.get(name)!.sort((a, b) => b.rows - a.rows);
    return { name, slug: slugOf(name), tables, rows: tables.reduce((s, t) => s + t.rows, 0) };
  });
  return { groups, tables: catalog.tables.length, rows: catalog.tables.reduce((s, t) => s + t.rows, 0) };
}

export type Jurisdiction = {
  state: string;
  name: string;
  bills: number;
  from: number | null;
  to: number | null;
  texts: number;
  sponsors: number;
  rollCalls: number;
  votes: number;
  laws: number;
};

const NAMES: Record<string, string> = {
  US: "Congress", AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii",
  ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export function coverage(): { counted: string; jurisdictions: Jurisdiction[] } {
  const c = read<{ counted: string; jurisdictions: Omit<Jurisdiction, "name">[] }>("gov-coverage.json");
  const jurisdictions = c.jurisdictions
    .map((j) => ({ ...j, name: NAMES[j.state] ?? j.state }))
    .sort((a, b) => (a.state === "US" ? -1 : b.state === "US" ? 1 : a.name.localeCompare(b.name)));
  return { counted: c.counted, jurisdictions };
}
