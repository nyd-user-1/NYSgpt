// The /viz dataset snapshot (2026-11-04): the corpus is frozen (no harvest since 2026-08-21), so
// every chart's query runs ONCE here and lands as JSON in data/viz/ — the pages import the files
// and prerender; no database at request time. Rerun by hand when the corpus ever moves:
//   node --env-file=/Users/brendanstanton/Code/nsr/.env.local scripts/viz-snapshot.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NSR_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED);
mkdirSync("data/viz", { recursive: true });
const save = (name, rows) => {
  writeFileSync(`data/viz/${name}.json`, JSON.stringify(rows));
  console.log(`${name}.json`, Array.isArray(rows) ? rows.length : Object.keys(rows).join("+"));
};

save("field", await sql.query(`select n, z, count(*)::int c from nsr_nuclides where z between 0 and 118 and n between 0 and 200 group by n, z`));
save("bars", await sql.query(`select a, element_symbol sym, count(*)::int c from nsr_nuclides where z between 1 and 118 and a between 1 and 320 and element_symbol is not null group by a, element_symbol order by c desc`));
save("per-year", {
  papers: await sql.query(`select pub_year y, count(*)::int c from nsr where pub_year between 1900 and 2026 group by pub_year order by pub_year`),
  exfor: await sql.query(`select s.pub_year y, count(distinct s.key_number)::int c from nsr s join nsr_exfor x on x.key_number = s.key_number where s.pub_year between 1900 and 2026 group by s.pub_year order by s.pub_year`),
});
save("scatter", await sql.query(`select pub_year y, citation_count c, is_nsr nsr from nsr where citation_count > 0 and pub_year between 1950 and 2026 order by random() limit 12000`));
save("triples", await sql.query(`select pub_year y, reference_count refs, citation_count cites, is_nsr nsr from nsr where citation_count > 0 and reference_count > 0 and pub_year between 1950 and 2026 order by random() limit 10000`));
save("flows", await sql.query(`select nn.n, nn.z, rd.delta_n dn, rd.delta_z dz, count(*)::int w from nsr_reactions nr join reaction_dict rd on rd.reaction_code = nr.reaction_code join nsr_nuclides nn on nn.key_number = nr.key_number where rd.delta_n is not null and rd.delta_z is not null and not (rd.delta_n = 0 and rd.delta_z = 0) and abs(rd.delta_n) <= 12 and abs(rd.delta_z) <= 12 and nn.z between 1 and 110 and nn.n between 0 and 170 group by nn.n, nn.z, rd.delta_n, rd.delta_z order by w desc limit 20000`));
save("graph", {
  nodes: await sql.query(`select a.author_key id, trim(coalesce(a.initial1 || '.', '') || coalesce(a.initial2 || '.', '') || ' ' || a.last_name) name, x.c from (select author_key, count(*)::int c from nsr_authors group by author_key order by c desc limit 1200) x join authors a on a.author_key = x.author_key`),
  edges: await sql.query(`with top as (select author_key from nsr_authors group by author_key order by count(*) desc limit 1200) select a1.author_key s, a2.author_key t, count(*)::int w from nsr_authors a1 join nsr_authors a2 on a2.key_number = a1.key_number and a2.author_key > a1.author_key where a1.author_key in (select author_key from top) and a2.author_key in (select author_key from top) group by a1.author_key, a2.author_key having count(*) >= 4`),
});

const VARS = ["yr", "cites", "infl", "refs", "authors", "nuclides", "reactions", "subjects", "exfor"];
const pairs = [];
for (let i = 0; i < VARS.length; i++) for (let j = i + 1; j < VARS.length; j++) pairs.push(`corr(${VARS[i]}, ${VARS[j]}) as "${VARS[i]}__${VARS[j]}"`);
const mrows = await sql.query(`
with f as (
  select s.pub_year::float as yr,
         coalesce(s.citation_count, 0)::float cites,
         coalesce(s.influential_citation_count, 0)::float infl,
         coalesce(s.reference_count, 0)::float refs,
         coalesce(a.c, 0)::float authors,
         coalesce(nn.c, 0)::float nuclides,
         coalesce(r.c, 0)::float reactions,
         coalesce(sub.c, 0)::float subjects,
         (x.key_number is not null)::int::float exfor
  from nsr s
  left join (select key_number, count(*) c from nsr_authors group by 1) a using (key_number)
  left join (select key_number, count(*) c from nsr_nuclides group by 1) nn using (key_number)
  left join (select key_number, count(*) c from nsr_reactions group by 1) r using (key_number)
  left join (select key_number, count(*) c from nsr_subjects group by 1) sub using (key_number)
  left join (select distinct key_number from nsr_exfor) x using (key_number)
  where s.pub_year between 1900 and 2026
)
select ${pairs.join(", ")} from f`);
const row = mrows[0] ?? {};
const cells = VARS.map((_, i) => [i, i, 1]);
for (let i = 0; i < VARS.length; i++)
  for (let j = i + 1; j < VARS.length; j++) {
    const v = Number(row[`${VARS[i]}__${VARS[j]}`] ?? 0);
    cells.push([i, j, +v.toFixed(4)], [j, i, +v.toFixed(4)]);
  }
save("matrix", { vars: VARS, cells });
console.log("snapshot complete");
