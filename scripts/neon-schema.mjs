// One-off: print the NSR Neon schema compactly (tables + columns + row estimates), to seed the
// chat's data-tool prompt. Run by hand:
//   node --env-file=/Users/brendanstanton/Code/nsr/.env.local scripts/neon-schema.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED);
const cols = await sql.query(`
  select table_name, column_name, data_type
  from information_schema.columns
  where table_schema = 'public'
  order by table_name, ordinal_position`);
const counts = await sql.query(`
  select relname, reltuples::bigint n from pg_class c
  join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public' and relkind = 'r' order by relname`);
const byTable = {};
for (const c of cols) (byTable[c.table_name] ??= []).push(`${c.column_name} ${c.data_type}`);
const n = Object.fromEntries(counts.map((r) => [r.relname, r.n]));
for (const [t, list] of Object.entries(byTable)) {
  console.log(`\n== ${t} (~${n[t] ?? "?"} rows)`);
  console.log("  " + list.join("; "));
}
