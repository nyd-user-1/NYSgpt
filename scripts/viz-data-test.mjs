// One-off: time every /viz query against Neon before the pages ship.
//   node --env-file=/Users/brendanstanton/Code/nsr/.env.local scripts/viz-data-test.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NSR_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED);
const time = async (name, text) => {
  const t = Date.now();
  try {
    const rows = await sql.query(text);
    console.log(`${name.padEnd(14)} ${String(rows.length).padStart(6)} rows  ${Date.now() - t}ms`);
    return rows;
  } catch (e) {
    console.log(`${name.padEnd(14)} FAIL ${e.message.slice(0, 120)}`);
  }
};

await time("field", `select n, z, count(*)::int c from nsr_nuclides where z between 0 and 118 and n between 0 and 200 group by n, z`);
await time("bars", `select a, element_symbol sym, count(*)::int c from nsr_nuclides where z between 1 and 118 and a between 1 and 320 and element_symbol is not null group by a, element_symbol order by c desc`);
await time("perYear", `select s.pub_year y, count(distinct s.key_number)::int papers, count(distinct (nn.z, nn.n))::int nuclides from nsr s join nsr_nuclides nn on nn.key_number = s.key_number where s.pub_year between 1900 and 2026 group by s.pub_year order by s.pub_year`);
await time("scatter", `select pub_year y, citation_count c, is_nsr nsr from nsr where citation_count > 0 and pub_year between 1950 and 2026 order by random() limit 12000`);
await time("triples", `select pub_year y, reference_count refs, citation_count cites, is_nsr nsr from nsr where citation_count > 0 and reference_count > 0 and pub_year between 1950 and 2026 order by random() limit 10000`);
await time("flows", `select nn.n, nn.z, rd.delta_n dn, rd.delta_z dz, count(*)::int w from nsr_reactions nr join reaction_dict rd on rd.reaction_code = nr.reaction_code join nsr_nuclides nn on nn.key_number = nr.key_number where rd.delta_n is not null and rd.delta_z is not null and not (rd.delta_n = 0 and rd.delta_z = 0) and abs(rd.delta_n) <= 12 and abs(rd.delta_z) <= 12 and nn.z between 1 and 110 and nn.n between 0 and 170 group by nn.n, nn.z, rd.delta_n, rd.delta_z order by w desc limit 20000`);
await time("graphNodes", `select a.author_key id, trim(coalesce(a.initial1 || '.', '') || coalesce(a.initial2 || '.', '') || ' ' || a.last_name) name, x.c from (select author_key, count(*)::int c from nsr_authors group by author_key order by c desc limit 1200) x join authors a on a.author_key = x.author_key`);
await time("graphEdges", `with top as (select author_key from nsr_authors group by author_key order by count(*) desc limit 1200) select a1.author_key s, a2.author_key t, count(*)::int w from nsr_authors a1 join nsr_authors a2 on a2.key_number = a1.key_number and a2.author_key > a1.author_key where a1.author_key in (select author_key from top) and a2.author_key in (select author_key from top) group by a1.author_key, a2.author_key having count(*) >= 3`);
