// data-pages.mjs: writes the static Data Library pages under public/data/ (one per dataset, plus the index).
// Input: the holdings summary and table list built from the catalogue (docs/reports/2026-11-14-data-holdings/data in the main checkout).
// Run: node scripts/data-pages.mjs <path-to-holdings-data-dir> <api-base-url>
import fs from 'node:fs';
import path from 'node:path';
const [SRC, API] = process.argv.slice(2);
if (!SRC || !API) { console.error('usage: node scripts/data-pages.mjs <holdings data dir> <api base url>'); process.exit(1); }
const OUT = path.resolve('public/data'); fs.mkdirSync(OUT, { recursive: true });
const H = JSON.parse(fs.readFileSync(path.join(SRC, 'holdings-summary.json'), 'utf8'));

function csv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...r] = rows; return r.map(x => Object.fromEntries(h.map((k, i) => [k, x[i] ?? ''])));
}
// Not served by the public API: left off the pages.
const DENY_DB = new Set(['govblock_legislative', 'govblock_polls', 'govblock_ads', 'govblock_derived', 'govblock_money', 'govblock_clean', 'govblock_text', 'govblock_insurance']);
const DENY_TB = /^govblock_fec\.(individual_contributions|presidential_map_p|presidential_map_csv)/;
const served = t => t.database.startsWith('govblock_') && !DENY_DB.has(t.database) && !DENY_TB.test(t.database + '.' + t.table) && t.kind !== 'raw' && t.kind !== 'bucket';
const TABLES = csv(fs.readFileSync(path.join(SRC, 'holdings-tables.csv'), 'utf8')).filter(served);
const FIELDS = {};
for (const f of csv(fs.readFileSync(path.join(SRC, 'holdings-fields.csv'), 'utf8'))) (FIELDS[f.database + '.' + f.table] ??= []).push(f);

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = v => Number(v || 0).toLocaleString('en-US');
const short = v => { v = Number(v || 0); const u = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]; for (const [k, s] of u) if (v >= k) return (v / k >= 100 ? Math.round(v / k) : Math.round(v / k * 10) / 10) + s; return String(v); };
const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---- datasets
const SETS = [];
for (const d of H.domains) {
  for (const s of d.datasets) {
    const tabs = TABLES.filter(t => t.domain === d.domain && t.dataset === s.dataset).sort((a, b) => (+b.rows || 0) - (+a.rows || 0));
    if (!tabs.length) continue;
    SETS.push({ subject: d.domain, org: d.organisation, name: s.dataset, publisher: s.publisher, holds: s.holds, years: s.years, tabs,
      rows: tabs.reduce((a, t) => a + (+t.rows || 0), 0), fields: tabs.reduce((a, t) => a + (+t.fields || 0), 0), slug: slug(d.domain + ' ' + s.dataset) });
  }
}
const LEADS = { Health: 'The biomedical literature index, Medicare payments and cost reports, quality ratings, health plans, drug and device safety, clinical trials and local health measures.' };
const SUBJECTS = [...new Set(SETS.map(s => s.subject))].map(name => { const sets = SETS.filter(s => s.subject === name); return { name, sets, rows: sets.reduce((a, s) => a + s.rows, 0), tables: sets.reduce((a, s) => a + s.tabs.length, 0), lead: LEADS[name] || H.domains.find(d => d.domain === name).summary }; }).sort((a, b) => b.rows - a.rows);
const TOTAL = { rows: SETS.reduce((a, s) => a + s.rows, 0), tables: SETS.reduce((a, s) => a + s.tabs.length, 0), fields: SETS.reduce((a, s) => a + s.fields, 0) };

const head = (title, desc, canon) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="https://nysgpt.com/data${canon}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="https://nysgpt.com/data${canon}">
<link rel="icon" href="/favicon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Fraunces:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/data/style.css"></head><body data-api="${esc(API)}"><div class="wrap">
<header class="bar"><a class="home" href="/">NYSgpt</a><span class="sp"></span><a href="/data">Data Library</a><a href="/data#connect">Connect</a><a class="pill" href="/data#pricing">Pricing</a></header>`;
const foot = `<footer><span>NYSgpt Data Library. Public records from federal agencies, grid operators, courts and research publishers.</span><span><a href="/data">All datasets</a> · <a href="/data#pricing">Pricing</a> · <a href="/">NYSgpt.com</a></span></footer></div><script src="/data/app.js" defer></script></body></html>`;
const pricing = `<section class="frame" id="pricing"><div class="lab">Pricing</div><div class="plans">
<div class="plan"><h3>Free</h3><p class="price">$0</p><p>30 queries a day, 1 GB scanned per query. No key, no sign-up.</p><a class="btn ghost" href="/data#connect">Connect</a></div>
<div class="plan"><h3>Day pass</h3><p class="price">$29</p><p>300 queries and 100 GB scanned in 24 hours. One payment.</p><a class="btn" href="${API}/checkout?plan=day">Buy a day pass</a></div>
<div class="plan"><h3>Monthly</h3><p class="price">$149<small>/month</small></p><p>2,000 queries and 200 GB scanned a day. Cancel any time.</p><a class="btn" href="${API}/checkout?plan=month">Subscribe</a></div>
<div class="plan"><h3>Institution</h3><p class="price">$1,500<small>/month</small></p><p>20,000 queries and 1 TB scanned a day, for a lab, department or team.</p><a class="btn" href="${API}/checkout?plan=inst">Subscribe</a></div>
</div><p class="note">Payment is by card through Stripe. The key appears on screen as soon as payment completes.</p></section>`;
const connect = `<section class="frame" id="connect"><div class="lab">Connect</div><div class="conn">
<div><h3>Claude</h3><p>Settings, Connectors, Add custom connector. Paste this address:</p><pre>${API}/mcp</pre></div>
<div><h3>Claude Code</h3><pre>claude mcp add --transport http nysgpt-data ${API}/mcp</pre></div>
<div><h3>HTTP</h3><pre>curl -s ${API}/query -H "content-type: application/json" \\
  -d '{"sql":"SELECT count(*) FROM govblock_awards.usaspending_contracts"}'</pre></div>
</div><p class="note">Any MCP client works. The tools are list_databases, list_tables, describe_table and query (Athena SQL, read-only, up to 1,000 rows a query). With a paid key, add <code>?key=YOUR_KEY</code> to the address or send the header <code>X-Api-Key</code>.</p></section>`;
const runner = (sql, label = 'Run') => `<div class="run"><textarea spellcheck="false">${esc(sql)}</textarea><div class="runbar"><button class="btn" data-run>${label}</button><span class="status"></span></div><div class="result"></div></div>`;

// ---- dataset pages
for (const s of SETS) {
  const big = s.tabs[0]; const full = big.database + '.' + big.table; const ff = FIELDS[full] || [];
  const title = `${s.name}: ${short(s.rows)} records in SQL | NYSgpt Data Library`;
  const desc = `${s.holds} ${n(s.rows)} records in ${n(s.tabs.length)} tables from ${s.publisher}, queryable with SQL or from Claude over MCP. Free to try.`;
  const sib = SETS.filter(x => x.subject === s.subject && x !== s);
  const html = head(title, desc, '/' + s.slug) + `
<section class="mast"><div class="crumb"><a href="/data">Data Library</a> / <a href="/data#${slug(s.subject)}">${esc(s.subject)}</a></div><h1>${esc(s.name)}</h1><p class="lead">${esc(s.holds)}</p>
<div class="cells"><div class="cell"><b>${short(s.rows)}</b><span>Records</span></div><div class="cell"><b>${n(s.tabs.length)}</b><span>Tables</span></div><div class="cell"><b>${n(s.fields)}</b><span>Fields</span></div><div class="cell"><b class="sm">${esc(s.years || 'Current')}</b><span>Years</span></div></div>
<p class="pub">Publisher: ${esc(s.publisher)}</p></section>
<section class="frame"><div class="lab">Try it</div><p class="note">This runs against the full table, free, with no key.</p>${runner(`SELECT * FROM ${full} LIMIT 5`)}</section>
<section class="frame"><div class="lab">Tables</div><div class="list">${s.tabs.slice(0, 400).map(t => `<a class="row" href="#" data-table="${esc(t.database)}.${esc(t.table)}"><span>${esc(t.table)}</span><i>${t.rows ? short(t.rows) : ''}</i></a>`).join('')}</div><div class="fields" id="fields"></div></section>
${ff.length ? `<section class="frame"><div class="lab">Fields in ${esc(big.table)}</div><table class="ft"><thead><tr><th>Field</th><th>Type</th><th>Example</th></tr></thead><tbody>${ff.slice(0, 80).map(f => `<tr><td>${esc(f.field)}</td><td>${esc(f.type)}</td><td>${esc((f.sample_1 || '').slice(0, 60))}</td></tr>`).join('')}</tbody></table>${ff.length > 80 ? `<p class="note">${n(ff.length - 80)} more fields; select the table above to list them all.</p>` : ''}</section>` : ''}
${connect}${pricing}
${sib.length ? `<section class="frame"><div class="lab">More in ${esc(s.subject)}</div><div class="list">${sib.map(x => `<a class="row" href="/data/${x.slug}"><span>${esc(x.name)}</span><i>${short(x.rows)}</i></a>`).join('')}</div></section>` : ''}` + foot;
  fs.writeFileSync(path.join(OUT, s.slug + '.html'), html);
}

// ---- index
const OFFERS = [
  ['The full USAspending database in SQL', 'Every federal contract, grant and loan transaction. No 177 GB restore, no Postgres server.', 'federal-spending-usaspending-database', `SELECT awarding_toptier_agency_name AS agency, count(*) AS awards,\n       round(sum(try_cast(total_obligation AS double))/1e9, 1) AS obligated_billions\nFROM govblock_awards.usaspending_db_rpt_award_search\nWHERE fiscal_year = '2025'\nGROUP BY 1 ORDER BY 3 DESC LIMIT 10`],
  ['OpenAlex in SQL', '465 million scholarly works with authors, institutions, funders and topics.', 'scholarly-works-openalex', `SELECT publication_year, count(*) AS works\nFROM govblock_scholarly.openalex_works\nWHERE publication_year BETWEEN 2015 AND 2025\nGROUP BY 1 ORDER BY 1`],
  ['Every U.S. patent in SQL', 'Grants from 1976, applications from 2001, claims, citations, assignments and examination history.', 'patents-patentsview-granted-patents', null],
  ['Jobs by census block', 'Home-to-work flows and job counts for every census block, 2002 to 2024.', 'labor-jobs-by-census-block-lehd', null],
];
const offers = OFFERS.filter(o => SETS.some(s => s.slug === o[2]));
const idx = head(`NYSgpt Data Library: ${short(TOTAL.rows)} public records in SQL and MCP`, `${short(TOTAL.rows)} public records in ${n(TOTAL.tables)} tables: federal spending, patents, company filings, scholarly works, labor, census, energy, health and courts. Query with SQL or from Claude. Free to try.`, '') + `
<section class="mast"><h1>Data Library</h1><p class="lead">${short(TOTAL.rows)} public records from federal agencies, grid operators, courts and research publishers, already loaded as SQL tables. Query them from Claude or over HTTP. Free to try, no sign-up.</p>
<div class="cells"><div class="cell"><b>${short(TOTAL.rows)}</b><span>Records</span></div><div class="cell"><b>${short(TOTAL.tables)}</b><span>Tables</span></div><div class="cell"><b>${short(TOTAL.fields)}</b><span>Fields</span></div><div class="cell"><b>${SUBJECTS.length}</b><span>Subjects</span></div></div></section>
<section class="offers">${offers.map(o => `<a class="offer" href="/data/${o[2]}"><h3>${esc(o[0])}</h3><p>${esc(o[1])}</p><span>${short(SETS.find(s => s.slug === o[2]).rows)} records</span></a>`).join('')}</section>
<section class="frame"><div class="lab">Try it</div><p class="note">Edit the SQL and run it. Free, no key.</p>${runner(offers.find(o => o[3])?.[3] || 'SELECT 1')}</section>
${connect}${pricing}
<section class="frame"><div class="lab">Datasets</div>${SUBJECTS.map(sub => `<div class="subj" id="${slug(sub.name)}"><h2>${esc(sub.name)}<i>${short(sub.rows)}</i></h2><p class="note">${esc(sub.lead)}</p><div class="list">${sub.sets.sort((a, b) => b.rows - a.rows).map(x => `<a class="row" href="/data/${x.slug}"><span>${esc(x.name)}</span><i>${short(x.rows)}</i></a>`).join('')}</div></div>`).join('')}</section>` + foot;
fs.writeFileSync(path.join(OUT, 'index.html'), idx);

// ---- sitemap and machine-readable list
const urls = ['', ...SETS.map(s => '/' + s.slug)];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>https://nysgpt.com/data${u}</loc></url>`).join('')}</urlset>`);
fs.writeFileSync(path.join(OUT, 'datasets.json'), JSON.stringify({ api: API, mcp: API + '/mcp', totals: TOTAL, datasets: SETS.map(s => ({ subject: s.subject, dataset: s.name, publisher: s.publisher, description: s.holds, records: s.rows, tables: s.tabs.length, page: 'https://nysgpt.com/data/' + s.slug, largest_table: s.tabs[0].database + '.' + s.tabs[0].table })) }, null, 1));
console.log(`pages ${SETS.length + 1} | subjects ${SUBJECTS.length} | rows ${TOTAL.rows} | tables ${TOTAL.tables} | fields ${TOTAL.fields}`);
console.log(OFFERS.map(o => o[2] + ':' + SETS.some(s => s.slug === o[2])).join(' '));
