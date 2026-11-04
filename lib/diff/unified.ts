import { marksFor, type Block, type LineDiff, type Mark } from "./line-diff"

// A unified diff (git diff, diff -u) as the files it touches, each in the shape the diff view draws
// (lib/diff/line-diff.ts LineDiff), at the files' own line numbers. A unified diff carries only its hunks:
// the context around each change, not the whole file. So the lines between hunks are a block marked
// with the hunk's own header (`@@ -a,b +c,d @@ …`), which the view prints in place of lines it does not
// have, with nothing to unfold. A deleted line and the added line that replaced it get their changed
// characters marked, as GitHub marks them.

export type DiffFile = {
  /** The path shown: the new one, or the old one for a deletion. */
  path: string
  from: string | null
  to: string | null
  status: "modified" | "added" | "deleted" | "renamed" | "binary"
  added: number
  deleted: number
  diff: LineDiff
}

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/
const strip = (p: string) => (p === "/dev/null" ? null : p.replace(/^[ab]\//, "").replace(/\t.*$/, ""))

type Building = Omit<DiffFile, "diff" | "path"> & { blocks: Block[]; aLines: string[]; bLines: string[]; a: number; b: number; hunks: number }

export function parseUnifiedDiff(text: string): DiffFile[] {
  const files: Building[] = []
  // Typed wide: begin() sets it from inside a closure, where narrowing cannot follow.
  let cur = null as Building | null
  let del: string[] = []
  let add: string[] = []
  let ctx: string[] = []
  let inHunk = false

  const begin = (from: string | null = null, to: string | null = null) => {
    cur = { from, to, status: "modified", added: 0, deleted: 0, blocks: [], aLines: [], bLines: [], a: 0, b: 0, hunks: 0 }
    files.push(cur)
    inHunk = false
  }
  const flushCtx = () => {
    const f = cur
    if (!f || !ctx.length) return
    ctx.forEach((t, i) => {
      f.aLines[f.a + i] = t
      f.bLines[f.b + i] = t
    })
    f.blocks.push({ kind: "equal", a: f.a, b: f.b, count: ctx.length })
    f.a += ctx.length
    f.b += ctx.length
    ctx = []
  }
  const flushChange = () => {
    const f = cur
    if (!f || (!del.length && !add.length)) return
    const delMarks: Mark[][] = del.map(() => [])
    const addMarks: Mark[][] = add.map(() => [])
    if (del.length === add.length)
      for (let i = 0; i < del.length; i++) {
        const [dm, am] = marksFor(del[i], add[i])
        delMarks[i] = dm
        addMarks[i] = am
      }
    del.forEach((t, i) => (f.aLines[f.a + i] = t))
    add.forEach((t, i) => (f.bLines[f.b + i] = t))
    f.blocks.push({ kind: "change", a: f.a, b: f.b, del, add, delMarks, addMarks })
    f.added += add.length
    f.deleted += del.length
    f.a += del.length
    f.b += add.length
    del = []
    add = []
  }
  const flush = () => {
    flushChange()
    flushCtx()
  }

  // The text's own final newline ends its last line; it is not an empty line after it.
  for (const line of text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n")) {
    const git = /^diff --git a\/(.+?) b\/(.+)$/.exec(line)
    if (git) {
      flush()
      begin(git[1], git[2])
      continue
    }
    const hunk = HUNK.exec(line)
    if (hunk) {
      flush()
      if (!cur) begin()
      const f = cur!
      const a0 = Number(hunk[1]) - (hunk[2] === "0" ? 0 : 1)
      const b0 = Number(hunk[3]) - (hunk[4] === "0" ? 0 : 1)
      // The lines before this hunk, which the diff does not carry: the hunk's header stands for them.
      f.blocks.push({ kind: "equal", a: f.a, b: f.b, count: Math.max(0, a0 - f.a), bCount: Math.max(0, b0 - f.b), header: line })
      f.a = Math.max(f.a, a0)
      f.b = Math.max(f.b, b0)
      f.hunks += 1
      inHunk = true
      continue
    }
    if (!inHunk || !cur) {
      // The file header's lines, before the first hunk.
      if (line.startsWith("--- ")) {
        if (!cur || cur.hunks) begin()
        cur!.from = strip(line.slice(4))
      } else if (line.startsWith("+++ ") && cur) cur.to = strip(line.slice(4))
      else if (cur && line.startsWith("new file mode")) cur.status = "added"
      else if (cur && line.startsWith("deleted file mode")) cur.status = "deleted"
      else if (cur && line.startsWith("rename from ")) cur.status = "renamed"
      else if (cur && /^Binary files .* differ$/.test(line)) cur.status = "binary"
      continue
    }
    if (line.startsWith("\\")) continue // "\ No newline at end of file"
    if (line.startsWith("-")) {
      if (add.length) flushChange()
      flushCtx()
      del.push(line.slice(1))
    } else if (line.startsWith("+")) {
      flushCtx()
      add.push(line.slice(1))
    } else if (line.startsWith(" ") || line === "") {
      flushChange()
      ctx.push(line.slice(1))
    } else {
      // Anything else ends the hunk: the next file's header, or trailing text.
      flush()
      inHunk = false
      if (line.startsWith("--- ")) {
        begin()
        cur!.from = strip(line.slice(4))
      }
    }
  }
  flush()

  return files
    .filter((f) => f.hunks || f.status === "binary" || f.from || f.to)
    .map(({ blocks, aLines, bLines, a: _a, b: _b, hunks: _h, ...f }) => {
      if (f.status === "modified" && f.from === null && f.to) f.status = "added"
      if (f.status === "modified" && f.to === null && f.from) f.status = "deleted"
      if (f.status === "modified" && f.from && f.to && f.from !== f.to) f.status = "renamed"
      return { ...f, path: f.to ?? f.from ?? "", diff: { blocks, added: f.added, deleted: f.deleted, aLines, bLines } }
    })
}

/** The accordion's label: one file's path, or how many files, with the lines added and deleted. */
export function diffSummary(files: DiffFile[]): string {
  const added = files.reduce((n, f) => n + f.added, 0)
  const deleted = files.reduce((n, f) => n + f.deleted, 0)
  const what = files.length === 1 ? files[0].path : `${files.length} files`
  return `${what} · +${added} −${deleted}`
}
