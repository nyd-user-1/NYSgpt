import { neon } from '@neondatabase/serverless';

// The 44b corpus database (Neon, 2525 LLC org). Only the switchboard's live
// digest reads it; every query is wrapped in lib/digest.ts so this site renders
// even when the database is unreachable. The placeholder keeps `neon()` from
// throwing at module load when DATABASE_URL is unset (local dev, forks).
const url = process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@placeholder/placeholder';

export const sql = neon(url);
