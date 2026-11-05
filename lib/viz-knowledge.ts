// The knowledge map's data (/viz/knowledge, prototype C, 2026-11-04): public/viz-data/knowledge.json, written by
// scripts/viz-knowledge-snapshot.mjs — per nuclide, the NSR papers, EXFOR entries, adopted levels, XUNDL sets and
// the ENSDF evaluation's cutoff year.

export type KnowledgeRow = {
  z: number
  n: number
  papers: number
  levels: number
  cards: number
  exfor: number
  xundl: number
  /** The ENSDF evaluation's literature cutoff year; 0 when never evaluated. */
  cutoff: number
  evaluated: boolean
}

type Raw = { source: string; columns: string[]; rows: number[][] }

let cached: Promise<KnowledgeRow[]> | null = null
export function loadKnowledge(): Promise<KnowledgeRow[]> {
  if (!cached) {
    const p = fetch('/viz-data/knowledge.json')
      .then((r) => {
        if (!r.ok) throw new Error(`/viz-data/knowledge.json: ${r.status}`)
        return r.json() as Promise<Raw>
      })
      .then(({ columns, rows }) => {
        const c = (name: string) => columns.indexOf(name)
        const [z, n, papers, levels, cards, exfor, xundl, cutoff, ev] = ['z', 'n', 'papers', 'levels', 'cards', 'exfor', 'xundl', 'cutoff', 'eval'].map(c)
        return rows.map((r) => ({
          z: r[z], n: r[n], papers: r[papers], levels: r[levels], cards: r[cards], exfor: r[exfor], xundl: r[xundl], cutoff: r[cutoff], evaluated: r[ev] === 1,
        }))
      })
    p.catch(() => {
      cached = null
    })
    cached = p
  }
  return cached
}

const ELEMENTS = ['n', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og', 'Uue', 'Ubn']
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }

/** "⁶⁰Co"; Z past the table reads "Z=121". */
export function knowledgeName(r: { z: number; n: number }) {
  if (r.z === 0 && r.n === 1) return 'n'
  const el = ELEMENTS[r.z] ?? `Z=${r.z}`
  return `${String(r.z + r.n).replace(/\d/g, (d) => SUP[d])}${el}`
}

/** Years since the evaluation's cutoff, from the snapshot's year. */
export const SNAPSHOT_YEAR = 2026
export const AGE_MAX = 30

/** The age scale: recent teal → amber → old rust, per theme. */
export const AGE_STOPS = {
  light: ['#0f9d8f', '#d99a00', '#c2410c'],
  dark: ['#2dd4bf', '#fbbf24', '#fb6b4a'],
}
export const NEVER = { light: '#8a8a8a', dark: '#8f8a80' }
