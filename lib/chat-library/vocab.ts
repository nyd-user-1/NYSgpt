import "server-only"

import fs from "node:fs"
import path from "node:path"

// The library's own words for the chat's model (brief 49): every topic in the table finder's index (lib/library-index.json,
// nysgpt-1), A to Z, with its table count and the plain names of its three largest tables, so the model can search
// in the library's terms when the reader's words share none with the catalog. Built once per server process.

type Raw = { p: string; t: number; n: number | null; v?: 1 }

let kept: string | null = null

export function vocabulary(): string {
  if (kept !== null) return kept
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib", "library-index.json"), "utf8")) as { topics: string[]; tables: Raw[] }
    const by = new Map<string, Raw[]>()
    for (const t of j.tables) {
      const k = j.topics[t.t]
      if (!k) continue
      by.set(k, [...(by.get(k) ?? []), t])
    }
    kept = [...by.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([topic, ts]) => {
        const names = [...new Set(ts.filter((t) => !t.v).sort((a, b) => (b.n ?? 0) - (a.n ?? 0)).map((t) => t.p.slice(0, 48)))].slice(0, 3)
        return `- ${topic} (${ts.length}): ${names.join("; ")}`
      })
      .join("\n")
  } catch {
    kept = ""
  }
  return kept
}
