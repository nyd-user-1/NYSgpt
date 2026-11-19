// scripts/names-index.mjs (brief 55, nysgpt-1): the names index /search reads through lib/find-names.ts.
// People, organisations and places named inside the records, each pointing to the tables it appears in, with the
// column and value to filter on. Written as small shards (public/names/<two letters>.json), so a keystroke loads one.
//
// Sources, saved under ~/Downloads/NYSgpt-catalog-2026-11-12/names-extracts/ (nothing is fetched or queried twice):
//   congress-legislators (unitedstates/congress-legislators, CC0): every member of Congress, official names, nicknames,
//     terms and FEC ids; legislators-current.json and legislators-historical.json
//   carltonnorthern/nicknames (Apache License 2.0, commit ed160b3): English given-name nicknames, applied to people only
//   fec_candidates.csv: govblock_fec.candidates, name columns only (scripts/names-extract.mjs)
// Only people in a public role: members of Congress and federal candidates. No donors, clinicians, inventors,
// addresses or contact fields.
// Run: node scripts/names-index.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = process.env.NAMES_EXTRACTS || path.join(process.env.HOME, 'Downloads/NYSgpt-catalog-2026-11-12/names-extracts');
const OUT = path.join(ROOT, 'public/names');
const NICK_SHA = 'ed160b3af2d17e1af8ebd570f10a10e4dade4ff4';
fs.mkdirSync(SRC, { recursive: true });

async function source(file, url) {
  const f = path.join(SRC, file);
  if (!fs.existsSync(f)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  }
  return fs.readFileSync(f, 'utf8');
}
const csv = (t) => { const rows = []; let r = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c; } if (f || r.length) { r.push(f); rows.push(r); } return rows; };

const STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam', VI: 'Virgin Islands', AS: 'American Samoa', MP: 'Northern Mariana Islands', DK: 'Dakota Territory', OL: 'Orleans Territory', PI: 'Philippines' };
const PARTY = { DEM: 'Democratic', REP: 'Republican', IND: 'Independent', LIB: 'Libertarian', GRE: 'Green', CON: 'Constitution', NNE: 'No party', UNK: 'Unknown party', OTH: 'Other party', NPA: 'No party', DFL: 'Democratic-Farmer-Labor', W: 'Write-in' };
const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const title = (s) => String(s || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bMc([a-z])/g, (m, c) => 'Mc' + c.toUpperCase()).replace(/\b(Ii|Iii|Iv)\b/g, (m) => m.toUpperCase());

// nicknames: name -> every other name in its group (Charles <-> Chuck, Charlie, Chas ...)
const nickRows = csv(await source('nicknames.csv', `https://raw.githubusercontent.com/carltonnorthern/nicknames/${NICK_SHA}/names.csv`)).slice(1);
const NICK = new Map();
const link = (a, b) => { if (!NICK.has(a)) NICK.set(a, new Set()); NICK.get(a).add(b); };
for (const [a, rel, b] of nickRows) if (a && b && rel === 'has_nickname') { link(a, b); link(b, a); }
const nicksOf = (first) => [...(NICK.get(norm(first)) || [])].slice(0, 12);

// kinds: [label, colour, people (the nickname list applies)]
const KINDS = {
  congress: ['Member of Congress', '#1d4ed8', 1], legislator: ['State legislator', '#0e7490', 1], candidate: ['Federal candidate', '#b42318', 1], judge: ['Judge', '#6d28d9', 1],
  agency: ['Federal agency or office', '#033882', 0], committee: ['Political committee', '#be123c', 0], contractor: ['Federal award recipient', '#047857', 0], company: ['Public company or fund', '#15803d', 0],
  court: ['Court', '#7c3aed', 0], place: ['Place', '#0891b2', 0], plant: ['Power plant', '#b45309', 0], utility: ['Utility', '#ca8a04', 0], college: ['College or university', '#2563eb', 0],
  district: ['School district', '#0284c7', 0], hospital: ['Hospital', '#be185d', 0], nonprofit: ['Nonprofit', '#65a30d', 0], assignee: ['Patent owner', '#ea580c', 0], reactor: ['Nuclear reactor', '#475569', 0],
};
const entries = [];
const add = (e) => entries.push(e);

// members of Congress
const leg = [...JSON.parse(await source('legislators-current.json', 'https://unitedstates.github.io/congress-legislators/legislators-current.json')).map((x) => ({ ...x, current: true })), ...JSON.parse(await source('legislators-historical.json', 'https://unitedstates.github.io/congress-legislators/legislators-historical.json'))];
const fecRows = csv(fs.readFileSync(path.join(SRC, 'fec_candidates.csv'), 'utf8')); const fh = fecRows.shift();
const FEC = new Map(fecRows.filter((r) => r.length > 2).map((r) => [r[0], Object.fromEntries(fh.map((h, i) => [h, r[i]]))]));
const seenFec = new Set();
const office = (t) => (t.type === 'sen' ? 'U.S. Senator' : t.type === 'rep' ? (['DC', 'PR', 'GU', 'VI', 'AS', 'MP'].includes(t.state) ? 'Delegate to the U.S. House' : 'U.S. Representative') : t.type);
for (const m of leg) {
  const n = m.name || {}, terms = m.terms || [];
  if (!terms.length) continue;
  const last = terms[terms.length - 1];
  const label = n.official_full || [n.first, n.middle, n.last, n.suffix].filter(Boolean).join(' ');
  // the latest office held, from the first term of the unbroken run of that office in that state
  let i = terms.length - 1;
  while (i > 0 && terms[i - 1].type === last.type && terms[i - 1].state === last.state) i--;
  const from = terms[i].start.slice(0, 4), to = m.current ? 'present' : last.end.slice(0, 4);
  const earlier = i > 0 ? `; earlier ${office(terms[i - 1])}, ${STATES[terms[i - 1].state] || terms[i - 1].state}` : '';
  const qualifier = `${office(last)}, ${STATES[last.state] || last.state}${last.type === 'rep' && last.district > 0 ? ` district ${last.district}` : ''}, ${last.party || 'no party recorded'}, ${from} to ${to}${earlier}`;
  const firsts = [n.first, n.nickname].filter(Boolean);
  const forms = [...new Set([n.nickname && `${n.nickname} ${n.last}`, `${n.first} ${n.last}`, n.official_full, `${n.last}, ${n.first}`].filter(Boolean))].filter((f) => f !== label);
  const links = [];
  // the FEC id for the office held last comes first (S for the Senate, H for the House)
  const ids = [...(m.id?.fec || [])].sort((x, y) => Number(y[0] === (last.type === 'sen' ? 'S' : 'H')) - Number(x[0] === (last.type === 'sen' ? 'S' : 'H')));
  for (const id of ids) if (FEC.has(id)) { links.push(['govblock_fec.candidates', 'cand_id', id]); seenFec.add(id); }
  if (m.id?.bioguide) links.push(['govblock_legislative.congress_bill_status', 'sponsor_bioguide_id', m.id.bioguide, 0]);
  const words = [norm(label), norm(n.last), ...firsts.map(norm), norm(n.middle), norm(n.suffix)].join(' ');
  const quals = [last.type === 'sen' ? 'senator sen senate' : 'representative rep congressman congresswoman house', 'congress member', norm(STATES[last.state] || ''), norm(last.state), norm(last.party)].join(' ');
  add({ id: `congress:${m.id?.bioguide || label}`, label, kind: 'congress', qualifier, forms, links, words, quals, rank: m.current ? 100 : 15 + ((Number(to) || 1789) - 1789) / 24 });
}

// federal candidates (FEC) not already a member of Congress above
const OFFICE = { S: 'U.S. Senate', H: 'U.S. House', P: 'President' };
for (const [id, c] of FEC) {
  if (seenFec.has(id) || !c.cand_name) continue;
  const [lastPart, rest = ''] = c.cand_name.split(',');
  const label = title(`${rest.trim()} ${lastPart.trim()}`.replace(/\s+/g, ' '));
  const firstName = rest.trim().split(/\s+/)[0] || '';
  const span = c.first_cycle === c.last_cycle ? c.last_cycle : `${c.first_cycle} to ${c.last_cycle}`;
  const where = c.office === 'P' ? '' : `, ${STATES[c.st] || c.st}${c.office === 'H' && Number(c.district) > 0 ? ` district ${Number(c.district)}` : ''}`;
  const qualifier = `Candidate for ${OFFICE[c.office] || 'federal office'}${where}, ${PARTY[c.party] || c.party || 'party not recorded'}, ${span}`;
  const words = norm(label);
  const quals = ['candidate', c.office === 'S' ? 'senate' : c.office === 'H' ? 'house' : 'president', norm(STATES[c.st] || ''), norm(c.st), norm(PARTY[c.party] || '')].join(' ');
  add({ id: `candidate:${id}`, label, kind: 'candidate', qualifier, forms: [title(c.cand_name)], links: [['govblock_fec.candidates', 'cand_id', id]], words, quals, rank: 10 + Number(c.last_cycle || 0) / 1000 });
}

// every other kind, one extract each (scripts/names-extracts.sh)
const read = (f) => { const p = path.join(SRC, `${f}.csv`); if (!fs.existsSync(p)) return []; const rows = csv(fs.readFileSync(p, 'utf8')); const h = rows.shift(); return rows.filter((r) => r.length >= h.length).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
const lg = (v) => Math.log10(Math.max(1, Number(v) || 1));
const money = (v) => { const n = Number(v) || 0; return n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`; };
const ST = (s) => STATES[String(s || '').toUpperCase()] || s || '';
const PARTY1 = { D: 'Democrat', R: 'Republican', I: 'Independent', L: 'Libertarian', G: 'Green' };

// state legislators (public role: elected members), linked by name in the members table
for (const r of read('state_legislators')) {
  const st = r.state_file.slice(0, 2).toUpperCase();
  const dist = String(r.district || '').replace(/^0+/, '');
  add({ label: r.name, kind: 'legislator', qualifier: `State ${String(r.chamber || '').toLowerCase() === 'senate' ? 'senator' : 'representative'}, ${ST(st)}${dist ? ` district ${dist}` : ''}${r.party ? `, ${PARTY1[r.party] || r.party}` : ''}`, links: [['govblock_geo.legislature_members', 'name', r.name]], rank: 22 });
}
// judges (CourtListener's people database), with the court of their latest position where it names one
const COURT = new Map(read('courts').map((c) => [c.id, c.full_name]));
for (const j of read('judges')) {
  const label = [j.name_first, j.name_middle, j.name_last, j.name_suffix].filter(Boolean).join(' ');
  if (!label.trim()) continue;
  const court = COURT.get(j.court);
  const yrs = j.y0 ? `, ${j.y0}${j.y1 && j.y1 !== j.y0 ? ` to ${j.y1}` : ''}` : '';
  add({ label, kind: 'judge', qualifier: `Judge${court ? `, ${court}` : ''}${yrs}`, links: [['govblock_courts.people_db_people', 'id', j.id], ['govblock_courts.people_db_positions', 'person_id', j.id]], rank: 25 });
}
for (const c of read('courts')) add({ label: c.full_name, kind: 'court', qualifier: `Court${c.end_date ? `, closed ${String(c.end_date).slice(0, 4)}` : ''}`, forms: c.short_name && c.short_name !== c.full_name ? [c.short_name] : [], links: [['govblock_courts.courts', 'id', c.id]], rank: 30 });
// political committees (FEC), active in or after the 2010 cycle
const CMTE = { H: 'House campaign committee', S: 'Senate campaign committee', P: 'Presidential campaign committee', Q: 'PAC', N: 'PAC', O: 'Super PAC', U: 'Single-candidate independent expenditure committee', V: 'Hybrid PAC', W: 'Hybrid PAC', X: 'Party committee', Y: 'Party committee', Z: 'National party nonfederal account', I: 'Independent expenditure filer', E: 'Electioneering communication filer', C: 'Communication cost filer', D: 'Delegate committee' };
for (const c of read('fec_committees')) {
  if (Number(c.last_cycle) < 2010) continue;
  add({ label: title(c.name), kind: 'committee', qualifier: `${CMTE[c.tp] || 'Political committee'}${c.st ? `, ${ST(c.st)}` : ''}${c.org && !/^none$/i.test(c.org.trim()) ? `, connected to ${title(c.org)}` : ''}, ${c.first_cycle === c.last_cycle ? c.last_cycle : `${c.first_cycle} to ${c.last_cycle}`}`, links: [['govblock_fec.committees', 'cmte_id', c.cmte_id]], rank: 12 + Number(c.last_cycle) / 1000 });
}
// federal agencies, sub-agencies and offices
for (const a of read('agencies')) add({ label: title(a.name), kind: 'agency', qualifier: a.path ? title(a.path.split(' > ').slice(0, -1).join(' > ')) || 'Federal department' : 'Federal organisation', forms: a.short_name ? [a.short_name] : [], links: [['govblock_awards.sam_federal_hierarchy', 'organization_id', a.organization_id]], rank: 35 + (Number(a.level) === 1 ? 10 : 0) });
// federal award recipients: the 50,000 largest by the last 12 months' obligations, and every New York one
for (const r of read('recipients')) add({ label: title(r.name), kind: 'contractor', qualifier: `Federal award recipient${r.city || r.state ? `, ${[title(r.city), r.state].filter(Boolean).join(', ')}` : ''}${Number(r.amt) > 0 ? `, ${money(r.amt)} in the last 12 months` : ''}`, links: [['govblock_awards.usaspending_contracts', 'recipient_uei', r.uei], ['govblock_awards.usaspending_db_rpt_recipient_profile', 'uei', r.uei]], rank: 18 + lg(r.amt) });
// public companies and funds with a ticker
for (const c of read('sec_companies')) {
  const tick = (() => { try { return JSON.parse(c.tickers); } catch { return []; } })();
  add({ label: c.name, kind: 'company', qualifier: `SEC filer${tick.length ? ` (${tick.slice(0, 3).join(', ')})` : ''}${c.sicdescription ? `, ${c.sicdescription}` : ''}`, forms: tick, links: [['govblock_sec.submissions_companies', 'cik', c.cik]], rank: 32 });
}
// places: states, counties, cities over 10,000, ZIP code areas
for (const [code, name] of Object.entries(STATES).filter(([c]) => c.length === 2 && !['DK', 'OL', 'PI'].includes(c))) add({ label: name, kind: 'place', qualifier: 'State', forms: [code], links: [['govblock_census.gazetteer_gaz_counties', 'usps', code]], rank: 90 });
for (const c of read('counties')) add({ label: `${c.name}, ${ST(c.usps)}`, kind: 'place', qualifier: 'County', links: [['govblock_census.gazetteer_gaz_counties', 'geoid', c.geoid]], rank: 45 });
for (const c of read('cities')) add({ label: `${c.name.replace(/ (city|town|village|borough|municipality|CDP)$/i, '')}, ${c.stname}`, kind: 'place', qualifier: `City, population ${Number(c.pop).toLocaleString('en-US')} (2025 estimate)`, links: [['govblock_census.popest_sub_est', 'name', c.name]], rank: 40 + lg(c.pop) });
for (const z of read('zctas')) add({ label: `ZIP ${z.geoid}`, kind: 'place', qualifier: 'ZIP code area', forms: [z.geoid], links: [['govblock_census.gazetteer_gaz_zcta', 'geoid', z.geoid]], rank: 20 });
// power plants and utilities
for (const p of read('plants')) add({ label: p.name, kind: 'plant', qualifier: `Power plant, ${[p.county && `${p.county} County`, ST(p.state)].filter(Boolean).join(', ')}${p.utility ? `, ${p.utility}` : ''}`, links: [['govblock_energy.eia860_plant_y_sheet_plant', 'plant_code', p.plant_code]], rank: 15 });
for (const u of read('utilities')) add({ label: u.name, kind: 'utility', qualifier: `Utility, ${ST(u.state)}`, links: [['govblock_energy.eia860_utility_y_sheet_utility', 'utility_id', u.utility_id]], rank: 18 });
// colleges and school districts
for (const c of read('colleges')) add({ label: c.name, kind: 'college', qualifier: `College or university, ${[c.city, ST(c.st)].filter(Boolean).join(', ')}`, links: [['govblock_education.ipeds_hd', 'unitid', c.unitid]], rank: 25 });
for (const d of read('districts')) add({ label: title(d.name), kind: 'district', qualifier: `School district, ${[title(d.city), ST(d.st)].filter(Boolean).join(', ')}`, links: [['govblock_education.ccd_lea_029', 'leaid', d.leaid]], rank: 15 });
// hospitals (organisations only)
for (const h of read('hospitals')) add({ label: title(h.name), kind: 'hospital', qualifier: `${h.type || 'Hospital'}, ${[title(h.city), h.state].filter(Boolean).join(', ')}`, links: [['govblock_health.cc_hospital_general_information', 'facility_id', h.facility_id]], rank: 22 });
// nonprofits: the 50,000 largest by revenue, and every New York one
for (const n of read('nonprofits')) add({ label: title(n.name), kind: 'nonprofit', qualifier: `Nonprofit, ${[title(n.city), n.state].filter(Boolean).join(', ')}${Number(n.rev) > 0 ? `, revenue ${money(n.rev)}` : ''}`, links: [['govblock_nonprofits.irs_eo_bmf', 'ein', n.ein]], rank: 12 + lg(n.rev) / 2 });
// patent owners: the 20,000 with most patents (organisations only)
for (const a of read('assignees')) add({ label: a.org, kind: 'assignee', qualifier: `Patent owner, ${Number(a.n).toLocaleString('en-US')} patents`, links: [['govblock_patents.pv_g_assignee_disambiguated', 'assignee_id', a.assignee_id]], rank: 15 + lg(a.n) });
// nuclear power reactors
const seenUnit = new Set();
for (const r of read('reactors')) if (!seenUnit.has(r.unit.trim()) && seenUnit.add(r.unit.trim())) add({ label: r.unit.trim(), kind: 'reactor', qualifier: 'Nuclear power reactor', links: [['govblock_reactors.nrc_power_status', 'unit', r.unit]], rank: 30 });

// rows: [label, kind, qualifier, forms, links as [template, value], rank]; the page derives the words it matches from
// the label, forms and qualifier, so no word list is stored. Templates (table, field, served by the query API) are in meta.
const kinds = Object.keys(KINDS);
const TPL = [], TI = new Map();
const tpl = (stored, field, open) => { const k = `${stored}|${field}|${open}`; if (!TI.has(k)) { TI.set(k, TPL.length); TPL.push([stored, field, open]); } return TI.get(k); };
const rowOf = (e) => { const r = [e.label, kinds.indexOf(e.kind), e.qualifier, e.forms?.length ? e.forms : 0, e.links.map(([s, f, v, open]) => [tpl(s, f, open === 0 ? 0 : 1), v]), Math.round(e.rank * 10) / 10]; return r; };
// words that would put an entry in a very large shard and narrow nothing are not shard keys (the entry is still
// found by its other words; a name made only of such words keeps them)
const COMMON = new Set('the of and for inc llc corp co company corporation ltd lp na assn association foundation fund trust services service group holdings international national american united states state county city school district college university hospital center centre committee pac to in on at by de la del los las new north south east west first us usa amp dba zip'.split(' '));
// people keep every name word as a key; an organisation or place keeps its first two distinctive words and its forms
const wordsOf = (e) => {
  const people = KINDS[e.kind][2] === 1;
  const fromLabel = [...new Set(norm(`${e.label} ${people ? e.words || '' : ''}`).split(' ').filter((w) => w.length >= 2))];
  const keep = fromLabel.filter((w) => !COMMON.has(w));
  const label = (keep.length ? keep : fromLabel).slice(0, people ? 99 : 2);
  const forms = norm((e.forms || []).join(' ')).split(' ').filter((w) => w.length >= 2 && !COMMON.has(w)).slice(0, 4);
  return [...new Set([...label, ...forms])];
};
const BIG = 400e3;
const shards = new Map(), split = [];
function place(key, list) {
  const rows = list.map(rowOf);
  if (key.length >= 5 || JSON.stringify(rows).length <= BIG) return void shards.set(key, rows);
  split.push(key);
  const by = new Map();
  for (const e of list) for (const w of wordsOf(e)) if (w.startsWith(key) && w.length > key.length) { const k = w.slice(0, key.length + 1); if (!by.has(k)) by.set(k, new Set()); by.get(k).add(e); }
  const exact = list.filter((e) => wordsOf(e).includes(key));
  if (exact.length) shards.set(key, exact.map(rowOf));
  for (const [k, set] of by) place(k, [...set]);
}
const by2 = new Map();
for (const e of entries) for (const k of new Set(wordsOf(e).map((w) => w.slice(0, 2)))) { if (!by2.has(k)) by2.set(k, []); by2.get(k).push(e); }
for (const [k2, list] of by2) place(k2, list);
shards.set('_current', entries.filter((e) => e.kind === 'congress' && e.rank >= 100).map(rowOf));
const nickJson = Object.fromEntries([...NICK].map(([a, b]) => [a, [...b]]));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let total = 0, largest = ['', 0];
for (const [k, rows] of shards) {
  const s = JSON.stringify(rows);
  fs.writeFileSync(path.join(OUT, `${k}.json`), s);
  total += s.length;
  if (s.length > largest[1]) largest = [k, s.length];
}
const counts = Object.fromEntries(kinds.map((k) => [k, entries.filter((e) => e.kind === k).length]));
fs.writeFileSync(path.join(OUT, '_nicknames.json'), JSON.stringify(nickJson));
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ built: new Date().toISOString(), note: 'Names drawn from the Data Library tables (and the congress-legislators file for members of Congress); each links to the tables it appears in.', split: split.sort(), kinds: kinds.map((k) => ({ kind: k, label: KINDS[k][0], color: KINDS[k][1], people: KINDS[k][2], count: counts[k] })), links: TPL, shards: [...shards.keys()].sort(), sources: [{ name: 'congress-legislators', url: 'https://github.com/unitedstates/congress-legislators', licence: 'CC0 1.0' }, { name: 'nicknames', url: `https://github.com/carltonnorthern/nicknames/tree/${NICK_SHA}`, licence: 'Apache License 2.0' }] }));
console.log(`entries ${entries.length} ${JSON.stringify(counts)}; shards ${shards.size}, total ${(total / 1e6).toFixed(1)} MB, largest ${largest[0]} ${(largest[1] / 1e6).toFixed(2)} MB`);
