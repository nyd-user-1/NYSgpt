'use client'

import { ArrowUpRight } from 'lucide-react'

import { ProductBody, useSwitchboard } from '@/components/SwitchboardPanel'
import { useProductStatus } from '@/components/ProductStatus'
import { boxSlug } from '@/lib/pane'

const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const

/** A box as a page (/box/<slug>): what the switchboard shows for it, headed by its name and closed by its site. */
export function BoxView({ slug }: { slug: string }) {
  const { cards } = useSwitchboard()
  const { linkProps } = useProductStatus()
  const product = cards.find(c => boxSlug(c.title) === slug)
  if (!product) {
    return (
      <p className="px-5 py-6 text-[13px] text-[var(--paper-muted)]" style={SANS}>
        No box is called {slug}.
      </p>
    )
  }
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <h1 className="border-b border-[var(--paper-rule)] px-5 pb-6 text-[30px] leading-[1.1] text-[var(--paper-text)]" style={{ ...SERIF, letterSpacing: '-0.02em' }}>
        {product.title}
      </h1>
      <ProductBody product={product} />
      {product.href && (
        <a
          {...linkProps(product.href)}
          {...(product.sameTab ? {} : { target: '_blank', rel: 'noreferrer noopener' })}
          className="group flex items-center justify-between border-b border-[var(--paper-rule)] px-5 py-5 text-[15px] text-[var(--paper-text)] transition-colors hover:bg-[var(--paper-quiet)]"
          style={SERIF}
        >
          Visit {product.title}
          <ArrowUpRight className="h-4 w-4" style={{ color: product.accent }} />
        </a>
      )}
    </div>
  )
}
