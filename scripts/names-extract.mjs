// scripts/names-extract.mjs (brief 55, nysgpt-1): runs one Athena query (workgroup query-api, name columns only) and
// saves its CSV result under ~/Downloads/NYSgpt-catalog-2026-11-12/names-extracts/<name>.csv, so nothing is queried twice. Keeps a byte ledger.
// Run: node scripts/names-extract.mjs <name> "<SQL>"   (skips if the extract exists; FORCE=1 to redo)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = process.env.NAMES_EXTRACTS || path.join(process.env.HOME, 'Downloads/NYSgpt-catalog-2026-11-12/names-extracts'); // outside the repo: extracts can be large
fs.mkdirSync(DIR, { recursive: true });
const [name, sql] = process.argv.slice(2);
const out = path.join(DIR, `${name}.csv`);
if (fs.existsSync(out) && !process.env.FORCE) { console.log(`${name}: kept (${(fs.statSync(out).size / 1e6).toFixed(2)} MB)`); process.exit(0); }
const aws = (args) => JSON.parse(execFileSync('aws', [...args, '--region', 'us-east-1', '--output', 'json'], { encoding: 'utf8', maxBuffer: 64e6, env: (({ AWS_PROFILE, ...e }) => e)(process.env) }));
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const qid = aws(['athena', 'start-query-execution', '--work-group', 'query-api', '--query-string', sql]).QueryExecutionId;
let e;
for (let i = 0; i < 400; i++) { sleep(i < 5 ? 1500 : 3000); e = aws(['athena', 'get-query-execution', '--query-execution-id', qid]).QueryExecution; if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(e.Status.State)) break; }
if (e.Status.State !== 'SUCCEEDED') { console.error(`${name}: ${e.Status.State} ${e.Status.StateChangeReason || ''}`); process.exit(1); }
execFileSync('aws', ['s3', 'cp', e.ResultConfiguration.OutputLocation, out, '--only-show-errors', '--region', 'us-east-1'], { env: (({ AWS_PROFILE, ...x }) => x)(process.env) });
const bytes = e.Statistics.DataScannedInBytes || 0;
const ledger = path.join(DIR, 'ledger.json');
const L = fs.existsSync(ledger) ? JSON.parse(fs.readFileSync(ledger, 'utf8')) : { queries: [], billedBytes: 0 };
const billed = Math.max(bytes, 10e6);
L.queries.push({ name, at: new Date().toISOString(), scannedBytes: bytes, billedBytes: billed, sql });
L.billedBytes += billed;
fs.writeFileSync(ledger, JSON.stringify(L, null, 1));
console.log(`${name}: ${(fs.statSync(out).size / 1e6).toFixed(2)} MB, scanned ${(bytes / 1e6).toFixed(1)} MB; total billed ${(L.billedBytes / 1e9).toFixed(3)} GB = $${(L.billedBytes / 1e12 * 5).toFixed(4)}`);
