// One-off: the /api/nsr/nuclide-field query, run by hand against Neon:
//   node --env-file=/Users/brendanstanton/Code/nsr/.env.local scripts/nuclide-field-test.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NSR_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED);
const rows = await sql.query(
  `select n, z, count(*)::int c from nsr_nuclides where z between 0 and 118 and n between 0 and 200 group by n, z`,
);
const max = rows.reduce((m, r) => Math.max(m, r.c), 0);
console.log("points:", rows.length, "max papers on one nuclide:", max);
console.log("sample:", rows.slice(0, 3));
