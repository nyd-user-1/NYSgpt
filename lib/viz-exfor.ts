// The EXFOR measurements' data (/viz/scatter3d-dataset, 2026-11-04, chart batch B): public/viz-data/exfor.json,
// written by scripts/viz-exfor-snapshot.mjs — a seeded sample of 50,000 measured cross sections from the EXFOR
// library's data tables (IAEA-NDS/exfor_json).

export type Exfor = {
  source: string
  commit: string
  /** Every eligible data point in the library; the rows are a sample of them. */
  candidates: number
  projectiles: string[]
  entries: string[]
  /** [log10 E (eV), log10 σ (b), year, Z, A, projectile index, entry index] */
  rows: [number, number, number, number, number, number, number][]
}

let cached: Promise<Exfor> | null = null
export function loadExfor(): Promise<Exfor> {
  if (!cached) {
    const p = fetch('/viz-data/exfor.json').then((r) => {
      if (!r.ok) throw new Error(`/viz-data/exfor.json: ${r.status}`)
      return r.json() as Promise<Exfor>
    })
    p.catch(() => {
      cached = null
    })
    cached = p
  }
  return cached
}

/** Projectiles as the chart groups them: the light ones by name, every heavier ion together. */
export const PROJECTILE_GROUPS = ['n', 'p', 'd', 't', '³He', 'α', 'γ', 'Heavy ion', 'Other'] as const
export type ProjectileGroup = (typeof PROJECTILE_GROUPS)[number]
const GROUP: Record<string, ProjectileGroup> = { N: 'n', P: 'p', D: 'd', T: 't', HE3: '³He', A: 'α', G: 'γ' }
export const projectileGroup = (code: string): ProjectileGroup => GROUP[code] ?? (/^\d+-[A-Z]+-\d+$/.test(code) ? 'Heavy ion' : 'Other')

const ELEMENTS = ['n', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr']
/** "²³⁵U"; a natural element (A = 0) is "natU". */
export function targetName(z: number, a: number) {
  const el = ELEMENTS[z] ?? `Z=${z}`
  return a === 0 ? `nat${el}` : `${String(a).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])}${el}`
}

/** "2.53E-2 eV" style energies and "1.2E+3 b" cross sections from their logs. */
export const fromLog = (x: number, unit: string) => `${(10 ** x).toPrecision(3).replace('e+', 'E+').replace('e-', 'E-')} ${unit}`
