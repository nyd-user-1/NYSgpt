// One-off connectivity check for the NSR Neon corpus (run by hand, safe to delete):
//   node --env-file=/Users/brendanstanton/Code/nsr/.env.local scripts/neon-test.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED);
try {
  const r = await sql.query("select count(*)::int n from nsr");
  console.log("nsr rows:", r[0].n);
} catch (e) {
  console.log("FAIL:", e.message);
}
