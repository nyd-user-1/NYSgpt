// The knowledge map's snapshot (/viz/knowledge, prototype C, 2026-11-04): what the literature and the evaluations
// hold for each nuclide, as plain counts from the lake (Athena, nysgpt_nsr), written to
// public/viz-data/knowledge.json. Rerun by hand; it uses the local AWS CLI's credentials:
//   node scripts/viz-knowledge-snapshot.mjs
//
// Per (Z, N):
//   papers  NSR papers indexing the nuclide (nsr_nuclides, distinct key numbers)
//   exfor   EXFOR entries linked from those papers (nsr_exfor)
//   levels  levels in the ENSDF Adopted Levels deck (its primary L records); 0 when there is no adopted deck
//   cards   that deck's card count (ensdf_datasets.num_cards)
//   xundl   XUNDL datasets listed for the nuclide (xundl_datasets)
//   cutoff  the ENSDF evaluation's literature cutoff year — the nuclide's own row in ensdf_index, else its mass chain's
//   eval    1 when an Adopted Levels deck exists, 0 when the nuclide is studied but never evaluated
//
// Output — { source, columns, rows }: rows are arrays in the columns' order, to keep the file small.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const ELEMENTS = ["Nn","H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si","P","S","Cl","Ar","K","Ca","Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn","Ga","Ge","As","Se","Br","Kr","Rb","Sr","Y","Zr","Nb","Mo","Tc","Ru","Rh","Pd","Ag","Cd","In","Sn","Sb","Te","I","Xe","Cs","Ba","La","Ce","Pr","Nd","Pm","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu","Hf","Ta","W","Re","Os","Ir","Pt","Au","Hg","Tl","Pb","Bi","Po","At","Rn","Fr","Ra","Ac","Th","Pa","U","Np","Pu","Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr","Rf","Db","Sg","Bh","Hs","Mt","Ds","Rg","Cn","Nh","Fl","Mc","Lv","Ts","Og"];
const zOf = (sym) => ELEMENTS.findIndex((e) => e.toUpperCase() === sym.toUpperCase());
/** "60CO" → { z, n }; "1NN" is the neutron. */
const parseNucid = (id) => {
  const m = /^(\d+)([A-Z]{1,2})$/.exec(String(id).trim().toUpperCase());
  if (!m) return null;
  const z = m[2] === "NN" ? 0 : zOf(m[2]);
  return z < 0 ? null : { z, n: Number(m[1]) - z };
};

// ── Athena ────────────────────────────────────────────────────────────────────────────────────────
const aws = (...args) => execFileSync("aws", [...args, "--region", "us-east-1", "--output", "json"], { encoding: "utf8", maxBuffer: 1 << 30 });
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
async function athena(sql) {
  const qid = JSON.parse(aws("athena", "start-query-execution", "--work-group", "nysgpt-chat", "--query-execution-context", "Database=nysgpt_nsr", "--query-string", sql)).QueryExecutionId;
  for (;;) {
    const exec = JSON.parse(aws("athena", "get-query-execution", "--query-execution-id", qid)).QueryExecution;
    const s = exec.Status.State;
    if (s === "SUCCEEDED") {
      const csv = execFileSync("aws", ["s3", "cp", exec.ResultConfiguration.OutputLocation, "-"], { encoding: "utf8", maxBuffer: 1 << 30 });
      return parseCsv(csv).slice(1);
    }
    if (s === "FAILED" || s === "CANCELLED") throw new Error(`Athena ${s}: ${exec.Status.StateChangeReason}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

const RANGE = "z BETWEEN 0 AND 120 AND n BETWEEN 0 AND 200";
const [papers, exfor, adopted, xundl, index] = await Promise.all([
  athena(`SELECT z, n, count(DISTINCT key_number) FROM nsr_nuclides WHERE ${RANGE} GROUP BY z, n`),
  athena(`SELECT nn.z, nn.n, count(DISTINCT x.exfor_id) FROM nsr_nuclides nn JOIN nsr_exfor x ON x.key_number = nn.key_number WHERE nn.${RANGE.replaceAll(" AND n ", " AND nn.n ")} GROUP BY nn.z, nn.n`),
  athena(`SELECT nucid, cardinality(filter(split(raw, chr(10)), l -> length(l) >= 8 AND substr(l, 6, 1) = ' ' AND substr(l, 7, 1) = ' ' AND substr(l, 8, 1) = 'L')), num_cards FROM ensdf_datasets WHERE dsid LIKE 'ADOPTED LEVELS%'`),
  athena(`SELECT nuclide, count(*) FROM xundl_datasets GROUP BY nuclide`),
  athena(`SELECT row_type, a, element, cutoff FROM ensdf_index WHERE cutoff IS NOT NULL AND cutoff <> ''`),
]);
console.log(`papers ${papers.length} · exfor ${exfor.length} · adopted ${adopted.length} · xundl ${xundl.length} · index ${index.length}`);

const key = (z, n) => z * 1000 + n;
const map = new Map();
const at = (z, n) => {
  const k = key(z, n);
  let r = map.get(k);
  if (!r) map.set(k, (r = { z, n, papers: 0, exfor: 0, levels: 0, cards: 0, xundl: 0, eval: 0 }));
  return r;
};
for (const [z, n, c] of papers) at(Number(z), Number(n)).papers = Number(c);
for (const [z, n, c] of exfor) at(Number(z), Number(n)).exfor = Number(c);
for (const [nucid, levels, cards] of adopted) {
  const p = parseNucid(nucid);
  if (!p) continue;
  const r = at(p.z, p.n);
  r.levels = Number(levels);
  r.cards = Number(cards);
  r.eval = 1;
}
for (const [nuclide, c] of xundl) {
  const p = parseNucid(nuclide);
  if (p) at(p.z, p.n).xundl += Number(c);
}
// Cutoff: the nuclide's own evaluation row, else its mass chain's.
const massCut = new Map();
const nucCut = new Map();
for (const [type, a, el, cutoff] of index) {
  const y = Number(String(cutoff).slice(0, 4));
  if (!y) continue;
  if (type === "MASS") massCut.set(Number(a), y);
  else if (type === "NUCLIDE" && el) {
    const z = el.toUpperCase() === "NN" ? 0 : zOf(el);
    if (z >= 0) nucCut.set(key(z, Number(a) - z), y);
  }
}

const columns = ["z", "n", "papers", "levels", "cards", "exfor", "xundl", "cutoff", "eval"];
const rows = [...map.values()]
  .filter((r) => r.z + r.n > 0)
  .sort((p, q) => p.z - q.z || p.n - q.n)
  .map((r) => {
    const cutoff = r.eval ? (nucCut.get(key(r.z, r.n)) ?? massCut.get(r.z + r.n) ?? 0) : 0;
    return [r.z, r.n, r.papers, r.levels, r.cards, r.exfor, r.xundl, cutoff, r.eval];
  });

const out = { source: "NSR, EXFOR links, ENSDF Adopted Levels, XUNDL, ENSDF evaluation index (nysgpt_nsr), snapshot 2026-11-04", columns, rows };
const json = JSON.stringify(out);
writeFileSync("public/viz-data/knowledge.json", json);
const evaluated = rows.filter((r) => r[8]).length;
const never = rows.filter((r) => !r[8] && r[2] > 0).length;
console.log(`knowledge.json: ${rows.length} nuclides (${evaluated} evaluated, ${never} studied but never evaluated), ${(json.length / 1024).toFixed(0)} KB`);
