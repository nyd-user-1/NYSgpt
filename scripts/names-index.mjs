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

const KINDS = { congress: ['Member of Congress', '#1d4ed8'], candidate: ['Federal candidate', '#b42318'] };
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
  add({ id: `congress:${m.id?.bioguide || label}`, label, kind: 'congress', qualifier, forms, links, words, quals, rank: m.current ? 100 : 40 + Number(to === 'present' ? 2026 : to) / 100 });
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

// shards: an entry goes into the shard of the two-letter start of each of its name words; a shard over BIG is split
// by three letters. Nicknames from the list are not indexed: lib/find-names.ts expands the query with them.
// Members in office also go into _current.json, for a query made only of office, state or party words.
const kinds = Object.keys(KINDS);
const BIG = 400e3;
const rowOf = (e) => [e.id, e.label, kinds.indexOf(e.kind), e.qualifier, e.forms, e.links, `${e.words}|${e.quals}`, Math.round(e.rank * 100) / 100];
const wordsOf = (e) => [...new Set(e.words.split(' ').filter((w) => w.length >= 2))];
const shards = new Map(), split = [];
// a prefix key holds every entry with a name word starting with it; over BIG, it is split one letter further (to 5)
function place(key, list) {
  const rows = list.map(rowOf);
  if (key.length >= 5 || JSON.stringify(rows).length <= BIG) return void shards.set(key, rows);
  split.push(key);
  const by = new Map();
  for (const e of list) for (const w of wordsOf(e)) if (w.startsWith(key) && w.length > key.length) { const k = w.slice(0, key.length + 1); if (!by.has(k)) by.set(k, new Set()); by.get(k).add(e); }
  // a word that is exactly the key ("jo") stays in the key's own shard
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
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ built: new Date().toISOString(), split: split.sort(), kinds: kinds.map((k) => ({ kind: k, label: KINDS[k][0], color: KINDS[k][1], count: counts[k] })), shards: [...shards.keys()].sort(), sources: [{ name: 'congress-legislators', url: 'https://github.com/unitedstates/congress-legislators', licence: 'CC0 1.0' }, { name: 'nicknames', url: `https://github.com/carltonnorthern/nicknames/tree/${NICK_SHA}`, licence: 'Apache License 2.0' }, { name: 'govblock_fec.candidates', url: 'the Data Library' }] }));
console.log(`entries ${entries.length} ${JSON.stringify(counts)}; shards ${shards.size}, total ${(total / 1e6).toFixed(1)} MB, largest ${largest[0]} ${(largest[1] / 1e6).toFixed(2)} MB`);
