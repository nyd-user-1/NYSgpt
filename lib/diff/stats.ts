// A unified diff's files and their counts, read line by line without diffing anything: what a folded diff
// row shows before the diff itself (and CodeMirror with it) is loaded. lib/diff/unified.ts reads the same
// text in full when the diff is opened.

export type DiffFileStat = { path: string; added: number; deleted: number }

export function diffStats(text: string): DiffFileStat[] {
  const files: DiffFileStat[] = []
  let cur: DiffFileStat | null = null
  let inHunk = false
  for (const line of text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n")) {
    const git = /^diff --git a\/(.+?) b\/(.+)$/.exec(line)
    if (git) {
      cur = { path: git[2], added: 0, deleted: 0 }
      files.push(cur)
      inHunk = false
      continue
    }
    if (line.startsWith("@@")) {
      if (!cur) files.push((cur = { path: "", added: 0, deleted: 0 }))
      inHunk = true
      continue
    }
    if (!inHunk) {
      if (line.startsWith("--- ") && (!cur || cur.added || cur.deleted)) files.push((cur = { path: "", added: 0, deleted: 0 }))
      if (line.startsWith("+++ ") && cur) {
        const p = line.slice(4).replace(/\t.*$/, "")
        if (p !== "/dev/null") cur.path = p.replace(/^b\//, "")
      }
      if (line.startsWith("--- ") && cur && !cur.path) {
        const p = line.slice(4).replace(/\t.*$/, "")
        if (p !== "/dev/null") cur.path = p.replace(/^a\//, "")
      }
      continue
    }
    if (line.startsWith("+")) cur!.added += 1
    else if (line.startsWith("-")) cur!.deleted += 1
    else if (!line.startsWith(" ") && !line.startsWith("\\") && line !== "") inHunk = false
  }
  return files
}
