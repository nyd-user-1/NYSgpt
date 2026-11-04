// One-off: time the correlation-matrix query for /viz/matrix.
//   node --env-file=/Users/brendanstanton/Code/nsr/.env.local scripts/matrix-test.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NSR_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED);

const VARS = ["yr", "cites", "infl", "refs", "authors", "nuclides", "reactions", "subjects", "exfor"];
const pairs = [];
for (let i = 0; i < VARS.length; i++) for (let j = i + 1; j < VARS.length; j++) pairs.push(`corr(${VARS[i]}, ${VARS[j]}) as "${VARS[i]}__${VARS[j]}"`);

const text = `
with f as (
  select s.key_number,
         s.pub_year::float as yr,
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
select ${pairs.join(", ")} from f`;

const t = Date.now();
const rows = await sql.query(text);
console.log(`${Date.now() - t}ms`);
const r = rows[0];
console.log(Object.entries(r).slice(0, 8).map(([k, v]) => `${k}=${Number(v).toFixed(2)}`).join("  "));
console.log("pairs:", Object.keys(r).length);
