// Ported from solar (src/lib/childText.ts).
import type { ReactNode } from 'react'

export function childText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(childText).join('')
  if (node && typeof node === 'object' && 'props' in (node as object)) {
    return childText((node as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}
